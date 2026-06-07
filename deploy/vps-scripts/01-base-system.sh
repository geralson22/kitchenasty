#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/01-base-system.log"

mkdir -p "$SCRIPT_DIR/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

retry() {
    local max_attempts=$1
    local delay=$2
    shift 2
    local attempt=1
    while [[ $attempt -le $max_attempts ]]; do
        if "$@"; then
            return 0
        fi
        log "Attempt $attempt/$max_attempts failed. Retrying in ${delay}s..."
        sleep "$delay"
        attempt=$((attempt + 1))
        delay=$((delay * 2))
    done
    log "Command failed after $max_attempts attempts: $*"
    return 1
}

wait_for_apt() {
    log "Waiting for apt lock..."
    local max_wait=120
    local waited=0
    while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || \
          fuser /var/lib/apt/lists/lock >/dev/null 2>&1; do
        sleep 5
        waited=$((waited + 5))
        if [[ $waited -ge $max_wait ]]; then
            log "Timeout waiting for apt lock"
            return 1
        fi
    done
    return 0
}

create_deploy_user() {
    local username="kitchenasty"
    if id "$username" &>/dev/null; then
        log "User $username already exists"
        return 0
    fi

    log "Creating user $username..."
    retry 3 5 -- apt install -y sudo
    useradd -m -s /bin/bash "$username"
    usermod -aG sudo "$username"
    mkdir -p "/home/$username/.ssh"
    chmod 700 "/home/$username/.ssh"
    log "User $username created. Add SSH keys to /home/$username/.ssh/authorized_keys"
}

install_docker() {
    if command -v docker &>/dev/null; then
        log "Docker already installed: $(docker --version)"
        return 0
    fi

    log "Installing Docker..."
    wait_for_apt

    retry 3 5 -- apt install -y ca-certificates curl

    local keyrings_dir="/etc/apt/keyrings"
    sudo install -m 0755 -d "$keyrings_dir"
    retry 3 5 -- curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o "$keyrings_dir/docker.asc"
    sudo chmod a+r "$keyrings_dir/docker.asc"

    echo "deb [arch=$(dpkg --print-architecture) signed-by=$keyrings_dir/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    wait_for_apt
    retry 3 5 -- apt update
    retry 3 5 -- apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    log "Docker installed: $(docker --version)"
}

configure_firewall() {
    log "Configuring UFW firewall..."

    retry 3 5 -- apt install -y ufw

    sudo ufw allow OpenSSH
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp

    echo "y" | sudo ufw enable || true

    sudo ufw status | tee -a "$LOG_FILE"
}

install_unattended_upgrades() {
    log "Installing unattended upgrades..."
    retry 3 5 -- apt install -y unattended-upgrades
    echo unattended-upgrades unattended-upgrades/enable_auto_updates boolean true | sudo debconf-set-selections
    sudo dpkg-reconfigure -plow unattended-upgrades
}

main() {
    log "Starting base system setup..."

    create_deploy_user
    install_docker
    configure_firewall
    install_unattended_upgrades

    log "Base system setup complete!"
    log "Next: Run 02-clone-repo.sh"
}

main "$@"
