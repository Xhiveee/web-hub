#!/usr/bin/env sh
set -eu

DEST="/opt/hub"
REPO="https://github.com/Xhiveee/web-hub.git"

echo "== Web Hub installer =="

if [ ! -w /opt ] || [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo sh install.sh"
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  echo "docker: found"
else
  echo "docker not found. Install first: https://docs.docker.com/engine/install/"
  exit 1
fi

echo "Domain for HTTPS (empty = LAN http://server-ip)?"
read -r HUB_DOMAIN

if [ -d "$DEST/.git" ]; then
  echo "Existing install at $DEST: git pull"
  git -C "$DEST" pull
else
  git clone "$REPO" "$DEST"
fi

cd "$DEST"

printf "HUB_SECRET=%s\n" "$(openssl rand -hex 32)" > .env
printf "HUB_INVITE_CODE=%s\n" "$(openssl rand -hex 4 | head -c 8)" >> .env
cat .env.example | grep -v '^HUB_SECRET' | grep -v '^HUB_INVITE_CODE' >> .env || true

echo "AI provider (OpenRouter/others) optional. Paste API key (empty = skip):"
read -r AI_KEY
if [ -n "${AI_KEY:-}" ]; then
  echo "AI base URL [https://openrouter.ai/api/v1]:"
  read -r AI_URL
  echo "AI model [openrouter/auto]:"
  read -r AI_MODEL
  printf "HUB_AI_API_KEY=%s\n" "${AI_KEY}" > .env.tmp
  grep -v '^HUB_AI_' .env >> .env.tmp || true
  printf "HUB_AI_BASE_URL=%s\nHUB_AI_MODEL=%s\n" "${AI_URL:-https://openrouter.ai/api/v1}" "${AI_MODEL:-openrouter/auto}" >> .env.tmp
  mv .env.tmp .env
fi

echo "Telegram bot token (optional, empty = skip):"
read -r TG_TOKEN
if [ -n "${TG_TOKEN:-}" ]; then
  printf "HUB_TELEGRAM_BOT_TOKEN=%s\n" "${TG_TOKEN}" > .env.tmp
  grep -v '^HUB_TELEGRAM_BOT_TOKEN' .env >> .env.tmp || true
  mv .env.tmp .env
fi

if [ -n "${HUB_DOMAIN:-}" ]; then
  cat > Caddyfile <<EOF
$HUB_DOMAIN {
    handle /api/* {
        reverse_proxy backend:8000
    }
    handle {
        reverse_proxy frontend:80
    }
}
EOF
  echo "HTTPS will be via Let's Encrypt for $HUB_DOMAIN (ports 80+443 must be open)"
  URL="https://$HUB_DOMAIN"
else
  git checkout -- Caddyfile 2>/dev/null || true
  URL="http://$(hostname -I | awk '{print $1}')"
fi

docker compose up -d --build

INVITE=$(grep '^HUB_INVITE_CODE=' .env | cut -d= -f2)

echo ""
echo "== Done =="
echo "URL: $URL"
echo "Invite code (for registration): $INVITE"
echo "Data dir: $DEST/data (backup with: sh backup.sh)"
