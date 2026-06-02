#!/usr/bin/env bash

# ==============================================================================
# Sonoray ERP - Localhost.run Automated Setup & Deployment
# ==============================================================================

# Text Color Tokens
RED='\e[31m'
GREEN='\e[32m'
YELLOW='\e[33m'
BLUE='\e[34m'
CYAN='\e[36m'
BOLD='\e[1m'
NC='\e[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}${BOLD}           SONORAY ERP - AUTOMATED LOCALHOST.RUN DEPLOYER${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Ensure script is run from the root of the repository
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
  echo -e "${RED}Error: Please run this script from the root of the sonoray project directory.${NC}"
  exit 1
fi

# 1. Fix APT Repository Conflict Error
echo -e "\n${YELLOW}[1/6] Fixing system APT repository conflicts...${NC}"
sudo rm -f /etc/apt/sources.list.d/cloudflared.list
sudo rm -f /etc/apt/sources.list.d/cloudflare.list
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null 2>&1
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" | sudo tee /etc/apt/sources.list.d/cloudflared.list >/dev/null
sudo apt-get update -y >/dev/null 2>&1
echo -e "${GREEN}✓ APT package system successfully repaired!${NC}"

# 2. Build the Backend & Prepare the Database
echo -e "\n${YELLOW}[2/6] Building Backend and setting up MySQL Database...${NC}"
cd backend
echo -e "${CYAN}Installing backend packages...${NC}"
npm install
echo -e "${CYAN}Generating Prisma Client...${NC}"
npm run db:generate
echo -e "${CYAN}Pushing database tables to MySQL...${NC}"
npm run db:push
echo -e "${CYAN}Seeding initial ERP demo data...${NC}"
npm run seed:demo
echo -e "${CYAN}Compiling TypeScript backend source...${NC}"
npm run build
cd ..
echo -e "${GREEN}✓ Backend built and database prepared successfully!${NC}"

# 3. Build the Frontend Web App
echo -e "\n${YELLOW}[3/6] Building Next.js Frontend Web Application...${NC}"
cd frontend
echo -e "${CYAN}Installing frontend packages (this may take a moment)...${NC}"
npm install
echo -e "${CYAN}Compiling Next.js production files...${NC}"
npm run build
cd ..
echo -e "${GREEN}✓ Frontend built successfully!${NC}"

# 4. Start services under PM2
echo -e "\n${YELLOW}[4/6] Booting applications under PM2 Process Management...${NC}"
pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✓ Services running in background! Type 'pm2 status' anytime to inspect them.${NC}"

# 5. Check and Generate SSH Keys for Localhost.run
echo -e "\n${YELLOW}[5/6] Configuring SSH identity keys...${NC}"
if [ ! -f "$HOME/.ssh/id_ed25519" ]; then
  echo -e "${CYAN}No existing SSH key detected. Generating a secure Ed25519 identity key...${NC}"
  mkdir -p "$HOME/.ssh"
  ssh-keygen -t ed25519 -N "" -f "$HOME/.ssh/id_ed25519"
  echo -e "${GREEN}✓ Security SSH Key successfully generated!${NC}"
else
  echo -e "${GREEN}✓ Secure SSH Key already exists on this server.${NC}"
fi

# 6. Display SSH Public Key and Instructions
echo -e "\n${YELLOW}[6/6] INSTRUCTIONS FOR EXPOSING YOUR SYSTEM TO THE INTERNET${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "${BOLD}Your Server's SSH Public Key is printed below:${NC}"
echo -e "${CYAN}"
cat "$HOME/.ssh/id_ed25519.pub"
echo -e "${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "${BOLD}Follow these steps to lock in your free permanent URL:${NC}"
echo -e " 1. Go to ${CYAN}https://admin.localhost.run${NC} on your phone or laptop."
echo -e " 2. Sign in (using Google or GitHub) and click on ${BOLD}SSH Keys -> Add Key${NC}."
echo -e " 3. Copy and paste the ${CYAN}ssh-ed25519...${NC} key printed above."
echo -e " 4. Click on ${BOLD}Domains${NC} in the menu to see your assigned free permanent subdomain."
echo -e " 5. Open your terminal and start your tunnel using your permanent subdomain:"
echo -e "    ${GREEN}ssh -R 80:localhost:3000 localhost.run${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "${YELLOW}To quickly test immediately (Temporary anonymous link):${NC}"
echo -e " Run this command: ${GREEN}ssh -R 80:localhost:3000 noauth@localhost.run${NC}"
echo -e "${BLUE}======================================================================${NC}"
