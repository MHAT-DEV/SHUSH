#!/bin/bash
# Shush Installer for Ubuntu

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       Shush Deployment Installer      ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 1. Check Root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run as root (sudo ./install.sh)${NC}"
  exit 1
fi

# 2. Check OS
if ! grep -q "Ubuntu" /etc/os-release; then
  echo -e "${RED}Error: This script is designed for Ubuntu only.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ OS verified: Ubuntu${NC}"

# 3. Check and Get Port
check_port() {
  local port=$1
  if ss -tuln | grep -q ":$port "; then
    echo -e "${RED}Port $port is already in use.${NC}"
    echo -e "${YELLOW}Services using port $port:${NC}"
    lsof -i :$port
    return 1
  fi
  return 0
}

APP_PORT=3000
echo -e "\n${YELLOW}Checking port availability...${NC}"
while ! check_port $APP_PORT; do
  read -p "Enter a different port for the Shush App (e.g., 3001): " APP_PORT
  APP_PORT=${APP_PORT:-3001}
done
echo -e "${GREEN}✓ Port $APP_PORT is available.${NC}"

# 4. Prompt configuration
echo -e "\n${YELLOW}Configuration${NC}"
read -p "Enter your domain or subdomain (e.g., shush.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
  echo -e "${RED}Error: Domain is required.${NC}"
  exit 1
fi

read -p "Do you want to configure HTTPS with Certbot? (y/N): " USE_HTTPS

# 5. Dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
apt-get update -y
apt-get install -y curl wget jq lsof

if ! command -v docker &> /dev/null; then
  echo -e "${BLUE}Installing Docker...${NC}"
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
fi

if ! command -v docker compose &> /dev/null; then
  echo -e "${BLUE}Installing Docker Compose Plugin...${NC}"
  apt-get install -y docker-compose-plugin
fi

if ! command -v nginx &> /dev/null; then
  echo -e "${BLUE}Installing Nginx...${NC}"
  apt-get install -y nginx
fi

if [[ "$USE_HTTPS" =~ ^[Yy]$ ]] && ! command -v certbot &> /dev/null; then
  echo -e "${BLUE}Installing Certbot...${NC}"
  apt-get install -y certbot python3-certbot-nginx
fi

echo -e "${GREEN}✓ Dependencies installed.${NC}"

# 6. Environment
echo -e "\n${YELLOW}Setting up environment variables...${NC}"
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || touch .env
fi
sed -i "s/^DOMAIN=.*/DOMAIN=$DOMAIN/" .env || echo "DOMAIN=$DOMAIN" >> .env
sed -i "s/^PORT=.*/PORT=$APP_PORT/" .env || echo "PORT=$APP_PORT" >> .env
sed -i "s/^RP_ID=.*/RP_ID=$DOMAIN/" .env || echo "RP_ID=$DOMAIN" >> .env

if [[ "$USE_HTTPS" =~ ^[Yy]$ ]]; then
  PROTOCOL="https"
  WS_PROTOCOL="wss"
else
  PROTOCOL="http"
  WS_PROTOCOL="ws"
fi

sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$PROTOCOL://$DOMAIN|" .env || echo "ALLOWED_ORIGINS=$PROTOCOL://$DOMAIN" >> .env
sed -i "s|^BASE_URL=.*|BASE_URL=$PROTOCOL://$DOMAIN|" .env || echo "BASE_URL=$PROTOCOL://$DOMAIN" >> .env
sed -i "s|^API_URL=.*|API_URL=$PROTOCOL://$DOMAIN/api|" .env || echo "API_URL=$PROTOCOL://$DOMAIN/api" >> .env
sed -i "s|^WS_URL=.*|WS_URL=$WS_PROTOCOL://$DOMAIN|" .env || echo "WS_URL=$WS_PROTOCOL://$DOMAIN" >> .env

if ! grep -q "JWT_SECRET" .env; then
  echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
fi

echo -e "${GREEN}✓ Environment configured for $DOMAIN${NC}"

# 7. Docker Build
echo -e "\n${YELLOW}Building and starting Docker container...${NC}"
docker compose build
docker compose up -d

echo -e "${BLUE}Waiting for application to start (up to 60s)...${NC}"
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
  echo -e "${GREEN}✓ Application is healthy.${NC}"
else
  echo -e "${RED}Warning: Application health check failed or timeout.${NC}"
  echo -e "${YELLOW}You can check the logs with: docker compose logs shush-app${NC}"
fi

# 8. Nginx
echo -e "\n${YELLOW}Configuring Nginx Reverse Proxy...${NC}"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

cat <<EOF > $NGINX_CONF
server {
    listen 80;
    server_name $DOMAIN;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeout settings
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;

        client_max_body_size 50M;
    }
}
EOF

ln -sf $NGINX_CONF /etc/nginx/sites-enabled/

echo -e "${BLUE}Testing Nginx syntax...${NC}"
if nginx -t; then
  systemctl reload nginx
  echo -e "${GREEN}✓ Nginx configured and reloaded.${NC}"
else
  echo -e "${RED}Error: Nginx configuration syntax is invalid.${NC}"
  exit 1
fi

# 9. SSL
if [[ "$USE_HTTPS" =~ ^[Yy]$ ]]; then
  echo -e "\n${YELLOW}Setting up SSL with Certbot...${NC}"
  certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email
  echo -e "${GREEN}✓ SSL Configured.${NC}"
fi

# 10. Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}   Shush Installation Completed!        ${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Domain:        $DOMAIN"
echo -e "Frontend URL:  $PROTOCOL://$DOMAIN"
echo -e "API URL:       $PROTOCOL://$DOMAIN/api"
echo -e "WebSocket URL: $WS_PROTOCOL://$DOMAIN"
echo -e "Docker Status: $(docker compose ps -q | wc -l) containers running"
echo -e "Nginx Status:  Active & Proxied"
echo -e "SSL Status:    $( [[ "$USE_HTTPS" =~ ^[Yy]$ ]] && echo "Enabled" || echo "Disabled" )"
echo -e "Internal Port: $APP_PORT"
echo -e "${GREEN}========================================${NC}"
echo -e "\nRun 'docker compose logs -f' to see application logs."
