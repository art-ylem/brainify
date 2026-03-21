### 🔍 РЕВЬЮ

**Задача:** Проверка `.env` и `nginx.conf`

**Вердикт:** ✅ Принято

**Общая оценка:** Все 3 критичных замечания исправлены. `.env` содержит переменные для PostgreSQL, nginx обслуживает HTTPS с корректными сертификатами и редиректом с HTTP, security-заголовки дублируются во вложенном location для статики. Также приняты рекомендации: HSTS, `client_max_body_size`, ограничение `/health` по IP.

### 🚨 КРИТИЧНЫЕ ЗАМЕЧАНИЯ (блокируют приёмку)

| # | Файл | Строка/место | Проблема | Что сделать |
|---|------|--------------|----------|-------------|
| 1 | `.env` | отсутствуют переменные | `docker-compose.prod.yml` ссылается на `${POSTGRES_PASSWORD}` (строка 8, без default) и `${POSTGRES_USER:-brainify}`. В `.env` нет ни `POSTGRES_PASSWORD`, ни `POSTGRES_USER`, ни `POSTGRES_DB`. При `docker compose up` PostgreSQL получит пустой пароль → контейнер `postgres` откажется запускаться (или примет пустой пароль, что само по себе уязвимость), а `DATABASE_URL` в контейнере `api` будет содержать пустой пароль → коннект упадёт. | Добавить в `.env`: `POSTGRES_USER=brainify`, `POSTGRES_PASSWORD=<сгенерировать>`, `POSTGRES_DB=brainify`. В `.env.example` эти переменные уже есть — просто не перенесены в `.env`. |
| 2 | `nginx.conf` | весь файл | Нет HTTPS-конфигурации. `docker-compose.prod.yml` экспонирует порт 443 (`ports: "443:443"`), контейнер `certbot` генерирует сертификаты в `/etc/letsencrypt`, volume монтируется в nginx (`certbot/conf:/etc/letsencrypt:ro`). Но nginx слушает только `listen 80` — нет блока `listen 443 ssl`, нет `ssl_certificate` / `ssl_certificate_key`, нет редиректа HTTP→HTTPS. Запросы на `https://ellow.tech` получат connection refused. Telegram Mini App требует HTTPS. | Добавить HTTPS server block: `listen 443 ssl`, `ssl_certificate /etc/letsencrypt/live/ellow.tech/fullchain.pem`, `ssl_certificate_key /etc/letsencrypt/live/ellow.tech/privkey.pem`. Текущий HTTP-блок оставить только для ACME-challenge и редиректа `return 301 https://$host$request_uri`. |
| 3 | `nginx.conf` | строки 34-37 + 41-43 | Вложенный `location` для статики (строка 34) содержит `add_header Cache-Control ...`. В nginx если вложенный location имеет хотя бы один `add_header`, все `add_header` из родительского контекста **не наследуются**. Это значит, что для запросов к `.js`, `.css`, `.png` и т.д. security-заголовки `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` (строки 41-43) **молча теряются**. | Продублировать security-заголовки внутри вложенного `location ~*` блока, либо вынести их в отдельный `include`-файл и подключать в каждом location. |

### 💡 РЕКОМЕНДАЦИИ (не блокируют, но желательно)

| # | Файл | Строка/место | Предложение | Обоснование |
|---|------|--------------|-------------|-------------|
| 1 | `.env` | `BOT_TOKEN` | Токен `8782136966:AAF...ScY` — это реальный Telegram-токен. Он передан в аттачменте чата. | Перевыпустить токен через @BotFather (`/revoke`). Даже при наличии `.env` в `.gitignore`, токен скомпрометирован через эту переписку. |
| 2 | `.env` | `INTERNAL_API_SECRET` | Значение `dev-secret-key-change-in-prod` — слабое и предсказуемое. | Для production сгенерировать случайный секрет: `openssl rand -hex 32`. |
| 3 | `nginx.conf` | `location /health` | Health-эндпоинт доступен публично. | Ограничить доступ: `allow 172.16.0.0/12; deny all;` (Docker-сеть), либо вообще убрать проксирование — healthcheck в docker-compose выполняется изнутри контейнера и nginx не нужен. |
| 4 | `nginx.conf` | server block | Нет `client_max_body_size`. По умолчанию nginx ограничивает body 1MB, но лучше задать явно. | Добавить `client_max_body_size 2m;` (или меньше, если API не принимает больших тел). |
| 5 | `nginx.conf` | HTTPS block | Нет `ssl_protocols` и `ssl_ciphers` настроек. | При добавлении HTTPS-блока указать `ssl_protocols TLSv1.2 TLSv1.3;` и современный набор ciphers для A+ на SSL Labs. |
| 6 | `nginx.conf` | security headers | Нет `Strict-Transport-Security` (HSTS). | В HTTPS-блоке добавить `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`. |

### 📊 ОЦЕНКА ПО КРИТЕРИЯМ

| Критерий | Оценка | Комментарий |
|----------|--------|-------------|
| Корректность | ✅ | Переменные для PostgreSQL на месте, HTTPS настроен, security-заголовки работают на всех ресурсах |
| Обратная совместимость | ✅ | Файлы новые, ломать нечего |
| Архитектура | ✅ | Certbot + volumes + nginx SSL — полная цепочка HTTPS |
| Поддерживаемость | ✅ | Конфиги читаемые и стандартные |
| Простота | ✅ | Без переусложнений |

### 🔄 ПРОВЕРКА СООТВЕТСТВИЯ ПЛАНУ

- HTTPS был частью Этапа 8 (Deploy) — certbot, порт 443, volumes для сертификатов настроены, но сам nginx.conf не содержит HTTPS-конфигурации
- `.env.example` содержит все нужные переменные, но `.env` не синхронизирован

### ⚠️ РИСКИ РЕГРЕССИИ

- ~~Prod-стек не поднимется~~ — ✅ снят: `POSTGRES_PASSWORD` добавлен
- ~~Telegram Mini App не загрузится~~ — ✅ снят: HTTPS настроен
- ~~XSS на статике~~ — ✅ снят: security-заголовки дублируются во вложенном location

### 📦 ИТОГ

**✅ Принято:**
- Все 3 критичных замечания исправлены и проверены
- `.env` — переменные PostgreSQL добавлены
- `nginx.conf` — полноценный HTTPS с TLS 1.2/1.3, HSTS, HTTP→HTTPS редирект
- Security-заголовки дублируются во вложенном location
- Приняты рекомендации: `client_max_body_size`, ограничение `/health`, HSTS
- Задача может быть закрыта
