# 🗺️ ПЛАН ВЫПОЛНЕНИЯ

**Задача:** Добавить диагностические логи и устранить нестабильность TMA

**Тип:** Исправление дефекта + улучшение наблюдаемости

**Стратегия:** Три параллельных потока — (1) seed-данные для tasks, (2) диагностические логи на API, (3) улучшение отображения ошибок в Mini App. Потоки независимы и не ломают существующее поведение.

---

## 📐 ЭТАПЫ

### Этап 1: Seed-данные для таблицы `tasks`

**Цель этапа:** После запуска API таблица `tasks` содержит 7 записей. Каталог заданий в Mini App не пустой.

| # | Подзадача | Файлы/компоненты | Зависит от | Checkpoint |
|---|-----------|-------------------|------------|------------|
| 1.1 | Создать файл `packages/api/src/db/seed.ts` — функция `seedTasks()`, которая вставляет 7 записей в таблицу `tasks` через Drizzle ORM с `onConflictDoNothing` по уникальному индексу `tasks_type_idx`. Данные берутся из `taskRegistry` (цикл по ключам registry, обращение к `.type`, `.category`, `.nameKey`, `.descriptionKey`). Не хардкодить — генерировать из `taskRegistry`, чтобы seed не рассинхронизировался при добавлении новых типов. | `packages/api/src/db/seed.ts` | — | Функция экспортируется, вызов вставляет 7 записей, повторный вызов не создаёт дубликатов |
| 1.2 | Вызвать `seedTasks()` в `packages/api/src/migrate.ts` — сразу после успешного `migrate()`. Логировать результат: `console.log('Seeded N tasks')` или `console.log('Tasks already seeded, no changes')`. | `packages/api/src/migrate.ts` | 1.1 | В логах `docker logs brainify-api` видна строка о seed. В БД — 7 записей в `tasks`. |
| 1.3 | Проверить маппинг type→category: `schulte→attention`, `sequence_memory→memory`, `arithmetic→speed`, `stroop→attention`, `number_series→logic`, `memory_pairs→memory`, `pattern_search→logic`. Эти значения вычисляются из `taskRegistry[key].category` — доп. работа не нужна, если seed строится из registry. **Внимание:** постановка содержала неверные гипотезы (`arithmetic→logic`, `pattern_search→attention`), фактические значения из кода другие — seed должен использовать данные из registry, а не хардкод. | — | 1.1 | Значения в БД совпадают с `taskRegistry` |

**Definition of done этапа:** `docker compose up` → миграции → seed → API стартует → `GET /api/tasks` возвращает 7 заданий → Mini App показывает каталог.

---

### Этап 2: Диагностические логи на API (бэкенд)

**Цель этапа:** При ошибках авторизации, миграции и роутов — в `docker logs` видна причина отказа с контекстом.

| # | Подзадача | Файлы/компоненты | Зависит от | Checkpoint |
|---|-----------|-------------------|------------|------------|
| 2.1 | В `packages/api/src/auth/middleware.ts` — добавить `request.log.warn(...)` перед каждым `reply.code(401/500).send(...)`: (a) при отсутствии `BOT_TOKEN` — `'BOT_TOKEN not configured'`, (b) при отсутствии заголовка Authorization — `'Missing authorization header'`, (c) при невалидном initData — `'Invalid initData'` (логировать причину: bad hash, expired, no user). Для этого разделить `validateInitData` на более гранулярные проверки с возвратом причины (enum или строка), а не просто `null`. | `packages/api/src/auth/middleware.ts` | — | В логах видна конкретная причина 401 (expired / bad hash / missing user) |
| 2.2 | В `packages/api/src/migrate.ts` — обернуть `migrate()` в try/catch, при ошибке логировать `console.error('Migration failed:', error)` и завершать процесс с кодом 1. Сейчас ошибка миграции не ловится и может привести к запуску API без таблиц. | `packages/api/src/migrate.ts` | — | При ошибке миграции — в логах сообщение, процесс не стартует |
| 2.3 | В `packages/api/src/routes/users.ts` — добавить `request.log.error(...)` в блок создания пользователя при ошибке вставки. Сейчас race condition обрабатывается, но ошибки БД не логируются. | `packages/api/src/routes/users.ts` | — | При ошибке создания пользователя — в логах видна ошибка с Telegram ID |
| 2.4 | В `packages/api/src/routes/tasks.ts` — добавить `request.log.error(...)` при ошибке `taskRegistry[task.type]` === undefined (сейчас возвращается 500, но без лога). Добавить лог при ошибке создания/валидации сессии. | `packages/api/src/routes/tasks.ts` | — | При неизвестном типе задачи — в логах виден тип и task ID |

**Definition of done этапа:** При любом 401/500 от API — в `docker logs brainify-api` видна конкретная причина с контекстом.

---

### Этап 3: Улучшение отображения ошибок в Mini App (фронтенд)

**Цель этапа:** При ошибке TMA пользователь видит категорию проблемы (сеть/авторизация/сервер), а разработчик — детали в консоли.

| # | Подзадача | Файлы/компоненты | Зависит от | Checkpoint |
|---|-----------|-------------------|------------|------------|
| 3.1 | В `packages/webapp/src/lib/telegram.ts` — в функции `initWebApp()` добавить `console.log` с диагностикой: есть ли `window.Telegram`, есть ли `WebApp`, есть ли `initData` (непустая строка), есть ли `user` в `initDataUnsafe`. Не логировать сам initData (секрет). | `packages/webapp/src/lib/telegram.ts` | — | При открытии Mini App в консоли видно состояние Telegram SDK |
| 3.2 | В `packages/webapp/src/api/client.ts` — в функции `request()` добавить `console.error` при ошибке: (a) при `fetch` failure (network error) — `console.error('Network error:', path, err)`, (b) при HTTP error — `console.error('API error:', res.status, path, body)`. | `packages/webapp/src/api/client.ts` | — | При сбое запроса — в консоли видны статус, путь, тело ответа |
| 3.3 | В `packages/webapp/src/hooks/useAuth.ts` — в `.catch()` проверять тип ошибки: если `ApiError` — сохранять статус-код и сообщение в `error`. Добавить `console.error('Auth failed:', err)`. | `packages/webapp/src/hooks/useAuth.ts` | 3.2 | При ошибке авторизации — в `error` хранится статус + сообщение, в консоли — детали |
| 3.4 | В `packages/webapp/src/pages/TaskCatalog.tsx` — заменить `.catch(() => setTasks([]))` на `.catch((err) => { console.error('Failed to load tasks:', err); setError(err); })`. Добавить состояние `error` и отображение ошибки в UI (текст с категорией). | `packages/webapp/src/pages/TaskCatalog.tsx` | 3.2 | При ошибке загрузки заданий — ошибка видна в UI, а не пустой список |
| 3.5 | В `packages/webapp/src/app.tsx` — изменить блок отображения ошибки: вместо глухого `t('common.error')` показывать категорию ошибки. Если `error` содержит статус-код: 401 → «Ошибка авторизации», 500 → «Ошибка сервера», иначе → «Ошибка сети». Показывать статус-код и краткое сообщение. | `packages/webapp/src/app.tsx` | 3.3 | При ошибке TMA — вместо «An error occurred» видна категория (401/500/network) |
| 3.6 | Создать компонент `ErrorBoundary` для Preact (class component с `componentDidCatch`) — обёртка для App, ловит ошибки рендера, логирует `console.error`, отображает fallback с error.message. Обернуть `<App />` в `index.tsx`. | `packages/webapp/src/components/ErrorBoundary.tsx`, `packages/webapp/src/index.tsx` | — | Ошибка рендера не крашит приложение, отображается fallback |

**Definition of done этапа:** При любой ошибке Mini App — пользователь видит категорию проблемы, разработчик — детали в серверных логах (через API).

---

## 🔗 ГРАФ ЗАВИСИМОСТЕЙ

```
Этап 1 (seed)          Этап 2 (логи API)       Этап 3 (логи фронтенд)
  1.1 → 1.2 → 1.3       2.1                      3.1
                         2.2                      3.2 → 3.3
                         2.3                      3.2 → 3.4
                         2.4                      3.3 → 3.5
                                                  3.6

↑ ВСЕ ТРИ ЭТАПА ПАРАЛЛЕЛЬНЫ (нет зависимостей между ними)
```

---

## ⚠️ РИСКИ ПЛАНА

| Риск | На каком шаге | Влияние | Митигация |
|------|---------------|---------|-----------|
| Seed дублирует данные при повторном запуске | 1.1 | Среднее | `onConflictDoNothing` по `tasks_type_idx` (уникальный индекс на `type`) |
| Seed ломается при добавлении нового типа в `taskTypeEnum`, но без миграции | 1.1 | Среднее | Seed генерируется из `taskRegistry` — если тип добавлен в enum и registry, seed подхватит. Если только в registry — Drizzle выкинет ошибку на вставку, что правильно |
| `validateInitData` возвращает `null` — при рефакторе на гранулярную причину можно сломать auth | 2.1 | Высокое | Не менять сигнатуру публичного API. Добавить приватную функцию `validateInitDataWithReason()` для логирования, оставить `validateInitData` как обёртку |
| `console.error` на фронте не виден в Telegram без devtools | 3.1–3.4 | Среднее | Критичные ошибки дублируются в UI (этап 3.5). Для дебага — серверные логи (этап 2) покрывают основные случаи |
| ErrorBoundary (class component) в Preact: может работать не так, как в React | 3.6 | Низкое | Preact поддерживает `componentDidCatch` — проверить в документации Preact |

---

## 🛡️ СТРАТЕГИЯ БЕЗОПАСНОСТИ

- **Seed идемпотентен** — `onConflictDoNothing` гарантирует, что повторный запуск не ломает данные.
- **Логирование не меняет бизнес-логику** — добавляются только `console.error`/`request.log.warn` перед уже существующими `reply.code()`. Поведение API не меняется.
- **Фронтенд-изменения не ломают happy path** — `console.error` добавляется в catch-блоки, UI ошибок улучшается, но при успешной загрузке ничего не меняется.
- **`validateInitData` не меняется** — вместо рефакторинга добавляется параллельная функция для логирования причины.
- **Точка отката**: каждый этап можно откатить независимо. Seed — удалить вызов из migrate.ts. Логи — убрать добавленные строки.

**Не должно быть затронуто:**
- Логика авторизации (HMAC-валидация, создание пользователя)
- Логика заданий (генерация, валидация, сессии)
- Работа подписки и ограничений
- Структура БД (никаких миграций)

---

## 📌 ДОПУЩЕНИЯ ПЛАНА

- Маппинг type→category берётся из `taskRegistry` (код), а не из гипотез постановки. **Фактический маппинг:** `schulte→attention`, `sequence_memory→memory`, `arithmetic→speed`, `stroop→attention`, `number_series→logic`, `memory_pairs→memory`, `pattern_search→logic`
- Для поля `name` в таблице `tasks` используется `nameKey` из registry (строка типа `tasks.schulte.name`) — имя локализуется на фронтенде
- Уникальный индекс `tasks_type_idx` на поле `type` — достаточен для `onConflictDoNothing`
- `migrate.ts` выполняется до `index.ts` через CMD в Dockerfile: `sh -c "node packages/api/dist/migrate.js && node packages/api/dist/index.js"` — seed можно вызвать в том же файле после миграции
- Fastify logger (`request.log`) доступен в middleware и роутах — используем его вместо `console.log` для серверных логов

---

## ❓ ОТКРЫТЫЕ ВОПРОСЫ

| Вопрос | Рабочая гипотеза |
|--------|------------------|
| Нужно ли импортировать `taskRegistry` в `seed.ts` (shared-пакет)? | Да, `@brainify/shared` уже используется в `routes/tasks.ts` — зависимость есть. В Dockerfile `packages/shared/dist` копируется в runtime-образ. |
| Достаточно ли `console.error` на фронтенде или нужно слать ошибки на сервер? | Для текущей задачи — достаточно. Серверные логи (этап 2) покрывают основные случаи. Sentry — отдельная задача. |
| Как `name` в таблице `tasks` соотносится с локализацией? | В коде `TaskCatalog` используется `t(\`tasks.${task.type}.name\`)` — значение `name` из БД не используется в UI напрямую. Но заполнить осмысленным значением (nameKey из registry) для целостности данных. |

---

## ✅ DEFINITION OF DONE (ЗАДАЧА ЦЕЛИКОМ)

1. После запуска API таблица `tasks` содержит 7 записей (по одной на каждый тип из `taskRegistry`)
2. При открытии TMA отображается каталог с 7 заданиями (не пустой список)
3. При ошибке загрузки TMA — в UI виден тип ошибки (401 «Ошибка авторизации» / 500 «Ошибка сервера» / «Ошибка сети»), а не глухое «An error occurred»
4. В логах API (`docker logs brainify-api`) видны: причины отказа авторизации, результат миграции и seed, ошибки роутов с контекстом
5. Повторный запуск API не создаёт дубликаты в `tasks` (идемпотентный seed)
6. Ошибка рендера в Mini App не крашит приложение (ErrorBoundary показывает fallback)

---

## 📦 ГОТОВО ДЛЯ ИСПОЛНИТЕЛЯ

**Порядок выполнения:** Этапы 1, 2, 3 — параллельны. Внутри каждого — по порядку номеров подзадач.

**Ограничения для Исполнителя:**
- Не менять логику авторизации (только добавлять логи)
- Не менять структуру БД (никаких миграций)
- Не менять бизнес-логику заданий
- Seed должен генерироваться из `taskRegistry`, а не быть хардкодом
- Использовать `request.log` (Fastify logger) на серверной стороне, `console.error` на клиенте
- Не логировать секреты (initData, bot token)
- `onConflictDoNothing` обязателен в seed

**Первый шаг:** Создать `packages/api/src/db/seed.ts` — функцию `seedTasks()`, которая итерирует по `Object.entries(taskRegistry)` и вставляет записи в `tasks` с `onConflictDoNothing`.
