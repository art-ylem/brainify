# ✅ ОТЧЁТ ОБ ИСПОЛНЕНИИ — Этап 6: Монетизация

**Задача:** Этап 6 — Монетизация (подписка, лимиты, платежи, Stars, реферальные бонусы, UI)

**Статус:** Выполнено

## 📝 ВЫПОЛНЕННЫЕ ШАГИ

| # | Шаг | Статус | Файлы |
|---|-----|--------|-------|
| 6.1 | Сервис подписки | ✅ | `packages/api/src/services/subscription.ts` |
| 6.2 | Лимиты free-тарифа (Redis) | ✅ | `packages/api/src/db/redis.ts`, `packages/api/src/middleware/subscription.ts`, `packages/api/src/routes/tasks.ts`, `packages/api/src/routes/duels.ts` |
| 6.3 | Telegram Payments (bot) | ✅ | `packages/bot/src/payments/payments.ts`, `packages/bot/src/index.ts` |
| 6.4 | Telegram Stars | ✅ | `packages/bot/src/payments/stars.ts`, `packages/bot/src/index.ts` |
| 6.5 | Реферальные бонусы | ✅ | `packages/api/src/services/referral.ts`, `packages/api/src/routes/users.ts`, `packages/webapp/src/api/client.ts` |
| 6.6 | UI подписки (webapp) | ✅ | `packages/webapp/src/pages/Profile.tsx`, `packages/webapp/src/types/telegram.d.ts`, `packages/webapp/tsconfig.json` |
| 6.7 | Интеграция + проверка | ✅ | `packages/api/src/routes/subscription.ts`, `packages/api/src/index.ts` |

## 📂 ДЕТАЛИ ИЗМЕНЕНИЙ

### Шаг 6.1: Сервис подписки
- **Файл:** `packages/api/src/services/subscription.ts`
- **Что изменено:** Создан сервис с 3 функциями: `getSubscriptionInfo` (определение статуса, авто-даунгрейд expired trial), `activateSubscription` (запись оплаты + обновление статуса), `extendTrial` (продление trial на N дней)
- **Зачем:** Центральная бизнес-логика подписки, используется всеми другими компонентами
- **Риск регрессии:** Низкий

### Шаг 6.2: Лимиты free-тарифа (Redis)
- **Файл:** `packages/api/src/db/redis.ts`
- **Что изменено:** Создан Redis-клиент (ioredis) через `REDIS_URL`
- **Файл:** `packages/api/src/middleware/subscription.ts`
- **Что изменено:** 3 middleware-функции: `checkTaskLimit` (3 задания/день для free), `checkPremiumAccess` (блок PvP для free), `incrementDailyTaskCount` (инкремент счётчика в Redis)
- **Файл:** `packages/api/src/routes/tasks.ts`
- **Что изменено:** Добавлен `checkTaskLimit` в preHandler POST `/api/tasks/:id/start`, вызов `incrementDailyTaskCount` после создания сессии
- **Файл:** `packages/api/src/routes/duels.ts`
- **Что изменено:** Добавлен `checkPremiumAccess` в preHandler POST `/api/duels`
- **Зачем:** Ограничение бесплатных пользователей для мотивации покупки подписки
- **Риск регрессии:** Средний — затрагивает маршруты tasks и duels; если Redis недоступен, задания будут блокироваться

### Шаг 6.3: Telegram Payments (bot)
- **Файл:** `packages/bot/src/payments/payments.ts`
- **Что изменено:** Создана функция `registerPayments(bot)`: команда `/subscribe` отправляет invoice, обработка `pre_checkout_query` (автоответ true), обработка `successful_payment` — HTTP-вызов внутреннего API для активации
- **Файл:** `packages/bot/src/index.ts`
- **Что изменено:** Импорт и регистрация `registerPayments`, добавлена команда `subscribe` в список
- **Зачем:** Оплата через Telegram Payments API (банковская карта)
- **Риск регрессии:** Низкий — новый функционал, не затрагивает существующий

### Шаг 6.4: Telegram Stars
- **Файл:** `packages/bot/src/payments/stars.ts`
- **Что изменено:** Создана функция `registerStarsPayments(bot)`: команда `/subscribe_stars` отправляет invoice с currency `XTR` и пустым `provider_token`, обработка `successful_payment` с проверкой `currency === 'XTR'`
- **Файл:** `packages/bot/src/index.ts`
- **Что изменено:** Импорт и регистрация `registerStarsPayments`
- **Зачем:** Альтернативный способ оплаты через Telegram Stars
- **Риск регрессии:** Низкий

### Шаг 6.5: Реферальные бонусы
- **Файл:** `packages/api/src/services/referral.ts`
- **Что изменено:** Создана функция `processReferral(referrerTelegramId, referredUserId)`: находит реферера, проверяет дубликаты, создаёт запись в `referrals`, вызывает `extendTrial(+3 дня)` для обоих
- **Файл:** `packages/api/src/routes/users.ts`
- **Что изменено:** При создании нового пользователя в `/api/user/me` проверяется заголовок `X-Referrer` (формат `ref_<telegramId>`), вызывается `processReferral`
- **Файл:** `packages/webapp/src/api/client.ts`
- **Что изменено:** `getMe()` передаёт `start_param` из Telegram WebApp SDK в заголовке `X-Referrer`
- **Зачем:** Реферальная механика: +3 дня trial обоим при приглашении друга
- **Риск регрессии:** Низкий — обработка catch-ирована, ошибка реферала не блокирует регистрацию

### Шаг 6.6: UI подписки
- **Файл:** `packages/webapp/src/pages/Profile.tsx`
- **Что изменено:** Добавлен блок «💎 Подписка» в Profile: показывает текущий статус (active/trial/free), для trial — дату окончания, для free — кнопку «Оформить Premium» (открывает бота через `openTelegramLink`)
- **Файл:** `packages/webapp/src/types/telegram.d.ts`
- **Что изменено:** Добавлен метод `openTelegramLink(url: string)` в интерфейс `TelegramWebApp`
- **Файл:** `packages/webapp/tsconfig.json`
- **Что изменено:** Добавлен `"types": ["vite/client"]` для поддержки `import.meta.env`
- **Зачем:** Пользователь видит статус подписки и может перейти к оплате
- **Риск регрессии:** Низкий

### Шаг 6.7: Интеграция + проверка
- **Файл:** `packages/api/src/routes/subscription.ts`
- **Что изменено:** Создан маршрутный модуль с 2 эндпоинтами: `POST /api/internal/activate-subscription` (внутренний для бота, защищён `X-Internal-Secret`), `GET /api/subscription` (статус для webapp)
- **Файл:** `packages/api/src/index.ts`
- **Что изменено:** Зарегистрирован `internalRoutes` (10-й маршрутный модуль)
- **Исправлены ошибки типов:** BigInt conversion для `telegramId` в `subscription.ts` и `referral.ts`
- **Зачем:** Связка bot↔API через внутренний HTTP-вызов
- **Риск регрессии:** Низкий

## ⚠️ ОТКЛОНЕНИЯ ОТ ПЛАНА

- **Связь bot↔API:** Вместо прямого доступа бота к БД (что потребовало бы drizzle-orm зависимости в bot) — реализован внутренний HTTP-эндпоинт `/api/internal/activate-subscription` с аутентификацией через `X-Internal-Secret`. Более чистое разделение ответственности.
- **UI подписки:** Встроен в Profile (а не отдельная страница), поскольку это естественное место для просмотра статуса и перехода к оплате.
- **Команда subscribe_stars:** Добавлена отдельная команда для Stars (а не переключатель в одном invoice), чтобы Telegram корректно обрабатывал разные `provider_token`.

## 🚧 НЕРЕШЁННЫЕ ВОПРОСЫ

- `PAYMENT_PROVIDER_TOKEN` — нужен реальный токен от платёжного провайдера (BotFather → /mybots → Payments)
- `INTERNAL_API_SECRET` — нужно установить env-переменную в обоих сервисах (bot + API)
- `REDIS_URL` — нужен Redis для работы лимитов (уже в docker-compose)
- `VITE_BOT_USERNAME` — env-переменная для кнопки «Оформить Premium» (fallback: BrainifyBot)

## 🔍 РИСКИ РЕГРЕССИИ

- **Redis недоступен:** middleware `checkTaskLimit` / `checkPremiumAccess` будут выбрасывать ошибку → задания/дуэли не будут работать для всех пользователей. Рекомендуется добавить graceful degradation при недоступности Redis.
- **Stars middleware порядок:** `registerStarsPayments` проверяет `currency === 'XTR'` и вызывает `next()` для не-Stars платежей — порядок регистрации важен (Stars перед обычными Payments, но grammY поддерживает множественные обработчики `on('message:successful_payment')`).

## 📦 ГОТОВО ДЛЯ РЕВЬЮВЕРА

**Список изменённых/созданных файлов:**
- `packages/api/src/services/subscription.ts` — сервис подписки (3 функции)
- `packages/api/src/services/referral.ts` — реферальный сервис (processReferral)
- `packages/api/src/db/redis.ts` — Redis-клиент (ioredis)
- `packages/api/src/middleware/subscription.ts` — middleware лимитов (3 функции)
- `packages/api/src/routes/subscription.ts` — маршруты подписки (internal + public)
- `packages/api/src/routes/tasks.ts` — добавлен checkTaskLimit + incrementDailyTaskCount
- `packages/api/src/routes/duels.ts` — добавлен checkPremiumAccess
- `packages/api/src/routes/users.ts` — интеграция реферальных бонусов при регистрации
- `packages/api/src/index.ts` — регистрация маршрутов подписки
- `packages/bot/src/payments/payments.ts` — Telegram Payments обработчик
- `packages/bot/src/payments/stars.ts` — Telegram Stars обработчик
- `packages/bot/src/index.ts` — регистрация платёжных обработчиков + команда subscribe
- `packages/webapp/src/api/client.ts` — передача start_param для рефералов
- `packages/webapp/src/pages/Profile.tsx` — UI блок подписки
- `packages/webapp/src/types/telegram.d.ts` — добавлен openTelegramLink
- `packages/webapp/tsconfig.json` — добавлен vite/client types

**На что обратить внимание при ревью:**
- Безопасность: внутренний API защищён `X-Internal-Secret`, проверить что секрет достаточно сложный
- Порядок middleware в bot: Stars handler вызывает `next()`, обычный — нет
- Redis graceful degradation отсутствует — fallback при недоступности Redis
- BigInt conversions в subscription.ts и referral.ts

**Верификация:**
- TypeScript: 4/4 пакета ✅ (api, bot, shared, webapp)
- Тесты: 19/19 ✅
- Vite build: 14.52KB gzip ✅
