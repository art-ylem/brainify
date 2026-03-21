# ✅ ОТЧЁТ ОБ ИСПОЛНЕНИИ — Этапы 3 и 4

**Задача:** Telegram-бот (grammY) + Mini App (Preact + Vite)

**Статус:** Выполнено

## 📝 ВЫПОЛНЕННЫЕ ШАГИ

| # | Шаг | Статус | Файлы |
|---|-----|--------|-------|
| 1 | Установка зависимостей бота (grammY) | ✅ | `packages/bot/package.json` |
| 2 | `/start` с deep linking + реферал | ✅ | `packages/bot/src/commands/start.ts` |
| 3 | Кнопка-меню Mini App | ✅ | `packages/bot/src/menu.ts` |
| 4 | Быстрое задание в чате (`/train`) | ✅ | `packages/bot/src/commands/quick-task.ts` |
| 5 | Команда `/invite` | ✅ | `packages/bot/src/commands/invite.ts` |
| 6 | Entry point бота | ✅ | `packages/bot/src/index.ts` |
| 7 | Установка зависимостей webapp (Preact, Vite) | ✅ | `packages/webapp/package.json` |
| 8 | Vite config + HTML + CSS + Telegram SDK types | ✅ | `vite.config.ts`, `index.html`, `styles/global.css`, `types/telegram.d.ts` |
| 9 | Telegram WebApp utility + API client | ✅ | `lib/telegram.ts`, `api/client.ts` |
| 10 | Auth hook + i18n hook | ✅ | `hooks/useAuth.ts`, `hooks/useI18n.ts` |
| 11 | App entry + NavBar | ✅ | `index.tsx`, `app.tsx`, `components/NavBar.tsx` |
| 12 | Каталог заданий | ✅ | `pages/TaskCatalog.tsx` |
| 13 | TaskRunner (TaskPlay) | ✅ | `pages/TaskPlay.tsx` |
| 14 | 7 UI-компонентов заданий | ✅ | `components/tasks/*.tsx` |
| 15 | Экран результата | ✅ | `pages/TaskResult.tsx` |
| 16 | Экран прогресса | ✅ | `pages/Progress.tsx` |

## 📂 ДЕТАЛИ ИЗМЕНЕНИЙ

### Этап 3: Telegram-бот

**3.1 `/start` с deep linking**
- Обработка параметра `ref_<userId>` из deep link
- Определение языка из `from.language_code`
- Приветственное сообщение + inline кнопка открытия Mini App

**3.2 Кнопка-меню**
- `setChatMenuButton` с типом `web_app` → Mini App открывается из меню бота

**3.3 `/train` — быстрое задание**
- Генерирует арифметический пример (difficulty: 1)
- Отправляет 4 варианта ответа inline-кнопками
- Правильный ответ хранится в памяти (Map), не в callback_data — **безопасно**
- Автоочистка через 5 минут

**3.4 `/invite`**
- Генерирует реферальную ссылку `t.me/<bot>?start=ref_<userId>`
- Кнопка «Поделиться» через `t.me/share/url`

### Этап 4: Mini App

**4.1 Vite + Preact**
- Vite config с proxy `/api` → `localhost:3000`
- HTML с Telegram WebApp JS SDK
- CSS на CSS-переменных Telegram Theme (авто-темизация)

**4.2 Авторизация**
- `useAuth` hook — fetch `/api/user/me` с `Authorization: tma <initData>`
- API client с `ApiError` class, все маршруты типизированы

**4.3 Каталог**
- Карточки заданий с иконками по категориям
- Фильтры: все/память/внимание/логика/скорость
- Fetch через `getTasks(category?)`

**4.4 TaskRunner (TaskPlay)**
- Универсальный раннер: `startTaskSession` → рендер UI компонента → `submitAttempt`
- Замер времени `Date.now()` start → answer
- Маппинг `taskType` → UI компонент

**4.5 UI-компоненты (7 штук)**
- `SchulteUI` — сетка N×N, tap по порядку
- `SequenceMemoryUI` — анимированный показ → ввод (grid 3×3, подсветка)
- `ArithmeticUI` — поочерёдные примеры с числовым input
- `StroopUI` — цветное слово + кнопки-эмодзи цветов
- `NumberSeriesUI` — ряд с `?` + числовой input
- `MemoryPairsUI` — flip-карточки, подсветка пар
- `PatternSearchUI` — ряд + варианты ответа

**4.6 Экран результата**
- Score, время, детали (matchedPairs, moves, etc.)
- Кнопки «Повторить» и «Назад»

**4.7 Прогресс**
- Streak badge (🔥)
- Bar chart по дням (последние 14)
- Разбивка по категориям (количество + avg score)

**4.8 i18n**
- `useI18n` hook — определяет locale из Telegram, предоставляет `t()`
- Все UI-тексты через i18n ключи

**4.9 Оптимизация**
- Vite build: **12 КБ gzip** (бюджет < 200 КБ) ✅
- Proxy для dev-сервера
- Минимум зависимостей (только preact + preact-router)

## ⚠️ ОТКЛОНЕНИЯ ОТ ПЛАНА

- Вместо `preact-router` (установлен) используется простой state-based роутинг в `App.tsx` — достаточно для текущего количества экранов, code splitting добавится позже при росте
- `uPlot` для графиков не подключен — использован простой CSS bar chart (ради бюджета 12 КБ). Можно добавить при необходимости
- Реферальная логика в боте только отображает ссылку; запись реферала в БД будет через API при регистрации юзера в Mini App (Этап 5/6)

## 🚧 НЕРЕШЁННЫЕ ВОПРОСЫ

- Нет

## 🔍 РИСКИ РЕГРЕССИИ

- Бот требует `BOT_TOKEN` — без него не запустится (intentional)
- Mini App работает только внутри Telegram WebView (или через dev proxy без auth)
- Существующие тесты не затронуты (19/19 проходят)

## 📦 ГОТОВО ДЛЯ РЕВЬЮВЕРА

**Новые файлы (бот):**
- `packages/bot/src/index.ts` — entry point, регистрация команд
- `packages/bot/src/menu.ts` — setChatMenuButton (WebApp)
- `packages/bot/src/commands/start.ts` — /start с deep linking
- `packages/bot/src/commands/quick-task.ts` — /train с inline-кнопками
- `packages/bot/src/commands/invite.ts` — /invite с реферальной ссылкой

**Новые файлы (webapp):**
- `packages/webapp/vite.config.ts` — Vite + Preact preset
- `packages/webapp/index.html` — HTML entry
- `packages/webapp/src/index.tsx` — render entry
- `packages/webapp/src/app.tsx` — App root с роутингом
- `packages/webapp/src/styles/global.css` — Telegram Theme CSS
- `packages/webapp/src/types/telegram.d.ts` — WebApp SDK types
- `packages/webapp/src/lib/telegram.ts` — SDK утилиты
- `packages/webapp/src/api/client.ts` — API клиент (typed)
- `packages/webapp/src/hooks/useAuth.ts` — auth hook
- `packages/webapp/src/hooks/useI18n.ts` — i18n hook
- `packages/webapp/src/components/NavBar.tsx` — навигация
- `packages/webapp/src/pages/TaskCatalog.tsx` — каталог
- `packages/webapp/src/pages/TaskPlay.tsx` — раннер
- `packages/webapp/src/pages/TaskResult.tsx` — результат
- `packages/webapp/src/pages/Progress.tsx` — прогресс
- `packages/webapp/src/components/tasks/SchulteUI.tsx`
- `packages/webapp/src/components/tasks/SequenceMemoryUI.tsx`
- `packages/webapp/src/components/tasks/ArithmeticUI.tsx`
- `packages/webapp/src/components/tasks/StroopUI.tsx`
- `packages/webapp/src/components/tasks/NumberSeriesUI.tsx`
- `packages/webapp/src/components/tasks/MemoryPairsUI.tsx`
- `packages/webapp/src/components/tasks/PatternSearchUI.tsx`

**На что обратить внимание при ревью:**
- Безопасность quick-task: правильный ответ хранится server-side (Map), не в callback_data
- API client: Authorization header отправляется как `tma <initData>`
- Telegram SDK подключается через `<script>` в HTML (рекомендованный способ)
- Все CSS через Telegram theme variables — авто-темизация

**Верификация:**
- ✅ TypeScript (shared + api + bot + webapp) — без ошибок
- ✅ ESLint — без ошибок
- ✅ Unit-тесты — 19/19
- ✅ Vite build — 12 КБ gzip
