#!/bin/bash
set -euo pipefail

# ============================================================
# Brainify — скрипт первичного деплоя на VPS
# Запуск: bash deploy.sh
# Требования: Ubuntu 22/24, root или sudo
# ============================================================

DOMAIN="brainify.ellow.tech"
EMAIL="art-ylem@mail.ru"
REPO="https://github.com/art-ylem/brainify.git"
APP_DIR="/opt/brainify"

echo "=== [1/7] Установка Docker ==="
if ! command -v docker &> /dev/null; then
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  echo "Docker установлен: $(docker --version)"
else
  echo "Docker уже установлен: $(docker --version)"
fi

echo ""
echo "=== [2/7] Клонирование репозитория ==="
if [ -d "$APP_DIR" ]; then
  echo "Директория $APP_DIR существует, обновляю..."
  cd "$APP_DIR"
  git pull origin main
else
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

echo ""
echo "=== [3/7] Создание .env ==="
if [ ! -f "$APP_DIR/.env" ]; then
  POSTGRES_PASSWORD=$(openssl rand -hex 16)
  INTERNAL_SECRET=$(openssl rand -hex 32)

  cat > "$APP_DIR/.env" << EOF
# Telegram Bot
BOT_TOKEN=ВСТАВЬТЕ_ТОКЕН_БОТА

# Mini App URL
WEBAPP_URL=https://${DOMAIN}

# PostgreSQL
DATABASE_URL=postgresql://brainify:${POSTGRES_PASSWORD}@localhost:5432/brainify
POSTGRES_USER=brainify
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=brainify

# Redis
REDIS_URL=redis://localhost:6379

# API
API_HOST=0.0.0.0
API_PORT=3000

# Internal API secret
INTERNAL_API_SECRET=${INTERNAL_SECRET}

# Telegram Payments
PAYMENT_PROVIDER_TOKEN=

# Webapp bot username
VITE_BOT_USERNAME=BrainifyBot

# Logging
LOG_LEVEL=info
NODE_ENV=production
EOF

  echo "ВАЖНО: Откройте $APP_DIR/.env и вставьте BOT_TOKEN!"
  echo "Сгенерированный POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}"
  echo "Сгенерированный INTERNAL_API_SECRET: ${INTERNAL_SECRET}"
else
  echo ".env уже существует, пропускаю"
fi

echo ""
echo "=== [4/7] Подготовка директорий для certbot ==="
mkdir -p "$APP_DIR/certbot/conf" "$APP_DIR/certbot/www"

echo ""
echo "=== [5/7] Получение SSL-сертификата ==="
# Временная nginx-конфигурация (только HTTP для ACME challenge)
cat > "$APP_DIR/nginx-temp.conf" << 'NGINX_TEMP'
server {
    listen 80;
    server_name brainify.ellow.tech;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Brainify is setting up SSL...';
        add_header Content-Type text/plain;
    }
}
NGINX_TEMP

# Запускаем временный nginx для ACME challenge
docker run -d --name brainify-certbot-nginx \
  -p 80:80 \
  -v "$APP_DIR/nginx-temp.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$APP_DIR/certbot/www:/var/www/certbot:ro" \
  nginx:alpine

echo "Ждём запуск nginx..."
sleep 3

# Получаем сертификат
docker run --rm \
  -v "$APP_DIR/certbot/conf:/etc/letsencrypt" \
  -v "$APP_DIR/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive

# Убираем временный nginx
docker stop brainify-certbot-nginx && docker rm brainify-certbot-nginx
rm -f "$APP_DIR/nginx-temp.conf"

echo "SSL-сертификат получен для $DOMAIN"

echo ""
echo "=== [6/7] Сборка и запуск Docker-стека ==="
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

echo "Ожидаю запуск сервисов..."
sleep 15

echo ""
echo "=== [7/7] Миграция базы данных ==="
docker compose -f docker-compose.prod.yml exec api \
  node node_modules/.bin/drizzle-kit migrate

echo ""
echo "========================================="
echo "  Деплой завершён!"
echo "========================================="
echo ""
echo "Статус контейнеров:"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "Проверка здоровья:"
sleep 5
docker compose -f docker-compose.prod.yml exec api wget -qO- http://localhost:3000/health || echo "API ещё запускается..."
echo ""
echo "Сайт: https://${DOMAIN}"
echo ""
echo "ВАЖНО: Если вы ещё не вставили BOT_TOKEN в .env:"
echo "  1. nano $APP_DIR/.env"
echo "  2. docker compose -f docker-compose.prod.yml restart bot"
