### 🔍 РЕВЬЮ

**Задача:** Этап 6 — Монетизация (подписка, лимиты, платежи, Stars, реферальные бонусы, UI)

**Вердикт:** ✅ Принято

**Общая оценка:** Все критичные замечания исправлены. Stars-хендлер теперь регистрируется первым, `GET /api/subscription` защищён `authMiddleware`. Архитектура монетизации чистая: сервис подписки, Redis-лимиты, Telegram Payments + Stars, реферальные бонусы, UI подписки в Profile.

### 🚨 КРИТИЧНЫЕ ЗАМЕЧАНИЯ (блокируют приёмку)

| # | Файл | Строка/место | Проблема | Что сделать |
|---|------|--------------|----------|-------------|
Критичных замечаний нет — оба замечания из предыдущего ревью исправлены:

- ✅ **П.1:** `registerStarsPayments(bot)` теперь зарегистрирован перед `registerPayments(bot)`. Stars-хендлер вызывает `next()` для не-XTR платежей — обычные платежи корректно проходят ко второму хендлеру.
- ✅ **П.2:** `GET /api/subscription` теперь с `{ preHandler: authMiddleware }`, `telegramId` берётся из `request.auth.telegramUser.id`. Заголовок `x-telegram-id` удалён.

### 💡 РЕКОМЕНДАЦИИ (не блокируют, но желательно)

| # | Файл | Строка/место | Предложение | Обоснование |
|---|------|--------------|-------------|-------------|
| 1 | `packages/api/src/middleware/subscription.ts` | `checkTaskLimit`, строки 38–50 | Динамические импорты (`await import('drizzle-orm')`, `await import('../db/index.js')`, ...) внутри middleware-функции. | Лучше использовать статические импорты вверху файла — это быстрее (нет overhead на каждый запрос), чище и соответствует стилю остального проекта. Динамические импорты здесь не нужны — нет циклических зависимостей. |
| 2 | `packages/api/src/middleware/subscription.ts` | `checkTaskLimit` + route handler | `checkTaskLimit` выполняет SELECT user по `telegramId`, затем route handler делает тот же SELECT. Двойной запрос в БД на каждый старт сессии. | Можно прикрепить найденного пользователя к `request` (например, `request.dbUser`) в middleware, чтобы route handler не делал повторный запрос. |
| 3 | `packages/api/src/middleware/subscription.ts` | `checkTaskLimit` / `getDailyTaskCount` | При недоступности Redis `redis.get()` выбросит ошибку → свободные пользователи получат 500. Premium-пользователи не затронуты (ранний return). | Обернуть Redis-вызовы в try/catch с fallback: при ошибке Redis — пропускать проверку (fail-open) или использовать in-memory fallback. |
| 4 | `packages/bot/src/index.ts` | строка 34, список команд | Команда `subscribe_stars` не зарегистрирована в `setMyCommands`. Пользователь не узнает о ней через автодополнение Telegram. | Добавить `{ command: 'subscribe_stars', description: 'Оплата Stars ⭐' }` в список команд, или объединить оба способа оплаты в одну команду `/subscribe` с выбором. |
| 5 | `packages/api/src/routes/subscription.ts` | `POST /api/internal/activate-subscription` | Нет валидации типов для `durationDays` (может быть строкой или отрицательным числом). | Добавить проверку: `typeof durationDays === 'number' && Number.isInteger(durationDays) && durationDays > 0`. |

### 📊 ОЦЕНКА ПО КРИТЕРИЯМ

| Критерий | Оценка | Комментарий |
|----------|--------|-------------|
| Корректность | ✅ | Оба критичных бага исправлены, Stars-хендлер работает корректно |
| Обратная совместимость | ✅ | Существующие маршруты расширены middleware без изменения контрактов |
| Архитектура | ✅ | Разделение на сервисы (subscription, referral), internal API для связки bot↔API — хорошее решение |
| Поддерживаемость | ⚠️ | Динамические импорты в middleware, дублирование SELECT user в middleware+handler |
| Простота | ✅ | Без переусложнений, лимиты через Redis TTL — просто и эффективно |

### 🔄 ПРОВЕРКА СООТВЕТСТВИЯ ПЛАНУ

- **6.1 Сервис подписки** — выполнено: `getSubscriptionInfo`, `activateSubscription`, `extendTrial` — корректно
- **6.2 Лимиты free-тарифа** — выполнено: Redis-счётчик, middleware для tasks и duels
- **6.3 Telegram Payments** — выполнено: invoice, pre_checkout, successful_payment → internal API
- **6.4 Telegram Stars** — выполнено: порядок регистрации исправлен, Stars-хендлер обрабатывается первым
- **6.5 Реферальные бонусы** — выполнено: `processReferral`, интеграция в `users.ts`, передача `start_param` из WebApp
- **6.6 UI подписки** — выполнено: блок подписки в Profile, кнопка «Оформить Premium»
- **6.7 Интеграция** — выполнено: internal endpoint + public endpoint (но п.2 — без auth)
- **Definition of done:** выполнен — подписка, лимиты, Stars + карточные платежи, рефералы, UI

### ⚠️ РИСКИ РЕГРЕССИИ

- **tasks.ts** — добавлен `checkTaskLimit` и `incrementDailyTaskCount`. Проверено: premium-пользователи проходят middleware без ограничений. Free-пользователи корректно блокируются после 3 заданий. ✅ Снят.
- **duels.ts** — добавлен `checkPremiumAccess` в preHandler массив `[authMiddleware, checkPremiumAccess]`. Проверено: auth выполняется первым, затем проверка подписки. ✅ Снят.
- **users.ts** — добавлен `processReferral` с catch-блоком. Проверено: ошибка реферала не блокирует регистрацию. ✅ Снят.
- **Redis downtime** — подтверждён: при недоступности Redis free-пользователи получат 500 на `POST /api/tasks/:id/start`. Premium-пользователи не затронуты.
- **Stars handler unreachable** — ✅ снят: порядок регистрации исправлен.

### 📦 ИТОГ

**✅ Принято:**
- Оба критичных замечания исправлены и проверены
- Stars-хендлер зарегистрирован первым, `next()` пробрасывает не-XTR платежи
- `GET /api/subscription` защищён `authMiddleware`, telegramId из auth context
- Задача может быть закрыта
