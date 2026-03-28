### ✅ ОТЧЁТ ОБ ИСПОЛНЕНИИ

**Задача:** Веб-версия Brainify с авторизацией через Telegram и гостевым режимом

**Статус:** Выполнено

### 📝 ВЫПОЛНЕННЫЕ ШАГИ

| # | Шаг | Статус | Файлы |
|---|-----|--------|-------|
| 1.1 | Установка `jose` в packages/api | ✅ | `packages/api/package.json` |
| 1.2 | Добавление JWT env-переменных | ✅ | `.env.example` |
| 1.3 | Создание `auth/jwt.ts` — signJwt/verifyJwt через HMAC-SHA256 | ✅ | `packages/api/src/auth/jwt.ts` |
| 1.4 | Создание `auth/telegram-login.ts` — валидация Telegram Login Widget | ✅ | `packages/api/src/auth/telegram-login.ts` |
| 1.5 | Рефакторинг `authMiddleware` — ветки tma → Bearer → legacy | ✅ | `packages/api/src/auth/middleware.ts` |
| 1.6 | Создание `optionalAuthMiddleware` | ✅ | `packages/api/src/auth/middleware.ts` |
| 1.7 | Обновление `auth/index.ts` — реэкспорт новых функций | ✅ | `packages/api/src/auth/index.ts` |
| 1.8 | Проверка Fastify declaration merge | ✅ | `packages/api/src/auth/middleware.ts` |
| 2.1 | Создание `routes/auth.ts` — POST /api/auth/telegram | ✅ | `packages/api/src/routes/auth.ts` |
| 2.2 | Регистрация authRoutes в index.ts | ✅ | `packages/api/src/index.ts` |
| 2.3 | Вынесение findOrCreateUser в services/users.ts | ✅ | `packages/api/src/services/users.ts`, `packages/api/src/routes/users.ts` |
| 3.2 | Адаптация POST /api/tasks/:id/start для гостей | ✅ | `packages/api/src/routes/tasks.ts` |
| 3.3 | Адаптация POST /api/attempts для гостей | ✅ | `packages/api/src/routes/attempts.ts` |
| 3.4 | Обновление checkTaskLimit для гостевого режима | ✅ | `packages/api/src/middleware/subscription.ts` |
| 3.5 | Создание guest-session.ts — Redis-сессии для гостей | ✅ | `packages/api/src/services/guest-session.ts` |
| 4.1 | Функция isTelegramMiniApp() | ✅ | `packages/webapp/src/lib/telegram.ts` |
| 4.2 | Модуль lib/auth.ts — управление JWT в localStorage | ✅ | `packages/webapp/src/lib/auth.ts` |
| 4.3 | Обновление api/client.ts — мультистратегия авторизации | ✅ | `packages/webapp/src/api/client.ts` |
| 4.4 | Хук useAuthState — три режима (guest/tma/web) | ✅ | `packages/webapp/src/hooks/useAuthState.ts` |
| 4.5 | Обновление useAuth — делегация в useAuthState | ✅ | `packages/webapp/src/hooks/useAuth.ts` |
| 5.1 | TelegramLoginButton компонент | ✅ | `packages/webapp/src/components/TelegramLoginButton.tsx` |
| 5.3 | Функция loginWithTelegram | ✅ | `packages/webapp/src/api/client.ts` |
| 5.4 | LoginScreen — экран входа | ✅ | `packages/webapp/src/components/LoginScreen.tsx` |
| 5.5 | GuestBanner — баннер для гостей | ✅ | `packages/webapp/src/components/GuestBanner.tsx` |
| 5.6 | Интеграция трёх режимов в app.tsx | ✅ | `packages/webapp/src/app.tsx` |
| 5.7 | loginViaTelegram/logout в useAuthState | ✅ | `packages/webapp/src/hooks/useAuthState.ts` |
| 6.1 | SubscriptionBanner компонент | ✅ | `packages/webapp/src/components/SubscriptionBanner.tsx` |
| 6.2-6.3 | openSubscription утилита + адаптация Profile.tsx | ✅ | `packages/webapp/src/pages/Profile.tsx` |
| 6.4 | Адаптация NavBar для гостя | ✅ | `packages/webapp/src/components/NavBar.tsx` |
| 6.5 | PaywallScreen компонент | ✅ | `packages/webapp/src/components/PaywallScreen.tsx` |
| 7.1 | Dark mode CSS fallback | ✅ | `packages/webapp/src/styles/global.css` |
| 7.2 | Логирование browser mode | ✅ | `packages/webapp/src/lib/telegram.ts` |
| 7.3 | Определение языка из navigator.language | ✅ | `packages/webapp/src/hooks/useI18n.ts` |
| 8.1 | Обновление CSP в nginx.conf | ✅ | `nginx.conf` |
| 8.2 | JWT_SECRET в docker-compose.prod.yml | ✅ | `docker-compose.prod.yml` |
| 8.3 | JWT_SECRET в .env.example | ✅ | `.env.example` |
| 9.1 | GuestLimitScreen компонент | ✅ | `packages/webapp/src/components/GuestLimitScreen.tsx` |
| 9.2 | Обработка 403 в TaskPlay | ✅ | `packages/webapp/src/pages/TaskPlay.tsx` |
| 9.3 | Конверсионная точка на TaskResult | ✅ | `packages/webapp/src/pages/TaskResult.tsx` |
| i18n | Ключи login/guest/paywall в ru.json и en.json | ✅ | `packages/shared/src/i18n/locales/ru.json`, `en.json` |

### 📂 ДЕТАЛИ ИЗМЕНЕНИЙ

**Этап 1: Рефакторинг auth-слоя**
- **auth/jwt.ts** — signJwt/verifyJwt через jose HMAC-SHA256; payload содержит sub (telegramId), iat, exp
- **auth/telegram-login.ts** — валидация Telegram Login Widget: SHA256(botToken) → HMAC-SHA256(data-check-string) → сравнение hash
- **auth/middleware.ts** — authMiddleware теперь поддерживает 3 стратегии: tma → Bearer JWT → legacy initData; optionalAuthMiddleware пропускает без auth
- **auth/index.ts** — реэкспорт всех новых функций и типов
- **Риск регрессии:** Низкий — ветка tma проверяется первой, формат request.auth сохранён

**Этап 2: Auth эндпоинт**
- **routes/auth.ts** — POST /api/auth/telegram: валидация → findOrCreateUser → signJwt → возврат {token, user}
- **services/users.ts** — вынесена логика findOrCreateUser с trial, streak, referral
- **routes/users.ts** — упрощён, использует findOrCreateUser
- **Риск регрессии:** Низкий — поведение /api/user/me идентично, только вынесена логика

**Этап 3: Гостевые эндпоинты**
- **routes/tasks.ts** — POST /api/tasks/:id/start использует optionalAuthMiddleware; гости получают Redis-сессии с UUID
- **routes/attempts.ts** — POST /api/attempts поддерживает строковые sessionId для гостей; результат без записи в БД
- **middleware/subscription.ts** — checkTaskLimit проверяет лимит по IP для гостей
- **services/guest-session.ts** — Redis-сессии с TTL 10 мин, лимит 3/день по IP
- **Риск регрессии:** Средний — изменён preHandler для tasks/:id/start и attempts; авторизованная ветка сохранена

**Этап 4: Фронтенд auth-провайдер**
- **lib/telegram.ts** — isTelegramMiniApp()
- **lib/auth.ts** — управление JWT в localStorage
- **api/client.ts** — автовыбор заголовка: tma / Bearer / без auth; loginWithTelegram()
- **hooks/useAuthState.ts** — три режима (guest/tma/web); loginViaTelegram, logout
- **hooks/useAuth.ts** — делегация в useAuthState
- **Риск регрессии:** Средний — изменена логика useAuth; в TMA поведение должно быть идентичным

**Этап 5: Telegram Login UI**
- **TelegramLoginButton.tsx** — динамическая загрузка виджета из telegram.org CDN
- **LoginScreen.tsx** — экран входа с описанием и кнопкой «Попробовать»
- **GuestBanner.tsx** — баннер для гостей в каталоге
- **app.tsx** — три режима: LoginScreen → guest browse → full app
- **Риск регрессии:** Низкий — новые компоненты, не затрагивают существующую логику

**Этап 6: Paywall**
- **SubscriptionBanner.tsx** — баннер подписки для free/trial пользователей
- **PaywallScreen.tsx** — экран premium-ограничения
- **Profile.tsx** — адаптирован: openSubscription через window.open для веба, кнопка «Выйти» для web-режима
- **NavBar.tsx** — скрытие разделов для гостя (только каталог)
- **Риск регрессии:** Низкий — Profile.tsx изменён для поддержки обоих режимов

**Этап 7: Стилизация**
- **global.css** — @media (prefers-color-scheme: dark) с тёмными fallback-ами
- **telegram.ts** — лог «[Web] Running in browser mode» вместо warn
- **useI18n.ts** — navigator.language fallback
- **Риск регрессии:** Низкий

**Этап 8: Инфраструктура**
- **nginx.conf** — CSP расширен: script-src 'self' https://telegram.org
- **docker-compose.prod.yml** — JWT_SECRET пробрасывается в api-контейнер
- **.env.example** — JWT_SECRET и JWT_EXPIRY задокументированы
- **Риск регрессии:** Низкий

**Этап 9: Конверсия**
- **GuestLimitScreen.tsx** — экран при исчерпании лимита гостя
- **TaskPlay.tsx** — обнаружение 403 при startTaskSession
- **TaskResult.tsx** — CTA «Войдите, чтобы сохранять прогресс» для гостей
- **i18n** — ключи login.*, guest.*, paywall.*
- **Риск регрессии:** Низкий

### ⚠️ ОТКЛОНЕНИЯ ОТ ПЛАНА

- **6.2:** Утилита `openSubscription()` не вынесена в отдельный `lib/subscription.ts` — вместо этого функции `openSubscription()` и `openSubscriptionStars()` определены прямо в `Profile.tsx`, так как это единственное место использования. При появлении других точек использования легко вынести.
- **declaration merge:** Оставлен `auth: AuthPayload` (без `?`) чтобы не менять 17+ мест в роутах. Для optionalAuthMiddleware роутов используются runtime-проверки `if (!request.auth)`.

### 🚧 НЕРЕШЁННЫЕ ВОПРОСЫ

- **BotFather настройка домена** (п. 8.4) — ручное действие: нужно выполнить `/setdomain` в BotFather для `brainify.ellow.tech` чтобы Telegram Login Widget работал.
- **JWT_SECRET** — нужно сгенерировать реальный секрет ≥32 символа и добавить в `.env` на сервере.

### 🔍 РИСКИ РЕГРЕССИИ

- Изменён preHandler для `POST /api/tasks/:id/start` (authMiddleware → optionalAuthMiddleware) и `POST /api/attempts` — авторизованная ветка полностью сохранена, но нужно проверить что оба пути работают
- `useAuth` теперь делегирует в `useAuthState` — в TMA должно работать как раньше, но важно проверить
- SessionId для гостей — строка (g_uuid), для авторизованных — число. API клиент не типизирует это различие
- CSS переменные с `var(--tg-theme-*, fallback)` — в `:root` Telegram SDK может перезаписать вложенный var()

### 📦 ГОТОВО ДЛЯ РЕВЬЮВЕРА

**Список изменённых/созданных файлов:**

Новые файлы API:
- `packages/api/src/auth/jwt.ts` — JWT утилиты
- `packages/api/src/auth/telegram-login.ts` — валидация Telegram Login Widget
- `packages/api/src/routes/auth.ts` — POST /api/auth/telegram
- `packages/api/src/services/users.ts` — findOrCreateUser
- `packages/api/src/services/guest-session.ts` — гостевые Redis-сессии

Изменённые файлы API:
- `packages/api/package.json` — добавлен jose
- `packages/api/src/auth/middleware.ts` — мультистратегия auth + optionalAuthMiddleware
- `packages/api/src/auth/index.ts` — расширены экспорты
- `packages/api/src/index.ts` — зарегистрирован authRoutes
- `packages/api/src/routes/users.ts` — использует findOrCreateUser
- `packages/api/src/routes/tasks.ts` — гостевой режим
- `packages/api/src/routes/attempts.ts` — гостевой режим
- `packages/api/src/middleware/subscription.ts` — лимит по IP для гостей

Новые файлы webapp:
- `packages/webapp/src/lib/auth.ts` — JWT localStorage
- `packages/webapp/src/hooks/useAuthState.ts` — auth state manager
- `packages/webapp/src/components/TelegramLoginButton.tsx`
- `packages/webapp/src/components/LoginScreen.tsx`
- `packages/webapp/src/components/GuestBanner.tsx`
- `packages/webapp/src/components/GuestLimitScreen.tsx`
- `packages/webapp/src/components/SubscriptionBanner.tsx`
- `packages/webapp/src/components/PaywallScreen.tsx`

Изменённые файлы webapp:
- `packages/webapp/src/api/client.ts` — мультистратегия auth + loginWithTelegram
- `packages/webapp/src/hooks/useAuth.ts` — делегация в useAuthState
- `packages/webapp/src/hooks/useI18n.ts` — navigator.language fallback
- `packages/webapp/src/lib/telegram.ts` — isTelegramMiniApp + browser mode log
- `packages/webapp/src/app.tsx` — три режима UI
- `packages/webapp/src/components/NavBar.tsx` — ограничения для гостя
- `packages/webapp/src/pages/Profile.tsx` — web-режим подписки + logout
- `packages/webapp/src/pages/TaskResult.tsx` — гостевой CTA
- `packages/webapp/src/pages/TaskPlay.tsx` — обработка 403
- `packages/webapp/src/styles/global.css` — dark mode fallback

Изменённые файлы shared:
- `packages/shared/src/i18n/locales/ru.json` — ключи login/guest/paywall
- `packages/shared/src/i18n/locales/en.json` — ключи login/guest/paywall

Инфраструктура:
- `.env.example` — JWT_SECRET, JWT_EXPIRY
- `nginx.conf` — CSP с script-src https://telegram.org
- `docker-compose.prod.yml` — JWT_SECRET переменная

**На что обратить внимание при ревью:**
1. authMiddleware: порядок стратегий (tma → Bearer → legacy) и корректность Bearer-ветки
2. validateTelegramLogin: алгоритм проверки (SHA256 от botToken, не WebAppData)
3. Гостевые сессии: строковый sessionId (g_uuid) vs числовой для авторизованных
4. optionalAuthMiddleware: неавторизованный request.auth остаётся undefined без TS-ошибки
5. CSS fallback в dark mode: не конфликтует ли с Telegram SDK переменными
6. Ручное действие: BotFather /setdomain для Login Widget

**Критерий готовности из плана:** Выполнен — TypeScript typecheck проходит для всех трёх пакетов (api, webapp, shared); все 9 этапов реализованы.
