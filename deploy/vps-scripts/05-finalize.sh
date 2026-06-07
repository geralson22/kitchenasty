#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/05-finalize.log"

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

wait_for_postgres() {
    log "Waiting for PostgreSQL to be ready..."
    local max_wait=60
    local waited=0

    while ! docker compose -f /home/kitchenasty/kitchenasty/docker-compose.prod.yml exec -T postgres pg_isready -U "${POSTGRES_USER:-kitchenasty}" &>/dev/null; do
        sleep 5
        waited=$((waited + 5))
        if [[ $waited -ge $max_wait ]]; then
            log "Timeout waiting for PostgreSQL"
            return 1
        fi
        log "Still waiting... ${waited}s elapsed"
    done

    log "PostgreSQL is ready"
    return 0
}

run_migrations() {
    local deploy_dir="/home/kitchenasty/kitchenasty"

    log "Running database migrations..."
    if docker compose -f "$deploy_dir/docker-compose.prod.yml" exec -T server \
        npx prisma migrate deploy --schema ../../prisma/schema.prisma; then
        log "Migrations applied successfully"
    else
        log "Migration failed"
        return 1
    fi
}

run_seed() {
    local deploy_dir="/home/kitchenasty/kitchenasty"

    log "Seeding database..."
    if docker compose -f "$deploy_dir/docker-compose.prod.yml" exec -T server \
        npx tsx ../../prisma/seed.ts; then
        log "Database seeded successfully"
    else
        log "Seeding failed"
        return 1
    fi
}

health_check() {
    local max_wait=60
    local waited=0

    log "Running health check..."

    while ! docker compose -f /home/kitchenasty/kitchenasty/docker-compose.prod.yml exec -T server \
        wget -qO- http://localhost:3000/api/health &>/dev/null; do
        sleep 5
        waited=$((waited + 5))
        if [[ $waited -ge $max_wait ]]; then
            log "Health check timeout"
            return 1
        fi
        log "Still waiting for API... ${waited}s elapsed"
    done

    local response
    response=$(docker compose -f /home/kitchenasty/kitchenasty/docker-compose.prod.yml exec -T server \
        wget -qO- http://localhost:3000/api/health)

    log "API Health: $response"

    if [[ "$response" == *"ok"* ]]; then
        log "Health check passed"
        return 0
    else
        log "Health check failed: unexpected response"
        return 1
    fi
}

main() {
    log "Starting finalization..."

    wait_for_postgres
    run_migrations
    run_seed
    health_check

    log ""
    log "============================================"
    log "DEPLOYMENT COMPLETE!"
    log "============================================"
    log ""
    log "Admin UI:      https://$ADMIN_DOMAIN"
    log "Storefront:    https://$STOREFRONT_DOMAIN"
    log "API:           https://$API_DOMAIN/api/health"
    log ""
    log "Default credentials:"
    log "Admin:    admin@kitchenasty.com / admin123"
    log "Customer: customer@example.com / customer123"
    log ""
    log "⚠️  Change default passwords immediately!"
    log ""
}

main "$@"
