#!/usr/bin/env bash

# ==============================================================================
# Sonoray ERP - TryCloudflare Automated Setup & Deployment
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
echo -e "${GREEN}${BOLD}           SONORAY ERP - AUTOMATED TRYCLOUDFLARE DEPLOYER${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Ensure script is run from the root of the repository
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
  echo -e "${RED}Error: Please run this script from the root of the sonoray project directory.${NC}"
  exit 1
fi

# 1. Fix APT Repository Conflict Error and Install Cloudflared
echo -e "\n${YELLOW}[1/5] Ensuring Cloudflared is installed via direct package download...${NC}"
if ! command -v cloudflared &> /dev/null; then
  echo -e "${CYAN}Downloading latest official cloudflared package...${NC}"
  wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  echo -e "${CYAN}Installing package...${NC}"
  sudo dpkg -i cloudflared-linux-amd64.deb >/dev/null 2>&1
  rm -f cloudflared-linux-amd64.deb
fi
echo -e "${GREEN}✓ Cloudflared is successfully installed!${NC}"


# 2. Build the Backend & Prepare the Database
echo -e "\n${YELLOW}[2/5] Building Backend and setting up MySQL Database...${NC}"
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
echo -e "\n${YELLOW}[3/5] Building Next.js Frontend Web Application...${NC}"
cd frontend
echo -e "${CYAN}Installing frontend packages...${NC}"
npm install
echo -e "${CYAN}Compiling Next.js production files...${NC}"
npm run build
cd ..
echo -e "${GREEN}✓ Frontend built successfully!${NC}"

# 4. Start services under PM2
echo -e "\n${YELLOW}[4/5] Starting application servers under PM2 Process Management...${NC}"
# Delete previous processes to ensure fresh ports
pm2 delete sonoray-backend sonoray-frontend >/dev/null 2>&1
pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✓ Background servers successfully started!${NC}"

# 5. Start the TryCloudflare Tunnel
echo -e "\n${YELLOW}[5/5] Launching your TryCloudflare Free Tunnel...${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "${BOLD}Your free public website URL will appear in a moment below.${NC}"
echo -e "${BOLD}Look for a line that starts with: ${GREEN}https://...trycloudflare.com${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

# Run the Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3000
