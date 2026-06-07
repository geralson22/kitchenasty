🖥️ Server Setup
This page walks you through setting up a fresh Linux server for KitchenAsty. We'll use Ubuntu 24.04 LTS, but any modern Debian-based distribution works similarly.

1️⃣ Step 1: Create a Server
Sign up with your chosen hosting provider (see Overview for options) and create a new server with these settings:

🐧 OS: Ubuntu 24.04 LTS
💾 Plan: 2 GB RAM / 1 vCPU minimum (4 GB / 2 vCPU recommended)
🌍 Region: Choose the region closest to your restaurant's customers
🔑 Authentication: SSH key (preferred) or password
After creation, note the server's public IP address (e.g., 203.0.113.50). You'll need it throughout this guide.

2️⃣ Step 2: Connect to Your Server
Open a terminal on your local computer and connect via SSH:


ssh root@203.0.113.50
Replace 203.0.113.50 with your server's actual IP address.

🪟 For Windows Users

Use Windows Terminal (built into Windows 11) or download PuTTY. Windows Terminal supports SSH natively — just open it and type the ssh command above.

3️⃣ Step 3: Create a Non-Root User
Running everything as root is a security risk. Create a dedicated user:


# Create user
adduser kitchenasty

# Give sudo privileges
usermod -aG sudo kitchenasty

# If you used an SSH key, copy it to the new user
mkdir -p /home/kitchenasty/.ssh
cp ~/.ssh/authorized_keys /home/kitchenasty/.ssh/
chown -R kitchenasty:kitchenasty /home/kitchenasty/.ssh
chmod 700 /home/kitchenasty/.ssh
chmod 600 /home/kitchenasty/.ssh/authorized_keys
Log out and reconnect as the new user:


exit
ssh kitchenasty@203.0.113.50
4️⃣ Step 4: Update the System

sudo apt update && sudo apt upgrade -y
5️⃣ Step 5: Install Docker
Docker lets you run KitchenAsty without installing Node.js, PostgreSQL, or any other dependencies directly on the server.


# Install Docker's official GPG key and repository
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to the docker group (avoids needing sudo for docker commands)
sudo usermod -aG docker kitchenasty
Log out and log back in for the group change to take effect:


exit
ssh kitchenasty@203.0.113.50
Verify Docker is working:


docker --version
# Docker version 27.x.x

docker compose version
# Docker Compose version v2.x.x
6️⃣ Step 6: Configure the Firewall
Ubuntu comes with ufw (Uncomplicated Firewall). Enable it and allow only the ports you need:


# Allow SSH (so you don't lock yourself out!)
sudo ufw allow OpenSSH

# Allow HTTP and HTTPS (for web traffic)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable the firewall
sudo ufw enable

# Verify the rules
sudo ufw status
Expected output:


Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
⚠️ Important

Do not expose ports 3000, 5173, 5174, or 5432 to the internet. The reverse proxy (Caddy or Nginx) will handle routing on ports 80/443. Direct access to the application ports is unnecessary and a security risk.

7️⃣ Step 7: Set Up Automatic Security Updates

sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
Select Yes when prompted. This keeps your server patched against known security vulnerabilities automatically.




🐳 Docker Compose Production
This page explains how to configure and run KitchenAsty in production using Docker Compose.

1️⃣ Step 1: Clone the Repository

cd /home/kitchenasty
git clone https://github.com/kitchenasty/kitchenasty.git
cd kitchenasty
2️⃣ Step 2: Create the Environment File
Create a .env file in the project root. Docker Compose will automatically read variables from it.


nano .env
Paste the following, replacing the placeholder values:


# ── 🗄️ Database ──────────────────────────────────────────
# Use a strong, random password (at least 20 characters)
DB_PASSWORD=CHANGE_ME_to_a_random_password_here

# ── 🔐 Authentication ────────────────────────────────────
# Generate with: openssl rand -base64 32
JWT_SECRET=CHANGE_ME_to_a_random_secret_here

# ── 🌐 Domains ───────────────────────────────────────────
# Replace with your actual domain names
ADMIN_DOMAIN=admin.yourdomain.com
STOREFRONT_DOMAIN=order.yourdomain.com
API_DOMAIN=api.yourdomain.com

# ── 🔗 CORS ──────────────────────────────────────────────
CORS_ORIGINS=https://admin.yourdomain.comourdomain.com


Run this command on your server to generate a strong random string:


openssl rand -base64 32
Use the output for DB_PASSWORD and JWT_SECRET. Never reuse the same secret for both.

3️⃣ Step 3: Create the Production Compose File
Create docker-compose.prod.yml:


nano docker-compose.prod.yml
Paste the following:


services:
  postgres:
    image: postgres:16-alpine
    container_name: kitchenasty-db
    environment:
      POSTGRES_USER: kitchenasty
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: kitchenasty
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kitchenasty"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    # Do NOT expose port 5432 — only internal Docker network access

  server:
    build:
      context: .
      dockerfile: packages/server/Dockerfile
    container_name: kitchenasty-server
    environment:
      PORT: 3000
      NODE_ENV: production
      DATABASE_URL: postgresql://kitchenasty:${DB_PASSWORD}@postgres:5432/kitchenasty
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 7d
      CORS_ORIGINS: ${CORS_ORIGINS}
      BASE_URL: https://${API_DOMAIN}
      STOREFRONT_URL: https://${STOREFRONT_DOMAIN}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      EMAIL_FROM: ${EMAIL_FROM}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      FACEBOOK_APP_ID: ${FACEBOOK_APP_ID}
      FACEBOOK_APP_SECRET: ${FACEBOOK_APP_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - uploads:/app/uploads
    restart: unless-stopped

  admin:
    build:
      context: .
      dockerfile: packages/admin/Dockerfile
    container_name: kitchenasty-admin
    depends_on:
      - server
    restart: unless-stopped

  storefront:
    build:
      context: .
      dockerfile: packages/storefront/Dockerfile
    container_name: kitchenasty-storefront
    depends_on:
      - server
    restart: unless-stopped

volumes:
  pgdata:
  uploads:

networks:
  default:
    name: kitchenasty
🔒 Security

Notice that no service exposes ports to the host. The reverse proxy (set up in the next step) connects to the Docker network directly. This means the database, API, and frontends are not directly accessible from the internet.

4️⃣ Step 4: Build and Start

docker compose -f docker-compose.prod.yml up --build -d
The -d flag runs containers in the background (detached mode).

Check that all containers are running:


docker compose -f docker-compose.prod.yml ps
Expected output:


NAME                    STATUS              PORTS
kitchenasty-db          running (healthy)
kitchenasty-server      running
kitchenasty-admin       running
kitchenasty-storefront  running
5️⃣ Step 5: Run Database Migrations and Seed

# Apply database migrations
docker compose -f docker-compose.prod.yml exec server \
  npx prisma migrate deploy --schema ../../prisma/schema.prisma

# Seed initial data (admin user, sample menu)
docker compose -f docker-compose.prod.yml exec server \
  npx tsx ../../prisma/seed.ts
After seeding, you can log in with:

👨‍💼 Admin: admin@kitchenasty.com / admin123
👤 Customer: customer@example.com / customer123
🚨 Change Default Passwords

After first login, immediately change the default admin password through the admin panel or by updating the database directly.

6️⃣ Step 6: Verify
Test that the API is responding:


# From the server (using Docker network)
docker compose -f docker-compose.prod.yml exec server \
  wget -qO- http://localhost:3000/api/health

# Expected: {"status":"ok"}
📋 Viewing Logs

# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f server

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail 100 server
⏹️ Stopping and Starting

# Stop all services (keeps data)
docker compose -f docker-compose.prod.yml down

# Start again
docker compose -f docker-compose.prod.yml up -d

# Restart a single service
docker compose -f docker-compose.prod.yml restart server



🔒 Reverse Proxy & SSL
A reverse proxy sits between the internet and your KitchenAsty containers. It handles HTTPS encryption, routes requests to the correct service, and provides a professional setup with proper SSL certificates.

We cover two options: Caddy (easiest, recommended) and Nginx + Certbot (most common). Choose one.

🅰️ Option A: Caddy (Recommended)
Caddy is a modern web server that automatically obtains and renews SSL certificates from Let's Encrypt. It requires almost no configuration.

✨ Why Caddy?
🔒 Automatic HTTPS — no manual certificate setup or renewal cron jobs
📝 Simple configuration — a few lines vs. hundreds for Nginx
⚡ HTTP/2 and HTTP/3 out of the box
🔄 Automatic redirects — HTTP to HTTPS happens automatically
📦 Install Caddy
On your server:


sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudflare.com/cloudflare/d/deb/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null || true
curl -1sLf 'https://dl.cloudflare.com/cloudflare/d/deb/config.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null 2>&1 || true

# Use the official Caddy install method
sudo apt install -y caddy 2>/dev/null || {
  # Fallback: install from official Caddy repo
  curl -1sLf 'https://dl.cloudflare.com/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudflare.com/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt update && sudo apt install -y caddy
}
Or use the simplest method:


sudo apt update
sudo apt install -y caddy
💡

If apt install caddy isn't available on your distro, download the binary from caddyserver.com/download.

⚙️ Configure Caddy
Edit the Caddyfile:


sudo nano /etc/caddy/Caddyfile
Replace the contents with:


# Admin Dashboard
admin.yourdomain.com
    reverse_proxy kitchenasty-admin:80
}

# Customer Storefront
order.yourdomain.com
    reverse_proxy kitchenasty-storefront:80
}

# API Server
api.yourdomain.com
    reverse_proxy kitchenasty-server:3000
}
That's the entire configuration. Caddy will:

🔒 Automatically obtain SSL certificates from Let's Encrypt
🔄 Redirect HTTP to HTTPS
♻️ Renew certificates before they expire
⚡ Enable HTTP/2
🔗 Connect Caddy to Docker Network
Caddy needs to reach the Docker containers. The easiest way is to add Caddy to the same Docker network:


# Connect Caddy to the KitchenAsty Docker network
docker network connect kitchenasty caddy 2>/dev/null || true
However, since Caddy is installed as a system service (not a container), you need to expose the container ports on localhost instead. Update your docker-compose.prod.yml to expose ports on 127.0.0.1 only (not publicly):


  server:
    # ... existing config ...
    ports:
      - "127.0.0.1:3000:3000"

  admin:
    # ... existing config ...
    ports:
      - "127.0.0.1:5173:80"

  storefront:
    # ... existing config ...
    ports:
      - "127.0.0.1:5174:80"
Then update the Caddyfile to use localhost instead of container names:


# Admin Dashboard
admin.yourdomain.com
    reverse_proxy localhost:5173
}

# Customer Storefront
order.yourdomain.com
    reverse_proxy localhost:5174
}

# API Server — includes WebSocket support
api.yourdomain.com
    reverse_proxy localhost:3000
}
🚀 Start Caddy

sudo systemctl enable caddy
sudo systemctl restart caddy

# Check status
sudo systemctl status caddy
✅ Verify HTTPS
Wait 30-60 seconds for certificates to be issued, then visit:

🔒 https://admin.yourdomain.comhe Admin login
🔒 https://order.yourdomain.comhe Storefront
🔒 https://api.yourdomain.comould return {"status":"ok"}
📋 Caddy Logs

sudo journalctl -u caddy -f


✅ Verify HTTPS
Visit your sites in a browser:

🔒 https://admin.yourdomain.com
🔒 https://order.yourdomain.com
🔒 https://api.yourdomain.com
You should see a padlock icon in the address bar.

🔗 Updating CORS After SSL Setup
Now that your sites use HTTPS, update the CORS_ORIGINS in your .env file:


CORS_ORIGINS=https://admin.yourdomain.comourdomain.com
Then restart the API server:


docker compose -f docker-compose.prod.yml restart server
🔧 Troubleshooting
❌ "Connection refused" errors
Ensure the Docker containers are running and ports are exposed on 127.0.0.1:


docker compose -f docker-compose.prod.yml ps
curl http://127.0.0.1:3000/api/health
🔐 Certificate issuance fails
✅ Ensure DNS records point to your server (check with dig admin.yourdomain.com
✅ Ensure ports 80 and 443 are open in the firewall (sudo ufw status)
✅ Ensure no other process is using port 80 (sudo lsof -i :80)
🔌 WebSocket connections fail
If the kitchen display or live order tracking doesn't work, verify the /socket.io/ proxy block is present in your config and includes the Upgrade and Connection headers.