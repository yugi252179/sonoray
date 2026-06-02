#!/usr/bin/env bash

# ==============================================================================
# Sonoray ERP - Quick Fix & Restart Script
# Run this if the site is down or apps are errored.
# Usage: bash fix.sh
# ==============================================================================

GREEN='\e[32m'; YELLOW='\e[33m'; CYAN='\e[36m'; BOLD='\e[1m'; NC='\e[0m'

echo -e "${YELLOW}${BOLD}=====================================================${NC}"
echo -e "${GREEN}${BOLD}     SONORAY ERP - AUTO FIX & RESTART${NC}"
echo -e "${YELLOW}${BOLD}=====================================================${NC}"

# Detect the real user (works whether run with sudo or not)
ACTUAL_USER=${SUDO_USER:-$USER}
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "\n${CYAN}[1/5] Fixing file ownership...${NC}"
sudo chown -R "$ACTUAL_USER":"$ACTUAL_USER" "$PROJECT_DIR"
echo -e "${GREEN}✓ Ownership fixed.${NC}"

echo -e "\n${CYAN}[2/5] Rebuilding Backend...${NC}"
cd "$PROJECT_DIR/backend"

# Ensure .env exists
if [ ! -f ".env" ]; then
  cat > .env <<'ENVEOF'
DATABASE_URL="mysql://sonoray_user:Sonoray2026@localhost:3306/sonoray"
PORT=5000
JWT_SECRET="sonoray_production_secret_key_2026"
ALLOWED_ORIGINS=
ENVEOF
  echo -e "${GREEN}  ✓ backend/.env created.${NC}"
fi

rm -rf node_modules
npm install
npm run db:generate
npm run build
echo -e "${GREEN}✓ Backend rebuilt.${NC}"

echo -e "\n${CYAN}[3/5] Rebuilding Frontend...${NC}"
cd "$PROJECT_DIR/frontend"
rm -rf node_modules .next
npm install --legacy-peer-deps
npm run build
echo -e "${GREEN}✓ Frontend rebuilt.${NC}"

echo -e "\n${CYAN}[4/5] Restarting apps with PM2...${NC}"
cd "$PROJECT_DIR"
pm2 delete sonoray-backend sonoray-frontend > /dev/null 2>&1 || true
pm2 start ecosystem.config.js
pm2 save > /dev/null 2>&1
echo -e "${GREEN}✓ PM2 restarted.${NC}"

echo -e "\n${CYAN}[5/5] Status:${NC}"
pm2 status

echo -e "\n${GREEN}${BOLD}=====================================================${NC}"
echo -e "${GREEN}${BOLD}  ✅ DONE! Your website should be back online.${NC}"
echo -e "${GREEN}${BOLD}=====================================================${NC}"
echo -e "${CYAN}  Login: admin@sonoray.com / admin${NC}"
echo -e "${YELLOW}  If tunnel stopped, re-run: sudo bash setup-trycloudflare.sh${NC}\n"
