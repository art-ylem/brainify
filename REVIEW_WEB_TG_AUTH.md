### 🔍 РЕВЬЮ (повторное)

**Задача:** Веб-версия Brainify с авторизацией через Telegram и гостевым режимом

**Вердикт:** ✅ Принято

**Общая оценка:** Все три критичных замечания из первого ревью исправлены корректно. Код качественный, архитектура чистая, auth-слой, JWT, Telegram Login Widget, гостевые Redis-сессии, UI-компоненты и i18n реализованы грамотно.

---

### 🚨 КРИТИЧНЫЕ ЗАМЕЧАНИЯ (блокируют приёмку)

Критичных замечаний нет. Все три замечания из первого ревью исправлены:

1. ✅ `GuestLimitScreen` и `PaywallScreen` подключены в `TaskPlay.tsx` — при `error === '__limit__'` рендерится правильный компонент в зависимости от `isGuest`; props `isGuest`, `mode`, `onAuth` прокинуты из `app.tsx`.
2. ✅ `trustProxy: true` добавлен в `Fastify()` — `request.ip` теперь возвращает реальный IP клиента через `X-Forwarded-For`.
3. ✅ `sessionId: number | string` в `TaskSession`, `submitAttempt`, `submitChallengerResult`, `submitOpponentResult` — типы соответствуют runtime-данным.

---

### 💡 РЕКОМЕНДАЦИИ (не блокируют, но желательно)

| # | Файл | Строка/место | Предложение | Обоснование |
|---|------|--------------|-------------|-------------|
| 1 | `packages/webapp/src/styles/global.css` | строки 1-10 | CSS-переменные `:root { --tg-theme-bg-color: var(--tg-theme-bg-color, #ffffff); }` — это самоссылка. В Chrome работает (использует fallback), но по спецификации CSS самоссылка создаёт цикл и значение становится guaranteed-invalid. Firefox может не показать fallback. | Использовать промежуточные переменные или другой подход: например, задавать fallback напрямую в местах использования, или использовать `@supports` / другие имена для fallback-переменных. |
| 2 | `packages/webapp/src/components/NavBar.tsx` | строка 43 | `<span>Профиль</span>` — хардкод на русском вместо i18n-ключа. Все остальные элементы навбара используют `t(...)`. | Заменить на `{t('profile.title')}`. |
| 3 | `packages/api/src/routes/auth.ts` | весь файл | `language_code` не передаётся в `findOrCreateUser` при регистрации через Telegram Login Widget (виджет его не предоставляет). Все web-пользователи получают `languageCode: 'en'`, даже русскоязычные. | Можно отправлять `navigator.language` с фронта как дополнительное поле в теле запроса `/api/auth/telegram` и использовать его при создании пользователя. |
| 4 | `packages/api/src/services/guest-session.ts` | строки 38-42 | `getGuestDailyCount` использует `ip` в ключе Redis. Если IP — IPv6 (возможно для некоторых клиентов), ключ может быть длинным и не нормализованным. | Рассмотреть хеширование IP или нормализацию IPv6. Некритично для MVP. |

---

### 📊 ОЦЕНКА ПО КРИТЕРИЯМ

| Критерий | Оценка | Комментарий |
|----------|--------|-------------|
| Корректность | ✅ | Auth-слой, JWT, валидация Telegram Login Widget, гостевые сессии, лимиты по IP, экраны лимитов — всё работает корректно. |
| Обратная совместимость | ✅ | TMA-ветка проверяется первой в middleware; `useAuth` делегирует в `useAuthState` — существующее поведение сохранено. `findOrCreateUser` корректно вынесена, `routes/users.ts` упрощён без изменения контракта. |
| Архитектура | ✅ | Чистое разделение: `auth/jwt.ts`, `auth/telegram-login.ts`, `services/guest-session.ts`. Три стратегии auth (tma → Bearer → legacy) — правильный порядок. `optionalAuthMiddleware` — разумное решение. |
| Поддерживаемость | ✅ | Код читаем. Типизация `sessionId: number | string` корректно отражает два режима. |
| Простота | ✅ | Нет переусложнений. Решения прямолинейные. Отклонение от плана (openSubscription в Profile.tsx вместо отдельного файла) — обосновано. |

---

### 🔄 ПРОВЕРКА СООТВЕТСТВИЯ ПЛАНУ

- **Этапы 1-4:** Полностью выполнены. auth/jwt.ts, telegram-login.ts, middleware мультистратегия, optionalAuthMiddleware, authRoutes, findOrCreateUser, гостевые сессии, фронтенд auth-провайдер — всё на месте.
- **Этап 5:** LoginScreen, GuestBanner, TelegramLoginButton — выполнены. app.tsx корректно обрабатывает три режима.
- **Этап 6:** SubscriptionBanner, PaywallScreen, Profile.tsx, NavBar — компоненты созданы. PaywallScreen не интегрирован в page flow (**отклонение**).
- **Этап 7:** Dark mode CSS fallback, browser mode log, navigator.language — выполнены.
- **Этап 8:** nginx CSP, docker-compose JWT_SECRET, .env.example — выполнены.
- **Этап 9:** GuestLimitScreen создан (9.1 ✅), **9.2 выполнен** — `GuestLimitScreen` и `PaywallScreen` подключены в `TaskPlay.tsx` с ветвлением по `isGuest`. 9.3 (CTA на TaskResult) — выполнен.
- **i18n:** Все ключи login/guest/paywall добавлены в оба языка.
- **Definition of done:** TypeScript typecheck проходит; все 9 этапов полностью реализованы, включая интеграцию GuestLimitScreen/PaywallScreen. **DoD выполнен.**

---

### ⚠️ РИСКИ РЕГРЕССИИ

- **Заявленный риск: preHandler для tasks/:id/start и attempts** — **подтверждён, но управляем.** Код сохраняет авторизованную ветку без изменений. optionalAuthMiddleware корректно не блокирует неавторизованные запросы.
- **Заявленный риск: useAuth делегирует в useAuthState** — **подтверждён, низкий.** В TMA-режиме `detectMode()` возвращает 'tma', дальше вызывается `getMe()` как раньше.
- **Заявленный риск: строковый sessionId vs числовой** — **снят.** Типизация обновлена до `number | string`.
- **Заявленный риск: CSS переменные** — **подтверждён, низкий.** В TMA Telegram SDK ставит inline styles → победит по специфичности → проблемы не будет. В web-режиме Chrome использует fallback — работает. Firefox может сломаться.
- **Риск `trustProxy` из первого ревью** — **снят.** `trustProxy: true` добавлен.

---

### 📦 ИТОГ

**✅ Принято**

Задача может быть закрыта. Проверено и не вызывает вопросов:
- Auth-слой: JWT (jose HMAC-SHA256), валидация Telegram Login Widget (SHA256 → HMAC → timingSafeEqual), мультистратегия middleware (tma → Bearer → legacy)
- optionalAuthMiddleware корректно пропускает неавторизованных
- POST /api/auth/telegram: валидация → findOrCreateUser → signJwt → token+user
- Гостевые Redis-сессии с TTL и IP-лимит (3/день) — `trustProxy` включён
- Фронтенд: три режима (guest/tma/web), автовыбор auth-заголовка, `sessionId: number | string`
- `GuestLimitScreen` и `PaywallScreen` интегрированы в `TaskPlay.tsx`
- Конверсионные точки: GuestBanner, TaskResult CTA, GuestLimitScreen
- i18n: ключи login/guest/paywall в обоих языках
- Инфра: CSP обновлён, JWT_SECRET пробрасывается

Рекомендации из первого ревью остаются актуальны (CSS self-reference fallback, хардкод "Профиль" в NavBar, language_code при web-регистрации), но не блокируют.
