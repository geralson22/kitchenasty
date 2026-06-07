#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_menu() {
    clear
    echo "============================================"
    echo "  KitchenAsty VPS Deployment"
    echo "============================================"
    echo ""
    echo "1) Base System Setup (Docker, Firewall)"
    echo "2) Clone Repository & SSH Key Gen"
    echo "3) Docker Compose Setup"
    echo "4) Reverse Proxy (Caddy) Setup"
    echo "5) Finalize (Migrations, Seed, Verify)"
    echo "6) Run All Steps (1-5)"
    echo "0) Exit"
    echo ""
    echo "============================================"
}

main() {
    while true; do
        show_menu
        echo -n "Select option: "
        read -r choice

        case $choice in
            1)
                bash "$SCRIPT_DIR/01-base-system.sh"
                read -p "Press Enter to continue..."
                ;;
            2)
                bash "$SCRIPT_DIR/02-clone-repo.sh"
                read -p "Press Enter to continue..."
                ;;
            3)
                bash "$SCRIPT_DIR/03-docker-compose.sh"
                read -p "Press Enter to continue..."
                ;;
            4)
                bash "$SCRIPT_DIR/04-reverse-proxy.sh"
                read -p "Press Enter to continue..."
                ;;
            5)
                bash "$SCRIPT_DIR/05-finalize.sh"
                read -p "Press Enter to continue..."
                ;;
            6)
                bash "$SCRIPT_DIR/01-base-system.sh"
                bash "$SCRIPT_DIR/02-clone-repo.sh"
                bash "$SCRIPT_DIR/03-docker-compose.sh"
                bash "$SCRIPT_DIR/04-reverse-proxy.sh"
                bash "$SCRIPT_DIR/05-finalize.sh"
                read -p "Press Enter to continue..."
                ;;
            0)
                echo "Exiting..."
                exit 0
                ;;
            *)
                echo "Invalid option"
                sleep 1
                ;;
        esac
    done
}

main "$@"
