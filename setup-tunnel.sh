#!/usr/bin/env bash

# ==============================================================================
# Sonoray ERP - Cloudflare Tunnel Configurator
# ==============================================================================

# Ensure arguments are provided
if [ "$#" -ne 2 ]; then
  echo -e "\e[31mError: Missing arguments.\e[0m"
  echo -e "Usage:   $0 <tunnel_name> <domain_or_subdomain>"
  echo -e "Example: $0 sonoray-tunnel erp.yourdomain.com"
  exit 1
fi

TUNNEL_NAME=$1
HOSTNAME=$2

# Check if authenticated
if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
  echo -e "\e[31mError: You must authenticate with Cloudflare first.\e[0m"
  echo -e "Please run: \e[36mcloudflared tunnel login\e[0m and then re-run this script."
  exit 1
fi

echo -e "\e[34m======================================================================\e[0m"
echo -e "\e[32m           CREATING AND CONFIGURING CLOUDFLARE TUNNEL\e[0m"
echo -e "\e[34m======================================================================\e[0m"

# 1. Create the tunnel
echo -e "\n\e[33m[1/4] Running 'cloudflared tunnel create'...\e[0m"
TUNNEL_OUTPUT=$(cloudflared tunnel create "$TUNNEL_NAME" 2>&1)
echo "$TUNNEL_OUTPUT"

# Extract UUID from output using grep and sed or awk
# Output typical format: Created tunnel sonoray-tunnel with id 12345678-abcd-1234-abcd-1234567890ab
TUNNEL_UUID=$(echo "$TUNNEL_OUTPUT" | grep -oE "with id [0-9a-fA-F-]+" | awk '{print $3}')

if [ -z "$TUNNEL_UUID" ]; then
  echo -e "\e[31mError: Could not extract Tunnel UUID from the output.\e[0m"
  echo -e "Please ensure the tunnel name doesn't already exist or check the output above."
  exit 1
fi

echo -e "\e[32mSuccessfully created tunnel with UUID: $TUNNEL_UUID\e[0m"

# 2. Configure directories
echo -e "\n\e[33m[2/4] Setting up /etc/cloudflared directory...\e[0m"
sudo mkdir -p /etc/cloudflared

# Copy credentials file to system service path
if [ -f "$HOME/.cloudflared/$TUNNEL_UUID.json" ]; then
  sudo cp "$HOME/.cloudflared/$TUNNEL_UUID.json" "/etc/cloudflared/$TUNNEL_UUID.json"
  echo -e "Copied credential file to /etc/cloudflared/$TUNNEL_UUID.json"
else
  echo -e "\e[31mError: Credentials file not found at $HOME/.cloudflared/$TUNNEL_UUID.json\e[0m"
  exit 1
fi

# 3. Create config.yml with Ingress Rules
echo -e "\n\e[33m[3/4] Writing Ingress Rules to /etc/cloudflared/config.yml...\e[0m"
sudo tee /etc/cloudflared/config.yml > /dev/null <<EOF
tunnel: $TUNNEL_UUID
credentials-file: /etc/cloudflared/$TUNNEL_UUID.json

ingress:
  - hostname: $HOSTNAME
    service: http://localhost:3000
  - service: http_status:404
EOF

echo -e "Configuration written to /etc/cloudflared/config.yml:"
sudo cat /etc/cloudflared/config.yml

# 4. Route DNS on Cloudflare dashboard
echo -e "\n\e[33m[4/4] Setting up DNS route for $HOSTNAME...\e[0m"
cloudflared tunnel route dns "$TUNNEL_NAME" "$HOSTNAME"

echo -e "\n\e[32m======================================================================\e[0m"
echo -e "\e[32m           TUNNEL CONFIGURATION COMPLETE!\e[0m"
echo -e "\e[34m======================================================================\e[0m"
echo -e "\e[33mTo start hosting and testing your website:\e[0m"
echo -e " 1. Start your local services: \e[36mpm2 start ecosystem.config.js\e[0m"
echo -e " 2. Run the tunnel service on boot: \e[36msudo cloudflared service install\e[0m"
echo -e " 3. Start the systemd service: \e[36msudo systemctl start cloudflared\e[0m"
echo -e " 4. Open: \e[36mhttps://$HOSTNAME\e[0m in your browser!"
echo -e "\e[34m======================================================================\e[0m"
