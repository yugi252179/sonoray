#!/usr/bin/env bash

# ==============================================================================
# Sonoray ERP - Ubuntu Server Automatic Provisioning Script
# ==============================================================================

# Ensure script is run as root
if [ "$EUID" -ne 0 ]; then
  echo -e "\e[31mError: Please run this script as root (use sudo).\e[0m"
  exit 1
fi

echo -e "\e[34m======================================================================\e[0m"
echo -e "\e[32m           STARTING SONORAY ERP UBUNTU PROVISIONING SYSTEM\e[0m"
echo -e "\e[34m======================================================================\e[0m"

# 1. Update package list
echo -e "\n\e[33m[1/5] Updating and upgrading system packages...\e[0m"
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git build-essential gnupg lsb-release

# 2. Install Node.js v20 LTS
echo -e "\n\e[33m[2/5] Installing Node.js (v20 LTS)...\e[0m"
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
apt-get update && apt-get install -y nodejs

# 3. Install PM2 (Process Manager)
echo -e "\n\e[33m[3/5] Installing PM2 globally...\e[0m"
npm install -y pm2 -g
# Generate PM2 startup script to run on boot
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER

# 4. Install and configure MySQL Server
echo -e "\n\e[33m[4/5] Installing and configuring MySQL Server...\e[0m"
apt-get install -y mysql-server
systemctl start mysql
systemctl enable mysql

# Configure MySQL database and user credentials
echo -e "\e[33mConfiguring MySQL database 'sonoray' and user 'sonoray_user'...\e[0m"
mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS sonoray;
DROP USER IF EXISTS 'sonoray_user'@'localhost';
CREATE USER 'sonoray_user'@'localhost' IDENTIFIED BY 'Sonoray2026';
GRANT ALL PRIVILEGES ON sonoray.* TO 'sonoray_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# 5. Install Cloudflare Tunnel (cloudflared)
echo -e "\n\e[33m[5/5] Installing Cloudflare Tunnel daemon (cloudflared)...\e[0m"
mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" | tee /etc/apt/sources.list.d/cloudflared.list
apt-get update && apt-get install -y cloudflared

echo -e "\n\e[32m======================================================================\e[0m"
echo -e "\e[32m           PROVISIONING COMPLETED SUCCESSFULLY!\e[0m"
echo -e "\e[34m======================================================================\e[0m"
echo -e "\e[33mNext Steps:\e[0m"
echo -e " 1. Run: \e[36mcloudflared tunnel login\e[0m to authorize your Cloudflare domain."
echo -e " 2. Run: \e[36m./setup-tunnel.sh <tunnel_name> <your_subdomain>\e[0m to create and map your tunnel."
echo -e " 3. Run: \e[36mpm2 start ecosystem.config.js\e[0m from your project directory to run the website."
echo -e " 4. Run: \e[36msudo cloudflared service install\e[0m to make the tunnel boot on startup."
echo -e "\e[34m======================================================================\e[0m"
