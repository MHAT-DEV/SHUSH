#!/bin/bash
# Shush Updater for Ubuntu

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       Shush Deployment Updater        ${NC}"
echo -e "${BLUE}=======================================${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run as root (sudo ./update.sh)${NC}"
  exit 1
fi

echo -e "\n${YELLOW}Pulling latest changes (if using git)...${NC}"
if [ -d ".git" ]; then
  git pull origin main || echo -e "${YELLOW}Could not pull from git. Proceeding anyway...${NC}"
fi

echo -e "\n${YELLOW}Rebuilding Docker images...${NC}"
docker compose build --no-cache

echo -e "\n${YELLOW}Restarting Services...${NC}"
docker compose up -d

echo -e "${BLUE}Waiting for application to start (up to 60s)...${NC}"
source .env
APP_PORT=${PORT:-3000}

MAX_RETRIES=30
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s http://localhost:$APP_PORT/api/health | grep -q "ok"; then
    HEALTHY=true
    break
  fi
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ "$HEALTHY" = true ]; then
  echo -e "${GREEN}✓ Application updated and healthy!${NC}"
else
  echo -e "${RED}Warning: Application health check failed or timeout.${NC}"
  echo -e "${YELLOW}You can check the logs with: docker compose logs shush-app${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}   Shush Update Completed!              ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Run 'docker compose logs -f' to see application logs."
