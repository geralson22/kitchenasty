#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/02-clone-repo.log"

mkdir -p "$SCRIPT_DIR/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

load_env() {
    if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
        log "Error: .env file not found. Copy .env.template to .env and configure it."
        exit 1
    fi
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
}

generate_ssh_key() {
    local key_path="$HOME/.ssh/kitchenasty_ed25519"

    if [[ -f "$key_path" ]]; then
        log "SSH key already exists at $key_path"
    else
        log "Generating SSH key pair..."
        ssh-keygen -t ed25519 -C "kitchenasty-deploy" -f "$key_path" -N ""
        chmod 600 "$key_path"
        chmod 600 "${key_path}.pub"
        log "SSH key generated at $key_path"
    fi

    echo ""
    echo "============================================"
    echo "ADD THIS PUBLIC KEY TO GITHUB:"
    echo "============================================"
    cat "${key_path}.pub"
    echo "============================================"
    echo ""

    read -p "Press Enter after you have added the public key to GitHub..."
}

clone_or_update_repo() {
    local repo_url="${GIT_REPO_URL:-}"
    local deploy_dir="/home/kitchenasty/kitchenasty"

    if [[ -z "$repo_url" ]]; then
        echo -n "Enter your GitHub repository URL (e.g., git@github.com:user/kitchenasty.git): "
        read -r repo_url
    fi

    if [[ -d "$deploy_dir/.git" ]]; then
        log "Repository already exists. Pulling latest changes..."
        cd "$deploy_dir"
        git pull
    else
        log "Cloning repository to $deploy_dir..."
        git clone "$repo_url" "$deploy_dir"
        chmod -R kitchenasty:kitchenasty "$deploy_dir"
    fi
}

setup_env_file() {
    local env_file="$SCRIPT_DIR/.env"
    local template_file="$SCRIPT_DIR/.env.template"

    if [[ -f "$env_file" ]]; then
        log ".env file already exists"
        return 0
    fi

    if [[ ! -f "$template_file" ]]; then
        log "Error: .env.template not found"
        exit 1
    fi

    log "Creating .env from template..."
    cp "$template_file" "$env_file"

    echo -n "Enter database password (min 20 chars): "
    read -r DB_PASSWORD
    sed -i "s/POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD_HERE/POSTGRES_PASSWORD=$DB_PASSWORD/" "$env_file"

    local JWT_SECRET
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/JWT_SECRET=YOUR_JWT_SECRET_HERE/JWT_SECRET=$JWT_SECRET/" "$env_file"

    echo -n "Enter admin domain (e.g., admin.yourdomain.com): "
    read -r ADMIN_DOMAIN
    sed -i "s/ADMIN_DOMAIN=admin.yourdomain.com/ADMIN_DOMAIN=$ADMIN_DOMAIN/" "$env_file"

    echo -n "Enter storefront domain (e.g., order.yourdomain.com): "
    read -r STOREFRONT_DOMAIN
    sed -i "s/STOREFRONT_DOMAIN=order.yourdomain.com/STOREFRONT_DOMAIN=$STOREFRONT_DOMAIN/" "$env_file"

    echo -n "Enter API domain (e.g., api.yourdomain.com): "
    read -r API_DOMAIN
    sed -i "s/API_DOMAIN=api.yourdomain.com/API_DOMAIN=$API_DOMAIN/" "$env_file"

    sed -i "s|CORS_ORIGINS=https://admin.yourdomain.com,https://order.yourdomain.com|CORS_ORIGINS=https://$ADMIN_DOMAIN,https://$STOREFRONT_DOMAIN|" "$env_file"

    log ".env file created at $env_file"
}

main() {
    log "Starting repository setup..."

    generate_ssh_key
    clone_or_update_repo
    setup_env_file

    log "Repository setup complete!"
    log "Next: Run 03-docker-compose.sh"
}

main "$@"
