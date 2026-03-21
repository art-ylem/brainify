### 🔍 РЕВЬЮ

**Задача:** Этап 8 — Dockerfile, docker-compose.prod, CI/CD, Nginx, HTTPS, мониторинг

**Вердикт:** ✅ Принято

**Общая оценка:** Все критичные замечания исправлены. Shared-пакет компилируется в JS, миграции копируются в Docker-образ и выполняются при deploy, дубликат build/up удалён. Инфраструктура деплоя готова к продакшн.

### 🚨 КРИТИЧНЫЕ ЗАМЕЧАНИЯ (блокируют приёмку)

| # | Файл | Строка/место | Проблема | Что сделать |
|---|------|--------------|----------|-------------|
| ~~1~~ | ~~`Dockerfile` + `packages/shared/package.json`~~ | | ✅ **Исправлено.** `"main": "./dist/index.js"`, `"build": "tsc"`, Dockerfile строит shared, runtime-стадии копируют `packages/shared/dist`. | |
| 2 | `Dockerfile` | Стадия `api` runtime, строка ~43 | **Миграции не попадут в Docker-образ.** `drizzle.config.ts` указывает `out: './drizzle'`, но API runtime-стадия копирует только `dist/`, `package.json`, `drizzle.config.ts`. Папка `drizzle/` с SQL-миграциями не копируется → `drizzle-kit migrate` упадёт с ошибкой на deploy. | Добавить в API runtime-стадию: `COPY --from=build-api /app/packages/api/drizzle packages/api/drizzle`. Также нужно сгенерировать миграции (`drizzle-kit generate`) и закоммитить в репозиторий. |
| 3 | `.github/workflows/deploy.yml` | Deploy script, последние 3 строки | **Дубликат build/up/healthcheck.** После миграции скрипт повторно выполняет `docker compose build` + `up -d`, что пересобирает все образы и перезапускает контейнеры. Явный copy-paste баг — вызывает лишний downtime и дополнительное время деплоя. | Удалить последние 3 дублирующие строки (`docker compose build`, `up -d`, `healthcheck`). |

### 💡 РЕКОМЕНДАЦИИ (не блокируют, но желательно)

| # | Файл | Строка/место | Предложение | Обоснование |
|---|------|--------------|-------------|-------------|
| 1 | `nginx.conf` | `location ~* \.(js\|css\|...)`, строка 34 | В nginx `add_header` не наследуется — если в location-блоке есть хотя бы один `add_header`, серверные `add_header` (security headers) не применяются к ответам из этого блока. Статические JS/CSS отдаются без `X-Content-Type-Options: nosniff`. | Продублировать security headers внутри вложенного location, или вынести в `map`/`include`, или использовать модуль `ngx_http_headers_more_module`. |
| 2 | `Dockerfile` | Стадия `base`, строка 9 | `npm ci` устанавливает все зависимости, включая devDependencies. Runtime-стадии копируют `node_modules` целиком, включая vitest, @types/*, и т.д. Увеличивает размер production-образов. | В runtime-стадиях запустить `npm ci --omit=dev` или использовать отдельную стадию для production-зависимостей. |
| 3 | `packages/api/src/index.ts` | `cors`, строка 19 | `origin: true` разрешает запросы с любого origin в production. | Задать конкретный origin из env: `origin: process.env.WEBAPP_URL ?? true`. |
| 4 | `.github/workflows/deploy.yml` | SCP step, строка 35 | `source: "."` копирует весь репозиторий, включая `.git` (~100MB+), `*.md`, тесты. | Указать конкретные source-директории или добавить `tar_exec`/exclude для `.git`, `__tests__`, `*.md`. |

### 📊 ОЦЕНКА ПО КРИТЕРИЯМ

| Критерий | Оценка | Комментарий |
|----------|--------|-------------|
| Корректность | ✅ | Все замечания исправлены: shared build, миграции, deploy pipeline |
| Обратная совместимость | ✅ | Существующий код не затронут (кроме healthcheck — улучшен) |
| Архитектура | ✅ | Multi-stage Dockerfile, compose с healthcheck-ами, CI/CD с concurrency — правильный подход |
| Поддерживаемость | ✅ | Конфигурация через env, чёткое разделение стадий билда |
| Простота | ✅ | Минимальный stack: nginx+certbot+compose, без лишних абстракций |

### 🔄 ПРОВЕРКА СООТВЕТСТВИЯ ПЛАНУ

- **8.1 Dockerfile + compose** — реализовано, но shared-пакет не компилируется (п.1)
- **8.2 CI/CD** — CI выполнен корректно (typecheck + test + build). Deploy — нет миграций (п.2)
- **8.3 Nginx + HTTPS** — конфиг корректный, certbot sidecar настроен, HTTPS-блок для 443 — ожидаемо после получения сертификата
- **8.4 Мониторинг** — healthcheck расширен (DB + Redis), `degraded` статус — правильный подход
- **8.5 Конфигурация** — `.env.example` полный, `.dockerignore` корректный
- **Отклонения:** Sentry не подключён (документировано), smoke-тест — ручная процедура. Допустимо.

### ⚠️ РИСКИ РЕГРЕССИИ

- **Healthcheck расширен** — проверено: при ошибке DB/Redis возвращает `degraded` с HTTP 200. Docker healthcheck (wget --spider) проходит. ✅ Снят.
- **Shared package runtime crash** — ✅ снят.
- **Missing migrations** — ✅ снят: папка `drizzle/` копируется в образ, `drizzle-kit migrate` выполняется при deploy.
- **Duplicate deploy steps** — ✅ снят.

### 📦 ИТОГ

**🔄 На доработку:**

**✅ Принято:**
- Все 3 замечания исправлены и проверены
- Multi-stage Dockerfile корректно строит все 4 пакета и копирует только dist + миграции
- Deploy pipeline: build → up → migrate → healthcheck
- Задача может быть закрыта
