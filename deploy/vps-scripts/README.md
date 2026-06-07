# KitchenAsty VPS Deployment Scripts

Modular shell scripts for deploying KitchenAsty to a fresh VPS.

## Prerequisites

- A fresh Ubuntu 24.04 LTS server
- SSH access to the server
- A GitHub repository with your KitchenAsty fork

## Quick Start

1. SSH into your server as root
2. Create a deploy user (or use an existing sudo user)
3. Upload or clone this `deploy` folder to the server
4. Run the main menu:

```bash
cd /path/to/deploy
chmod +x setup-vps.sh
./setup-vps.sh
```

## Scripts Overview

| Script | Purpose |
|--------|---------|
| `setup-vps.sh` | Main menu to run scripts interactively |
| `01-base-system.sh` | Create deploy user, install Docker, configure firewall, unattended upgrades |
| `02-clone-repo.sh` | Generate SSH key, clone repository, create `.env` from template |
| `03-docker-compose.sh` | Generate `docker-compose.prod.yml`, build Docker images |
| `04-reverse-proxy.sh` | Install and configure Caddy with SSL |
| `05-finalize.sh` | Run migrations, seed database, verify deployment |

## Workflow

1. **Run `01-base-system.sh`** - Sets up the base system (can be run once)
2. **Run `02-clone-repo.sh`** - Will prompt for:
   - GitHub repo URL
   - Domain names
   - Database password (auto-generates JWT secret)
3. **Run `03-docker-compose.sh`** - Builds all Docker images
4. **Run `04-reverse-proxy.sh`** - Installs Caddy, prompts for DNS configuration
5. **Run `05-finalize.sh`** - Migrates DB, seeds data, verifies

## Configuration

All configuration is managed via the `.env` file. Copy `.env.template` to `.env`:

```bash
cp .env.template .env
# Edit .env with your values
```

### Required Variables

- `ADMIN_DOMAIN` - Admin panel domain (e.g., admin.yourdomain.com)
- `STOREFRONT_DOMAIN` - Storefront domain (e.g., order.yourdomain.com)
- `API_DOMAIN` - API domain (e.g., api.yourdomain.com)
- `POSTGRES_PASSWORD` - Database password (min 20 characters)
- `JWT_SECRET` - Authentication secret (auto-generated if empty)

### Optional Variables

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe payments
- `SMTP_*` - Email configuration
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` - Facebook OAuth

## DNS Setup

After running `04-reverse-proxy.sh`, add DNS A records pointing to your server:

```
Type    Name                  Value
A       admin.yourdomain.com  YOUR_SERVER_IP
A       order.yourdomain.com  YOUR_SERVER_IP
A       api.yourdomain.com     YOUR_SERVER_IP
```

## Default Credentials

After deployment, log in with:

- **Admin:** admin@kitchenasty.com / admin123
- **Customer:** customer@example.com / customer123

**⚠️ Change default passwords immediately!**

## Logs

Script logs are stored in `logs/` directory:

```
logs/
├── 01-base-system.log
├── 02-clone-repo.log
├── 03-docker-compose.log
├── 04-reverse-proxy.log
└── 05-finalize.log
```

## Troubleshooting

### Docker not found
Log out and back in after running `01-base-system.sh` for group changes to take effect.

### DNS not resolving
Wait up to 48 hours for propagation. Use `dig yourdomain.com` to check.

### Caddy certificate errors
Ensure ports 80 and 443 are open in your firewall and DNS points to the correct IP.

### Database connection failed
Wait a few seconds for PostgreSQL to initialize, then re-run `05-finalize.sh`.

## Undoing

To stop all services:

```bash
cd /home/kitchenasty/kitchenasty
docker compose -f docker-compose.prod.yml down
```

To remove everything:

```bash
docker compose -f docker-compose.prod.yml down -v
rm -rf /home/kitchenasty/kitchenasty
```
