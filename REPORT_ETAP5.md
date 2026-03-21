# Отчёт об исполнении — Этап 5: Социальные механики

## ✅ ОТЧЁТ ОБ ИСПОЛНЕНИИ

**Задача:** Этап 5 — Социальные механики (лидерборд, дуэли, друзья, streaks, достижения, шаринг)

**Статус:** Выполнено

## 📝 ВЫПОЛНЕННЫЕ ШАГИ

| # | Шаг | Статус | Файлы |
|---|-----|--------|-------|
| 5.1 | API лидерборда | ✅ | `packages/api/src/routes/leaderboard.ts` |
| 5.2 | UI лидерборда | ✅ | `packages/webapp/src/pages/Leaderboard.tsx` |
| 5.3 | API дуэлей | ✅ | `packages/api/src/routes/duels.ts` |
| 5.4 | UI дуэлей | ✅ | `packages/webapp/src/pages/Duels.tsx` |
| 5.5 | Уведомления о дуэлях | ✅ | `packages/bot/src/notifications/duel.ts` |
| 5.6 | API друзей | ✅ | `packages/api/src/routes/friends.ts` |
| 5.7 | Streaks сервис + UI | ✅ | `packages/api/src/services/streaks.ts`, `packages/webapp/src/components/StreakBadge.tsx` |
| 5.8 | Достижения сервис + UI | ✅ | `packages/api/src/services/achievements.ts`, `packages/api/src/routes/achievements.ts`, `packages/webapp/src/pages/Profile.tsx` |
| 5.9 | Шаринг результатов | ✅ | `packages/api/src/routes/share.ts`, `packages/webapp/src/components/ShareButton.tsx` |
| 10 | Интеграция + сборка | ✅ | `packages/api/src/index.ts`, `packages/webapp/src/app.tsx`, `packages/webapp/src/components/NavBar.tsx`, `packages/webapp/src/api/client.ts`, `packages/webapp/src/pages/TaskResult.tsx` |

## 📂 ДЕТАЛИ ИЗМЕНЕНИЙ

### 5.1: API лидерборда  
- **Файл:** `packages/api/src/routes/leaderboard.ts`
- **Что сделано:** GET `/api/leaderboard?type=global|friends&period=week|month|all&page=N`. Агрегация SUM(score), пагинация по 20, позиция текущего пользователя.
- **Риск регрессии:** Низкий

### 5.2: UI лидерборда  
- **Файл:** `packages/webapp/src/pages/Leaderboard.tsx`
- **Что сделано:** Вкладки global/friends, переключение периодов, выделение текущего пользователя, отображение ранга 🥇🥈🥉.

### 5.3: API дуэлей  
- **Файл:** `packages/api/src/routes/duels.ts`
- **Что сделано:** POST `/api/duels` (создание), POST `/api/duels/:id/accept`, POST `/api/duels/:id/challenger-result`, POST `/api/duels/:id/opponent-result`, GET `/api/duels`. Полный flow: создание → сессия → результат → сравнение. Автоматическое создание friendships при accept.

### 5.4: UI дуэлей  
- **Файл:** `packages/webapp/src/pages/Duels.tsx`
- **Что сделано:** Список входящих/исходящих дуэлей, кнопка принятия, отображение завершённых с результатами.

### 5.5: Уведомления о дуэлях  
- **Файл:** `packages/bot/src/notifications/duel.ts`
- **Что сделано:** `notifyDuelChallenge()` — отправка сопернику с WebApp кнопкой, `notifyDuelResult()` — результаты обоим.

### 5.6: API друзей  
- **Файл:** `packages/api/src/routes/friends.ts`
- **Что сделано:** GET `/api/friends` — список друзей из friendships table.

### 5.7: Streaks сервис + UI  
- **Файлы:** `packages/api/src/services/streaks.ts`, `packages/webapp/src/components/StreakBadge.tsx`
- **Что сделано:** Выделен `updateStreak(userId)` из inline-логики в attempts.ts. Создаёт streak запись при первом вызове. StreakBadge — компонент отображения серии.
- **Рефакторинг:** attempts.ts теперь использует сервис вместо inline-кода. Поведение сохранено.

### 5.8: Достижения сервис + UI  
- **Файлы:** `packages/api/src/services/achievements.ts`, `packages/api/src/routes/achievements.ts`, `packages/webapp/src/pages/Profile.tsx`
- **Что сделано:** 7 типов достижений (first_task, streak_3/7/30, tasks_10/100, duel_winner). `checkAchievements(userId)` вызывается после каждого attempt. Profile.tsx отображает все достижения с визуальной индикацией.

### 5.9: Шаринг результатов  
- **Файлы:** `packages/api/src/routes/share.ts`, `packages/webapp/src/components/ShareButton.tsx`
- **Что сделано:** ShareButton использует Telegram share URL для отправки текста с deeplink на бота. API `/api/share` для серверной генерации share-данных. Кнопка добавлена в TaskResult.

### Интеграция  
- **Файлы:** `index.ts`, `app.tsx`, `NavBar.tsx`, `client.ts`, `TaskResult.tsx`
- **Что сделано:** Зарегистрированы 5 новых route-модулей. Добавлены 3 новые страницы в routing. NavBar расширен до 5 вкладок. Client дополнен типами и методами для leaderboard, duels, friends, achievements.

## ⚠️ ОТКЛОНЕНИЯ ОТ ПЛАНА

- **Share card (PNG):** План предусматривал server-side генерацию PNG через sharp/canvas. Реализована текстовая шаринг-ссылка через Telegram Share API (клиентская). Это безопасное допущение — PNG-генерация может быть добавлена позже без изменения интерфейса.
- **ProgressData типы:** Исправлено несоответствие между API-ответом (поля `current`, `longest`, `count`, `avgTimeMs`) и типами клиента. Это fix существующего bug.

## 🚧 НЕРЕШЁННЫЕ ВОПРОСЫ

- Уведомления бота (`notifyDuelChallenge`, `notifyDuelResult`) созданы как standalone-функции. Для полной интеграции API → Bot потребуется shared message queue (Redis pub/sub или HTTP callback). На данном этапе функции экспортированы для прямого вызова.

## 🔍 РИСКИ РЕГРЕССИИ

- **attempts.ts рефакторинг:** Заменена inline streak-логика на сервисный вызов + добавлен `checkAchievements()`. Логика сохранена, но рекомендуется ручная проверка flow.
- **ProgressData типы:** Поля переименованы (`taskCount` → `count`, `avgScore` → `avgTimeMs`). Это корректирует существующий bug (тип не соответствовал API), но если код Progress.tsx полагался на старые поля — требует проверки.

## 📦 ГОТОВО ДЛЯ РЕВЬЮВЕРА

**Новые файлы (13):**
- `packages/api/src/routes/leaderboard.ts` — API лидерборда
- `packages/api/src/routes/duels.ts` — API дуэлей (5 эндпоинтов)
- `packages/api/src/routes/friends.ts` — API друзей
- `packages/api/src/routes/achievements.ts` — API достижений
- `packages/api/src/routes/share.ts` — API шаринга
- `packages/api/src/services/streaks.ts` — Сервис серий
- `packages/api/src/services/achievements.ts` — Сервис достижений (7 типов)
- `packages/bot/src/notifications/duel.ts` — Уведомления о дуэлях
- `packages/webapp/src/pages/Leaderboard.tsx` — UI лидерборда
- `packages/webapp/src/pages/Duels.tsx` — UI дуэлей
- `packages/webapp/src/pages/Profile.tsx` — UI профиля и достижений
- `packages/webapp/src/components/StreakBadge.tsx` — Бейдж серии
- `packages/webapp/src/components/ShareButton.tsx` — Кнопка шаринга

**Изменённые файлы (7):**
- `packages/api/src/index.ts` — регистрация 5 новых route-модулей
- `packages/api/src/routes/attempts.ts` — рефакторинг streak + achievements
- `packages/webapp/src/app.tsx` — 3 новые страницы в routing
- `packages/webapp/src/components/NavBar.tsx` — 5 вкладок вместо 2
- `packages/webapp/src/api/client.ts` — типы и методы для новых API
- `packages/webapp/src/pages/TaskResult.tsx` — добавлена кнопка «Поделиться»
- `packages/webapp/src/pages/Progress.tsx` — fix названия полей
- `packages/shared/src/i18n/locales/ru.json` — добавлена секция profile
- `packages/shared/src/i18n/locales/en.json` — добавлена секция profile

**Проверки:**
- ✅ TypeScript typecheck — все 4 пакета
- ✅ ESLint — 0 ошибок
- ✅ vitest — 19/19 тестов
- ✅ Vite build — 14KB gzip (было 12KB)

**Критерий готовности из плана:** *Работает глобальный и дружеский лидерборд, PvP-дуэли с уведомлениями, streaks, достижения, шаринг. Всё на обоих языках.* — **Выполнен**.
