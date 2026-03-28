### 🗺️ ПЛАН ВЫПОЛНЕНИЯ

**Задача:** Веб-версия Brainify с авторизацией через Telegram и гостевым режимом

**Тип:** Новая функциональность (с рефакторингом auth-слоя)

**Стратегия:** Поэтапное расширение — сначала рефакторим auth-слой API для поддержки нескольких стратегий (не ломая текущую), затем добавляем JWT-авторизацию через Telegram Login Widget, затем адаптируем фронтенд под три режима (гость / TMA / веб-сессия), затем настраиваем инфраструктуру. На каждом этапе текущий Mini App остаётся работоспособным.

---

### 📐 ЭТАПЫ

#### Этап 1: Рефакторинг auth-слоя API — мультистратегия

**Цель этапа:** auth middleware поддерживает два способа авторизации (`tma` и `Bearer JWT`), а также может пропускать неавторизованных в «мягком» режиме. Все существующие роуты работают без изменений.

| # | Подзадача | Файлы/компоненты | Зависит от | Checkpoint |
|---|-----------|-------------------|------------|------------|
| 1.1 | Добавить зависимость `jose` (или `jsonwebtoken`) в `packages/api/package.json` для работы с JWT. Выбрать `jose` — zero-dependency, поддерживает Edge, ESM-native | `packages/api/package.json` | — | Зависимость установлена, `npm install` без ошибок |
| 1.2 | Добавить env-переменные `JWT_SECRET` (секрет для подписи/верификации JWT, ≥32 символа) и `JWT_EXPIRY` (время жизни access-токена, по умолчанию `1h`) в `.env.example` | `.env.example`, `.env` | — | Переменные описаны в `.env.example` |
| 1.3 | Создать файл `packages/api/src/auth/jwt.ts` — утилиты для генерации и верификации JWT: `signJwt(payload: { telegramId: number; ... }): Promise<string>`, `verifyJwt(token: string): Promise<JwtPayload \| null>`. Payload JWT должен содержать `sub` (telegramId), `iat`, `exp`. Использовать `jose` для подписи через HMAC-SHA256 с `JWT_SECRET` | `packages/api/src/auth/jwt.ts` (новый файл) | 1.1, 1.2 | Функции экспортируются, typecheck проходит |
| 1.4 | Создать файл `packages/api/src/auth/telegram-login.ts` — валидация данных от Telegram Login Widget. Отдельная функция `validateTelegramLogin(data: TelegramLoginData, botToken: string): boolean`. Алгоритм: SHA256 от `botToken` → HMAC-SHA256 от data-check-string → сравнение hash. Это НЕ то же самое, что initData (другой формат, нет `WebAppData`-ключа) | `packages/api/src/auth/telegram-login.ts` (новый файл) | — | Функция экспортируется, typecheck проходит |
| 1.5 | Рефакторинг `packages/api/src/auth/middleware.ts`: добавить **вторую ветку** в `authMiddleware` — если заголовок `Authorization` начинается с `Bearer `, то вызывать `verifyJwt`, искать пользователя по `telegramId` из payload и устанавливать `request.auth` того же формата `AuthPayload`. Текущая ветка `tma` остаётся без изменений. Порядок проверки: `tma ` → `Bearer ` → 401 | `packages/api/src/auth/middleware.ts` | 1.3 | Оба формата авторизации работают; формат `request.auth` одинаковый для обоих путей |
| 1.6 | Создать новый middleware `optionalAuthMiddleware` в `packages/api/src/auth/middleware.ts` — пытается авторизовать (tma / Bearer), но при неудаче **не возвращает 401**, а просто оставляет `request.auth` как `undefined`. Для гостевых эндпоинтов | `packages/api/src/auth/middleware.ts` | 1.5 | Middleware экспортируется, гостевой запрос без заголовка проходит без ошибки |
| 1.7 | Обновить `packages/api/src/auth/index.ts` — реэкспорт новых функций: `optionalAuthMiddleware`, типы `TelegramLoginData` | `packages/api/src/auth/index.ts` | 1.4, 1.6 | Все экспорты доступны |
| 1.8 | Обновить Fastify declaration merge — `request.auth` может быть `AuthPayload | undefined` (для optional auth). Проверить, что все роуты с `authMiddleware` (обязательным) продолжают работать без TypeScript-ошибок — `request.auth` гарантированно заполнен после обязательного middleware | `packages/api/src/auth/middleware.ts` | 1.6 | `npm run typecheck` для `packages/api` проходит |

**Definition of done этапа:** `authMiddleware` принимает оба формата (`tma`, `Bearer`); `optionalAuthMiddleware` пропускает неавторизованных; все существующие роуты (tasks, attempts, progress, leaderboard, duels, friends, achievements, subscription, users, share, notifications) работают без изменений; typecheck пакета api проходит.

---

#### Этап 2: Эндпоинт авторизации через Telegram Login Widget

**Цель этапа:** API имеет эндпоинт `POST /api/auth/telegram`, который принимает данные от Telegram Login Widget, валидирует их, создаёт/находит пользователя и возвращает JWT.

| # | Подзадача | Файлы/компоненты | Зависит от | Checkpoint |
|---|-----------|-------------------|------------|------------|
| 2.1 | Создать файл `packages/api/src/routes/auth.ts` с роутом `POST /api/auth/telegram`. Принимает тело: `{ id, first_name, last_name?, username?, photo_url?, auth_date, hash }`. Валидирует через `validateTelegramLogin`. При невалидных данных — 401. При валидных — ищет пользователя по `telegramId`; если нет — создаёт (аналогично логике из `routes/users.ts`: trial 7 дней, streak, referral). Возвращает `{ token: <jwt>, user: <profile> }` | `packages/api/src/routes/auth.ts` (новый файл) | Этап 1 | Роут отвечает на POST, возвращает JWT при валидных данных, 401 при невалидных |
| 2.2 | Зарегистрировать `authRoutes` в `packages/api/src/index.ts` — `await app.register(authRoutes)` | `packages/api/src/index.ts` | 2.1 | Роут доступен по URL |
| 2.3 | Вынести логику «найди или создай пользователя по telegramId» из `routes/users.ts` в переиспользуемую функцию `findOrCreateUser(telegramUser, referrer?)` в `packages/api/src/services/users.ts` (новый файл). Обновить `routes/users.ts`, чтобы вызывал эту функцию, а не дублировал логику. Обновить `routes/auth.ts`, чтобы тоже вызывал `findOrCreateUser` | `packages/api/src/services/users.ts` (новый), `packages/api/src/routes/users.ts`, `packages/api/src/routes/auth.ts` | 2.1 | Логика вынесена; оба роута используют одну функцию; поведение `/api/user/me` не изменилось |

**Definition of done этапа:** `POST /api/auth/telegram` валидирует данные Telegram Login Widget, создаёт/находит пользователя, возвращает JWT. `/api/user/me` работает без изменений. Новые пользователи, пришедшие через веб, получают trial.

---

#### Этап 3: Гостевые эндпоинты API

**Цель этапа:** каталог заданий и одна-две пробные сессии доступны без авторизации.

| # | Подзадача | Файлы/компоненты | Зависит от | Checkpoint |
|---|-----------|-------------------|------------|------------|
| 3.1 | `GET /api/tasks` и `GET /api/tasks/:id` — убрать `authMiddleware` (его там нет, эти роуты уже публичные — **подтверждено при анализе**). Только проверить, что они реально не требуют `request.auth` (подтверждено: не обращаются к `request.auth`). Никаких изменений не нужно | `packages/api/src/routes/tasks.ts` | — | Роуты `/api/tasks` отвечают 200 без заголовка Authorization |
| 3.2 | `POST /api/tasks/:id/start` — сейчас `preHandler: [authMiddleware, checkTaskLimit]`. Для гостей: заменить `authMiddleware` на `optionalAuthMiddleware`. Внутри обработчика: если `request.auth` есть — текущая логика. Если `request.auth` нет (гость) — разрешить создание сессии с `userId: null` (или использовать специальный guest-маркер), но **ограничить** лимитом гостевых сессий через IP (Redis: `guest:daily:<ip>`, лимит 3). Сессия создаётся **без** привязки к пользователю. Ответ — тот же формат `TaskSession` | `packages/api/src/routes/tasks.ts`, `packages/api/src/middleware/subscription.ts` | Этап 1 | Гость может начать сессию без авторизации; лимит 3 по IP работает; авторизованные пользователи затронуты не должны быть |
| 3.3 | `POST /api/attempts` — адаптировать для гостевого режима. Если `request.auth` нет — принять ответ, вернуть результат, но **не сохранять** в БД (не вставлять в `task_attempts`), не обновлять streak/achievements. Ответ — валидация и скоринг, формат `AttemptResult`, но id=0 и completedAt пустой | `packages/api/src/routes/attempts.ts` | 3.2 | Гость может завершить сессию и получить результат; данные не сохраняются в БД |
| 3.4 | Обновить `checkTaskLimit` middleware для поддержки гостевого режима: если `request.auth` нет → проверять лимит по IP, инкрементировать счётчик по IP. Если `request.auth` есть → текущая логика | `packages/api/src/middleware/subscription.ts` | 3.2 | Лимит работает и для гостей, и для авторизованных |
| 3.5 | Адаптировать схему `taskSessions` — поле `userId` сделать nullable (или использовать гостевую стратегию без записи сессии в БД — предпочтительнее для простоты). **Решение:** для гостей хранить сессию **только в Redis** (TTL 10 мин) с ключом `guest:session:<sessionId>`, не записывать в PostgreSQL. Создать утилиту `createGuestSession` / `getGuestSession` в `packages/api/src/services/guest-session.ts` | `packages/api/src/services/guest-session.ts` (новый файл) | 3.2 | Гостевые сессии работают через Redis без записи в PostgreSQL |

**Definition of done этапа:** неавторизованный пользователь может: получить каталог заданий, начать до 3 сессий/день (по IP), получить результат задания. Прогресс не сохраняется. Авторизованные пользователи не затронуты.

---

#### Этап 4: Адаптация фронтенда — определение среды и auth-провайдер

**Цель этапа:** webapp определяет, работает он в Telegram Mini App или в обычном браузере, и переключает стратегию авторизации. Появляется базовый гостевой режим.

| # | Подзадача | Файлы/компоненты | Зависит от | Checkpoint |
|---|-----------|-------------------|------------|------------|
| 4.1 | Обновить `packages/webapp/src/lib/telegram.ts` — добавить функцию `isTelegramMiniApp(): boolean` (проверяет наличие `window.Telegram?.WebApp?.initData`). Экспортировать | `packages/webapp/src/lib/telegram.ts` | — | Функция корректно определяет среду |
| 4.2 | Создать `packages/webapp/src/lib/auth.ts` — модуль управления auth-токеном для веб-режима. Функции: `getWebToken(): string \| null` (из localStorage), `setWebToken(token: string)`, `clearWebToken()`. Хранить под ключом `brainify_token` | `packages/webapp/src/lib/auth.ts` (новый файл) | — | Функции работают с localStorage |
| 4.3 | Обновить `packages/webapp/src/api/client.ts` — функция `request<T>()`: определить способ авторизации. Если `isTelegramMiniApp()` и есть `initData` → `Authorization: tma <initData>` (как сейчас). Иначе если есть `getWebToken()` → `Authorization: Bearer <token>`. Иначе — без заголовка (гость). **Важно:** не менять API клиента, не менять сигнатуры функций — только логику определения заголовка | `packages/webapp/src/api/client.ts` | 4.1, 4.2 | В TMA-среде — поведение без изменений; в браузере с токеном — Bearer; без токена — без auth |
| 4.4 | Создать хук `packages/webapp/src/hooks/useAuthState.ts` — общий auth-стейт для приложения. Три состояния: `guest` (не авторизован), `tma` (через Telegram Mini App), `web` (через JWT). Хук определяет текущее состояние при загрузке. Экспортирует: `{ mode: 'guest' \| 'tma' \| 'web', user: UserProfile \| null, loading, error, loginViaTelegram: () => void, logout: () => void }` | `packages/webapp/src/hooks/useAuthState.ts` (новый файл) | 4.1, 4.2, 4.3 | Хук корректно определяет режим |
| 4.5 | Обновить `packages/webapp/src/hooks/useAuth.ts` — делегировать логику в `useAuthState`. Для обратной совместимости: если режим `tma` → вызывать `getMe()` как раньше. Если режим `web` → вызывать `getMe()` с Bearer. Если режим `guest` → `user = null`, `loading = false`, `error = null` (не ошибка, а гостевой режим) | `packages/webapp/src/hooks/useAuth.ts` | 4.4 | В TMA поведение не изменилось; в браузере без токена — guest без ошибки |

**Definition of done этапа:** webapp при открытии в обычном браузере не показывает ошибку авторизации, а входит в гостевой режим. В Telegram Mini App — поведение без изменений. API клиент автоматически выбирает стратегию авторизации.

---

#### Этап 5: Telegram Login Widget и UI входа

**Цель этапа:** в веб-режиме пользователь видит кнопку «Войти через Telegram», может авторизоваться и получить полный доступ.

| # | Подзадача | Файлы/компоненты | Зависит от | Checkpoint |
|---|-----------|-------------------|------------|------------|
| 5.1 | Создать компонент `packages/webapp/src/components/TelegramLoginButton.tsx` — обёртка вокруг Telegram Login Widget. Загружает скрипт `https://telegram.org/js/telegram-widget.js` динамически. Принимает `botName`, `onAuth` callback. Widget вызывает callback с данными `{ id, first_name, last_name, username, photo_url, auth_date, hash }` | `packages/webapp/src/components/TelegramLoginButton.tsx` (новый файл) | — | Компонент рендерит кнопку Telegram Login |
| 5.2 | Добавить env-переменную `VITE_BOT_USERNAME` (уже есть) — использовать как `botName` для Telegram Login Widget | — | — | Переменная используется |
| 5.3 | Создать функцию `loginWithTelegram(data)` в `packages/webapp/src/api/client.ts` — вызывает `POST /api/auth/telegram` с данными от виджета, получает `{ token, user }`, сохраняет токен через `setWebToken(token)`, возвращает `user` | `packages/webapp/src/api/client.ts` | Этап 2, 4.2 | Функция вызывает API, сохраняет токен |
| 5.4 | Создать страницу/экран `packages/webapp/src/components/LoginScreen.tsx` — отображается в гостевом режиме. Содержит: заголовок «Brainify 🧠», краткое описание, `TelegramLoginButton`, и кнопку «Попробовать без входа» (ведёт на каталог). Стилизация — ​минимальная, в стиле текущего приложения | `packages/webapp/src/components/LoginScreen.tsx` (новый файл) | 5.1 | Экран рендерится в гостевом режиме |
| 5.5 | Создать компонент `packages/webapp/src/components/GuestBanner.tsx` — небольшой баннер/плашка вверху экрана в гостевом режиме: «Вы в гостевом режиме. Войдите через Telegram для полного доступа» с кнопкой «Войти». Показывается на страницах каталога и результата | `packages/webapp/src/components/GuestBanner.tsx` (новый файл) | 5.1 | Баннер рендерится |
| 5.6 | Обновить `packages/webapp/src/app.tsx` — интегрировать три режима. Если `mode === 'guest'` и первый визит → показать `LoginScreen`. Если `mode === 'guest'` и нажал «Попробовать» → `TaskCatalog` + `GuestBanner` + ограниченный NavBar (без progress, leaderboard, duels, profile). Если `mode === 'tma'` → текущее поведение. Если `mode === 'web'` → полное поведение как TMA, но без Telegram-специфичных вызовов | `packages/webapp/src/app.tsx` | 4.4, 5.4, 5.5 | Три режима работают; TMA не сломан |
| 5.7 | Обновить `useAuthState` — реализовать `loginViaTelegram(data)`: вызвать `loginWithTelegram(data)`, обновить стейт на `mode: 'web'`, вызвать `getMe()` для получения профиля. Реализовать `logout()`: `clearWebToken()`, обновить стейт на `mode: 'guest'` | `packages/webapp/src/hooks/useAuthState.ts` | 5.3 | Авторизация через виджет меняет режим приложения |

**Definition of done этапа:** в веб-браузере пользователь видит экран входа или гостевой режим; может войти через Telegram Login Widget; после входа получает полный доступ; может выйти. В TMA — без изменений.

---

#### Этап 6: Paywall и подписка в веб-режиме

**Цель этапа:** авторизованный веб-пользователь с подпиской free видит предложение подписаться; CTA ведёт в Telegram-бота.

| # | Подзадача | Файлы/компоненты | Зависит от | Checkpoint |
|---|-----------|-------------------|------------|------------|
| 6.1 | Создать компонент `packages/webapp/src/components/SubscriptionBanner.tsx` — показывает статус подписки для веб-пользователей. Если `free` → «Подключите Premium для полного доступа» + кнопка. Если `trial` → «Trial до {дата}» + кнопка продлить. Если `active` → не показывать | `packages/webapp/src/components/SubscriptionBanner.tsx` (новый файл) | Этап 5 | Баннер показывает корректный статус |
| 6.2 | CTA-кнопка подписки в веб-режиме: если среда TMA — использовать существующую логику (openBot subscribe). Если среда web — `window.open('https://t.me/{BOT_USERNAME}?start=subscribe', '_blank')`. Создать утилиту `openSubscription()` в `packages/webapp/src/lib/subscription.ts` | `packages/webapp/src/lib/subscription.ts` (новый файл) | 5.2 | Кнопка открывает бота в новой вкладке (в веб) или inline (в TMA) |
| 6.3 | Обновить экран `Profile.tsx` — адаптировать для веб-режима: если среда не TMA, то вместо `openBot('subscribe')` использовать `openSubscription()`. Убрать вызовы `window.Telegram?.WebApp?.openTelegramLink` с fallback на обычные ссылки | `packages/webapp/src/pages/Profile.tsx` | 6.2 | Профиль работает и в TMA, и в браузере |
| 6.4 | Обновить NavBar — для гостя: показывать только «Каталог». Для авторизованного free — все разделы, но при переходе на premium-only (duels, progress) показывать paywall-экран. Использовать существующие 403-ответы API (`subscriptionRequired: true`) для определения | `packages/webapp/src/components/NavBar.tsx`, `packages/webapp/src/app.tsx` | 6.1 | Навигация адаптирована под режим |
| 6.5 | Создать экран `packages/webapp/src/components/PaywallScreen.tsx` — показывается при попытке доступа к premium-функции для free-пользователя. Список преимуществ premium + CTA подписки | `packages/webapp/src/components/PaywallScreen.tsx` (новый файл) | 6.1, 6.2 | Экран показывается при 403 с `subscriptionRequired` |

**Definition of done этапа:** free-пользователь на вебе видит баннер/экран подписки; CTA корректно ведёт в Telegram-бота; premium-функции недоступны без подписки; в TMA всё работает как раньше.

---

#### Этап 7: Стилизация и адаптация под веб-среду

**Цель этапа:** webapp выглядит корректно в обычном браузере (без Telegram CSS-переменных).

| # | Подзадача | Файлы/компоненты | Зависит от | Checkpoint |
|---|-----------|-------------------|------------|------------|
| 7.1 | Обновить `packages/webapp/src/styles/global.css` — текущие CSS-переменные `:root` уже имеют fallback-значения (подтверждено: `--tg-theme-bg-color: var(--tg-theme-bg-color, #ffffff)`). Проверить, что fallback-ы образуют приятную тему. При необходимости скорректировать цвета fallback. Добавить медиа-запрос `prefers-color-scheme: dark` для тёмной темы вне Telegram | `packages/webapp/src/styles/global.css` | — | В браузере без Telegram SDK отображается читаемый интерфейс с корректными цветами |
| 7.2 | Обновить `packages/webapp/src/lib/telegram.ts` — в `initWebApp()`: если не TMA, то НЕ вызывать `webapp.ready()` и `webapp.expand()`. Это уже обработано (проверка `if (webapp)`), только добавить логирование `[Web] Running in browser mode` | `packages/webapp/src/lib/telegram.ts` | 4.1 | Без Telegram SDK — приложение инициализируется корректно |
| 7.3 | Обновить `packages/webapp/src/hooks/useI18n.ts` — если `getTelegramUser()` вернул null (веб-режим), определять язык из `navigator.language`. Текущая логика: `resolveLocale(tgUser?.language_code)` — если `undefined`, предположительно `resolveLocale` уже возвращает default. Проверить и при необходимости передать `navigator.language.slice(0, 2)` | `packages/webapp/src/hooks/useI18n.ts` | 4.1 | Язык корректно определяется в веб-режиме |

**Definition of done этапа:** webapp корректно отображается в Chrome/Safari/Firefox без Telegram SDK; цвета, шрифты, навигация работают; язык определяется из браузера.

---

#### Этап 8: Инфраструктура — Nginx, CSP, Docker

**Цель этапа:** веб-приложение доступно напрямую из браузера; CSP и nginx корректно настроены для нового режима.

| # | Подзадача | Файлы/компоненты | Зависит от | Checkpoint |
|---|-----------|-------------------|------------|------------|
| 8.1 | Обновить CSP в `nginx.conf`: `frame-ancestors 'self' https://web.telegram.org https://*.telegram.org` → расширить для прямого доступа. Также добавить `script-src` чтобы разрешить скрипт Telegram Login Widget (`https://telegram.org`). Итого: `Content-Security-Policy "default-src 'self'; script-src 'self' https://telegram.org; frame-ancestors 'self' https://web.telegram.org https://*.telegram.org"` | `nginx.conf` | — | CSP не блокирует Telegram Login Widget и не блокирует прямой доступ |
| 8.2 | Добавить `JWT_SECRET` в docker-compose.prod.yml (переменная окружения для api-сервиса, из `.env`) | `docker-compose.prod.yml` | — | Переменная пробрасывается в контейнер |
| 8.3 | Обновить `.env.example` — добавить `JWT_SECRET` с комментарием (если не добавлено на этапе 1.2) | `.env.example` | — | Документация актуальна |
| 8.4 | Настройка в BotFather: добавить домен `brainify.ellow.tech` через `/setdomain` для Telegram Login Widget. **Это ручное действие** — зафиксировать как требование в README или отдельном чеклисте | — | — | Домен настроен в BotFather (ручная проверка) |

**Definition of done этапа:** nginx пропускает Telegram Login Widget; JWT_SECRET доставляется в контейнер; CSP корректен для обоих режимов.

---

#### Этап 9: Экран лимита гостя и конверсионные точки

**Цель этапа:** гость, исчерпавший лимит, видит экран с призывом войти. Конверсионные точки расставлены.

| # | Подзадача | Файлы/компоненты | Зависит от | Checkpoint |
|---|-----------|-------------------|------------|------------|
| 9.1 | Создать компонент `packages/webapp/src/components/GuestLimitScreen.tsx` — показывается, когда API возвращает 403 для гостя (лимит по IP). Текст: «Вы попробовали 3 задания. Войдите через Telegram, чтобы получить полный доступ». Кнопка «Войти через Telegram» | `packages/webapp/src/components/GuestLimitScreen.tsx` (новый файл) | Этапы 3, 5 | Экран показывается при лимите |
| 9.2 | Обновить `TaskPlay.tsx` / `TaskCatalog.tsx` — при ответе API 403 с `{ subscriptionRequired: true }` или 403 с гостевым лимитом — показывать `GuestLimitScreen` (для гостей) или `PaywallScreen` (для free-юзеров) | `packages/webapp/src/pages/TaskPlay.tsx`, `packages/webapp/src/pages/TaskCatalog.tsx` | 9.1, 6.5 | Корректный экран показывается в зависимости от режима |
| 9.3 | Экран результата (`TaskResult.tsx`) — в гостевом режиме добавить текст: «Ваш результат: {score}. Войдите, чтобы сохранять прогресс и соревноваться» + кнопка входа | `packages/webapp/src/pages/TaskResult.tsx` | 5.1 | Конверсионная точка на экране результата |

**Definition of done этапа:** гость видит конверсионные точки в ключевых местах; лимит по IP вызывает экран входа; результат задания содержит CTA.

---

### 🔗 ГРАФ ЗАВИСИМОСТЕЙ

```
Этап 1 (auth мультистратегия)
  1.1 ─┐
  1.2 ─┤
       ├→ 1.3 → 1.5 → 1.6 → 1.7 → 1.8
  1.4 ─┘                       │
                                ↓
Этап 2 (auth эндпоинт)         │
  2.1 ← Этап 1                 │
  2.3 ← 2.1                    │
  2.2 ← 2.1                    │
                                │
Этап 3 (гостевые API)          │
  3.1 (уже готово)              │
  3.5 ← Этап 1                 │
  3.2 ← 3.5, Этап 1            │
  3.3 ← 3.2                    │
  3.4 ← 3.2                    │
                                │
Этап 4 (фронт: среда + auth)   │
  4.1 ─┐                       │
  4.2 ─┤                       │
       ├→ 4.3 → 4.4 → 4.5     │
                   │            │
                   ↓            │
Этап 5 (Telegram Login UI)     │
  5.1 ────────────────┐        │
  5.3 ← Этап 2, 4.2  │        │
  5.4 ← 5.1          ├→ 5.6 → 5.7
  5.5 ← 5.1          │
                      │
Этап 6 (paywall)  ← Этап 5
  6.1 → 6.5
  6.2 → 6.3
  6.4

Этап 7 (стили)    — параллельно с Этапами 4-6
  7.1, 7.2, 7.3 — независимы

Этап 8 (инфра)    — параллельно с Этапами 4-6
  8.1, 8.2, 8.3, 8.4 — независимы

Этап 9 (конверсия) ← Этапы 3, 5, 6
  9.1 → 9.2
  9.3
```

**Параллельность:**
- Этапы 1, 4.1-4.2, 7, 8 можно начинать параллельно
- Этап 2 и Этап 3 могут идти параллельно (оба зависят от Этапа 1)
- Этап 6 начинается после Этапа 5
- Этап 9 — последний

---

### ⚠️ РИСКИ ПЛАНА

| Риск | На каком шаге | Влияние | Митигация |
|------|---------------|---------|-----------|
| Сломать `authMiddleware` для TMA при добавлении Bearer-ветки | 1.5 | Высокое | Добавлять ветку **после** текущей tma-логики; тестировать оба пути; в мультистратегии сначала проверяем `tma`, потом `Bearer` |
| Telegram Login Widget не работает без настройки домена в BotFather | 5.1, 8.4 | Высокое | Настройка BotFather — предусловие для Этапа 5; зафиксировать как первое ручное действие |
| Гостевые сессии в Redis — утечка памяти при массовом доступе | 3.5 | Среднее | TTL 10 мин для каждой сессии; rate limit по IP уже есть в Fastify (100 req/min); лимит 3 гостевых сессии/день по IP |
| `request.auth` может быть `undefined` после `optionalAuthMiddleware` — TypeScript не защитит в рантайме | 3.2, 3.3 | Среднее | Явная проверка `if (!request.auth)` в каждом обработчике, использующем optional auth; TS-тип `auth?: AuthPayload` |
| CSS fallback-значения могут выглядеть плохо в тёмной теме браузера | 7.1 | Низкое | Добавить `prefers-color-scheme: dark` медиа-запрос с тёмными fallback-ами |
| Webapp увеличится в размере из-за Telegram Login Widget скрипта | 5.1 | Низкое | Скрипт грузится динамически из CDN, не попадает в бандл |

---

### 🛡️ СТРАТЕГИЯ БЕЗОПАСНОСТИ

- **Текущее поведение TMA сохраняется:** ветка `tma` в `authMiddleware` не изменяется, только добавляется новая ветка `Bearer` после неё
- **Точка отката на каждом этапе:** этапы независимы; если Этап 2 не работает — Этап 1 уже продакшн-безопасен (новая ветка JWT просто не вызывается); если Этап 5 не работает — API и гостевой режим работают
- **Что НЕ должно быть затронуто:**
  - Существующие роуты, использующие `authMiddleware` (progress, leaderboard, duels, friends, achievements, subscription, users, share, notifications) — они остаются с обязательной авторизацией
  - Таблица `users` — структура не меняется
  - Логика генерации заданий (shared) — не трогаем
  - Бот (bot) — не трогаем, кроме возможной настройки `/setdomain` в BotFather
  - Платёжная логика (Telegram Payments) — не трогаем
- **JWT безопасность:** токен подписан HMAC-SHA256 через `jose`; secret ≥32 символа; время жизни 1 час; хранение в localStorage (приемлемый риск для данного приложения — нет финансовых операций в вебе, оплата через Telegram)
- **Гостевой режим не создаёт данных:** попытки не сохраняются в БД, сессии — только Redis с TTL, утечки персональных данных невозможны
- **Telegram Login Widget валидация:** серверная проверка подписи через HMAC-SHA256 от BOT_TOKEN — стандарт Telegram, защита от подделки

---

### 📌 ДОПУЩЕНИЯ ПЛАНА

- Для JWT используем библиотеку `jose` (zero-dependency, ESM-native, широко используется в Node.js 20+)
- Гостевые сессии хранятся **только в Redis** (не в PostgreSQL) — это упрощает схему и исключает миграцию БД
- Данные гостя не сохраняются и не мигрируют после входа (из постановки)
- Telegram Login Widget грузится из CDN `https://telegram.org/js/telegram-widget.js` — внешняя зависимость
- Для оплаты из веба — deep link в бота (из постановки)
- Домен `brainify.ellow.tech` уже настроен для Telegram Mini App — нужно только добавить его для Login Widget через BotFather
- CSS fallback-ы в `global.css` уже задают базово-рабочую тему для браузера

---

### ❓ ОТКРЫТЫЕ ВОПРОСЫ

1. **Нужен ли refresh-token механизм для веб-сессии?**
   - Рабочая гипотеза: нет, на первом этапе JWT с TTL 1 час достаточно. Пользователь переавторизуется через Widget. В будущем можно добавить refresh.

2. **Нужно ли ограничивать гостевой доступ сложностью заданий (например, только difficulty=1)?**
   - Рабочая гипотеза: нет, гость получает тот же опыт, что и авторизованный, но без сохранения. Ограничение — только количество.

3. **Настроен ли домен в BotFather для Login Widget?**
   - Рабочая гипотеза: нет — это ручное действие, которое нужно выполнить до тестирования Telegram Login Widget.

---

### ✅ DEFINITION OF DONE (ЗАДАЧА ЦЕЛИКОМ)

1. Пользователь заходит на `brainify.ellow.tech` в обычном браузере и видит экран входа / гостевой режим (не ошибку)
2. Гостевой режим: доступен каталог заданий + до 3 попыток/день без авторизации, прогресс не сохраняется
3. Кнопка «Войти через Telegram» (Login Widget) работает, создаёт/находит пользователя, выдаёт JWT
4. После входа: подписка проверяется, отображается статус (trial/free/active)
5. Если подписка free — предлагается подписаться (CTA → deep link в бота)
6. Существующая Mini App авторизация (initData) работает без изменений
7. Оба способа входа (Mini App и веб) привязаны к одному аккаунту по `telegramId`
8. Webapp корректно отображается в обычном браузере (цвета, шрифты, навигация)
9. CSP и nginx настроены для обоих режимов
10. TypeScript typecheck проходит для всех пакетов

---

### 📦 ГОТОВО ДЛЯ ИСПОЛНИТЕЛЯ

**Порядок выполнения:** Этап 1 → Этапы 2 и 3 (параллельно) → Этап 4 → Этап 5 → Этап 6 → Этапы 7 и 8 (параллельно, можно начать раньше) → Этап 9

**Ограничения для Исполнителя:**
- Не менять структуру таблицы `users` (telegramId остаётся основным идентификатором)
- Не менять логику генерации заданий в `packages/shared`
- Не менять `packages/bot` (кроме BotFather-настройки)
- Не менять существующие роуты, которые используют `authMiddleware` как обязательный — формат `request.auth` должен остаться `AuthPayload`
- Не добавлять новые npm-зависимости кроме `jose` (для API) — на фронте всё реализуется без дополнительных библиотек
- Сохранять бюджет бандла webapp ≤ 200 КБ gzip

**Первый шаг:** Установить `jose` в `packages/api`, создать `jwt.ts` и `telegram-login.ts`, затем рефакторить `authMiddleware` для поддержки двух стратегий (Этап 1, подзадачи 1.1 → 1.8)
