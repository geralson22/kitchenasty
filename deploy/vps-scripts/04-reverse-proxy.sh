#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/04-reverse-proxy.log"

mkdir -p "$SCRIPT_DIR/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

load_env() {
    if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
        log "Error: .env file not found"
        exit 1
    fi
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
}

install_caddy() {
    if command -v caddy &>/dev/null; then
        log "Caddy already installed: $(caddy version)"
        return 0
    fi

    log "Installing Caddy..."

    local max_attempts=3
    local attempt=1
    local delay=5

    while [[ $attempt -le $max_attempts ]]; do
        if apt install -y caddy 2>/dev/null; then
            log "Caddy installed: $(caddy version)"
            return 0
        fi

        log "Attempt $attempt failed. Trying alternative install..."
        sleep "$delay"

        curl -1sLf 'https://dl.cloudflare.com/caddy/stable/gpg.key' 2>/dev/null | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg || true
        echo "deb [trusted=yes] https://apt.fury.io/caddy/ * *" | tee /etc/apt/sources.list.d/caddy-fury.list 2>/dev/null || true
        apt update 2>/dev/null
        if apt install -y caddy 2>/dev/null; then
            log "Caddy installed via alternative method: $(caddy version)"
            return 0
        fi

        attempt=$((attempt + 1))
        delay=$((delay * 2))
    done

    log "Warning: Could not install Caddy via apt. You may need to install manually from caddyserver.com"
    return 1
}

configure_caddy() {
    load_env

    local caddyfile="/etc/caddy/Caddyfile"
    local template_file="$SCRIPT_DIR/caddy/Caddyfile.template"

    if [[ ! -f "$template_file" ]]; then
        log "Error: Caddyfile.template not found"
        exit 1
    fi

    log "Configuring Caddy..."

    export ADMIN_DOMAIN STOREFRONT_DOMAIN API_DOMAIN

    envsubst < "$template_file" | sudo tee "$caddyfile" > /dev/null

    sudo chmod 644 "$caddyfile"

    log "Caddyfile configured"
}

verify_dns() {
    load_env

    local server_ip
    server_ip=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

    echo ""
    echo "============================================"
    echo "DNS CONFIGURATION REQUIRED"
    echo "============================================"
    echo "Please add the following DNS records:"
    echo ""
    echo "Type    Name              Value"
    echo "A       $ADMIN_DOMAIN     $server_ip"
    echo "A       $STOREFRONT_DOMAIN $server_ip"
    echo "A       $API_DOMAIN       $server_ip"
    echo ""
    echo "Wait for DNS propagation (can take up to 48 hours)"
    echo ""

    read -p "Press Enter after DNS records have been configured..."
}

restart_caddy() {
    log "Restarting Caddy..."

    sudo systemctl enable caddy
    sudo systemctl restart caddy

    sleep 5

    if sudo systemctl is-active --quiet caddy; then
        log "Caddy is running"
        sudo systemctl status caddy --no-pager | tee -a "$LOG_FILE"
    else
        log "Caddy failed to start. Check logs with: sudo journalctl -u caddy -n 50"
        return 1
    fi
}

main() {
    log "Starting reverse proxy setup..."

    install_caddy
    verify_dns
    configure_caddy
    restart_caddy

    log "Reverse proxy setup complete!"
    log "Next: Run 05-finalize.sh"
}

main "$@"
