#!/usr/bin/env bash
# deploy.sh — deploy time-manager to Aliyun Ubuntu server
# Usage: bash deploy.sh <server_password>
# Target: root@47.76.221.78
# Ports:  4200 (Node API + static frontend)
#
# The server runs a single Node.js process (Express) on port 4200.
# Express serves both the static frontend (dist/) AND the /api routes.
# No separate Nginx needed — access via http://47.76.221.78:4200/

set -euo pipefail

SERVER="root@47.76.221.78"
APP_PORT=4200
DEPLOY_DIR="/opt/time-manager"
REPO_URL="https://github.com/nancy0001/Aliya-s-time-management.git"
BRANCH="agent/agent/07e19c0f"

if [ -z "${1:-}" ]; then
  echo "Usage: bash deploy.sh <ssh_password>"
  exit 1
fi
SSH_PASS="$1"

# Helper: run command on server via sshpass
remote() {
  sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SERVER" "$@"
}

echo "=== [1/6] Checking sshpass ==="
if ! command -v sshpass &>/dev/null; then
  echo "sshpass not found locally. Install with: brew install hudochenkov/sshpass/sshpass"
  echo "Or on Linux: apt-get install sshpass"
  exit 1
fi

echo "=== [2/6] Checking server connectivity ==="
remote "echo 'SSH OK'"

echo "=== [3/6] Installing Node.js LTS + pm2 + git on server ==="
remote "bash -s" << 'REMOTE_SETUP'
set -e
# Install Node.js 20 LTS if not present or version < 18
NODE_VER=$(node -v 2>/dev/null | grep -oP '\d+' | head -1 || echo "0")
if [ "$NODE_VER" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
# Install pm2 globally
npm install -g pm2 2>/dev/null || true
# Install git
apt-get install -y git 2>/dev/null || true
node -v
npm -v
pm2 -v
REMOTE_SETUP

echo "=== [4/6] Cloning / updating repo on server ==="
remote "bash -s" << REMOTE_CLONE
set -e
if [ -d "$DEPLOY_DIR/.git" ]; then
  echo "Repo exists, pulling latest..."
  cd "$DEPLOY_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  echo "Cloning repo..."
  git clone --branch "$BRANCH" "$REPO_URL" "$DEPLOY_DIR"
  cd "$DEPLOY_DIR"
fi
REMOTE_CLONE

echo "=== [5/6] Installing dependencies and building frontend ==="
remote "bash -s" << REMOTE_BUILD
set -e
cd "$DEPLOY_DIR"

# Install frontend deps and build
npm install --legacy-peer-deps
npm run build

# Install server deps
cd "$DEPLOY_DIR/server"
npm install --legacy-peer-deps

# Create data directory
mkdir -p "$DEPLOY_DIR/data"
REMOTE_BUILD

echo "=== [6/6] Starting / restarting server with pm2 ==="
remote "bash -s" << REMOTE_PM2
set -e
cd "$DEPLOY_DIR"

# Open firewall port (ufw)
ufw allow $APP_PORT/tcp 2>/dev/null || true

# Write pm2 ecosystem config
cat > "$DEPLOY_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: "time-manager",
    script: "server/index.js",
    cwd: "/opt/time-manager",
    env: {
      API_PORT: "4200",
      NODE_ENV: "production"
    },
    restart_delay: 3000,
    max_restarts: 10
  }]
}
EOF

# Stop old instance if running
pm2 stop time-manager 2>/dev/null || true
pm2 delete time-manager 2>/dev/null || true

# Start
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "Server started. Checking health..."
sleep 2
curl -sf http://localhost:4200/api/health && echo " — health OK" || echo " — health check failed, check pm2 logs"
REMOTE_PM2

echo ""
echo "✅ Deploy complete!"
echo "   App URL: http://47.76.221.78:${APP_PORT}/"
echo "   API health: http://47.76.221.78:${APP_PORT}/api/health"
echo ""
echo "⚠️  IMPORTANT: Make sure Aliyun security group allows inbound TCP on port ${APP_PORT}"
echo "   Console: https://ecs.console.aliyun.com/ → Security Groups → Add Inbound Rule"
echo "   Port: ${APP_PORT}, Protocol: TCP, Source: 0.0.0.0/0"
echo ""
echo "   View server logs: sshpass -p <pw> ssh root@47.76.221.78 'pm2 logs time-manager'"
