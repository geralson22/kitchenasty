#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/03-docker-compose.log"

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

generate_docker_compose() {
    load_env

    local compose_file="/home/kitchenasty/kitchenasty/docker-compose.prod.yml"
    local template_file="$SCRIPT_DIR/docker-compose.prod.yml.template"

    if [[ ! -f "$template_file" ]]; then
        log "Error: docker-compose.prod.yml.template not found"
        exit 1
    fi

    log "Generating docker-compose.prod.yml..."
    cp "$template_file" "$compose_file"

    chmod 644 "$compose_file"
    chown kitchenasty:kitchenasty "$compose_file"

    log "docker-compose.prod.yml created at $compose_file"
}

build_images() {
    local deploy_dir="/home/kitchenasty/kitchenasty"
    cd "$deploy_dir"

    log "Building Docker images (this may take several minutes)..."

    local max_attempts=3
    local attempt=1
    local delay=30

    while [[ $attempt -le $max_attempts ]]; do
        log "Build attempt $attempt/$max_attempts..."
        if docker compose -f docker-compose.prod.yml build --parallel; then
            log "Images built successfully"
            return 0
        fi
        log "Build attempt $attempt failed. Retrying in ${delay}s..."
        sleep "$delay"
        attempt=$((attempt + 1))
        delay=$((delay * 2))
    done

    log "Build failed after $max_attempts attempts"
    return 1
}

main() {
    log "Starting Docker Compose setup..."

    generate_docker_compose
    build_images

    log "Docker Compose setup complete!"
    log "Next: Run 04-reverse-proxy.sh"
}

main "$@"
