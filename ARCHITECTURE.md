# 🏗️ Brainify — Архитектура

## Стек технологий

| Компонент | Технология | Версия |
|-----------|------------|--------|
| Runtime | Node.js | ≥ 20 LTS |
| Язык | TypeScript | ≥ 5.x |
| API-сервер | Fastify | 5.x |
| ORM | Drizzle ORM | latest |
| БД | PostgreSQL | 16 |
| Кэш / очереди | Redis | 7 |
| Telegram-бот | grammY | 1.x |
| Фронтенд | Preact + Vite | Preact 10.x, Vite 6.x |
| Хостинг | VPS (Docker Compose + Nginx + Let's Encrypt) | — |

## Структура monorepo

```
brainify/
├── packages/
│   ├── api/          # Fastify API-сервер
│   ├── bot/          # grammY Telegram-бот
│   ├── webapp/       # Preact Mini App (Vite)
│   └── shared/       # Общие типы, генераторы заданий, i18n
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── package.json      # Корневой (workspaces)
├── tsconfig.base.json
├── .eslintrc.cjs
├── .prettierrc
└── ARCHITECTURE.md
```

## Пакеты

### `packages/shared`
- Типы и интерфейсы (`TaskDefinition`, DTO)
- Генераторы заданий (Шульте, арифметика, Stroop и т.д.)
- i18n — утилита доступа к переводам, файлы локалей (`locales/ru.json`, `locales/en.json`)

### `packages/api`
- Fastify-сервер
- Drizzle ORM — схема БД, миграции
- Авторизация через Telegram `initData` (HMAC-SHA256)
- REST-эндпоинты: users, tasks, attempts, progress, leaderboard, duels, friends, subscription
- Rate limiting
- Сервисы: streaks, achievements, share-card, referral, subscription

### `packages/bot`
- grammY — обработка команд (`/start`, `/invite`, быстрое задание)
- Кнопка-меню WebApp (открывает Mini App)
- Уведомления: дуэли, рейтинг, streak-напоминания
- Платежи: Telegram Payments, Stars
- Ежедневные напоминания (BullMQ + Redis)

### `packages/webapp`
- Preact + Vite
- Telegram WebApp JS SDK
- Страницы: каталог заданий, прохождение, результат, прогресс, лидерборд, дуэли, профиль, подписка
- Компоненты заданий: Шульте, последовательность, арифметика, Stroop, числовой ряд, пары, паттерн
- i18n — мультиязычный UI (ru/en)
- Бюджет бандла: ≤ 200 КБ gzip

## База данных

Основные таблицы (Drizzle ORM):
- `users` — Telegram ID, язык, дата регистрации, подписка
- `tasks` — шаблоны заданий (тип, категория, параметры)
- `task_attempts` — результаты прохождений (user, task, очки, время)
- `friendships` — связи между пользователями
- `duels` — вызовы на дуэль (инициатор, соперник, задание, статус)
- `subscriptions` — статус подписки (trial/active/free)
- `referrals` — реферальные связи
- `achievements` — достижения пользователей
- `streaks` — серии дней активности

## Безопасность

- Авторизация **только** через Telegram `initData` с HMAC-SHA256 валидацией
- Секреты — только через переменные окружения (`.env`), никогда в коде
- Rate limiting на API с первого дня
- HTTPS через Let's Encrypt (Nginx reverse proxy)

## Локализация

- Языки: Русский (`ru`), Английский (`en`)
- Язык определяется из Telegram `initData.user.language_code`
- Возможность переключения в настройках Mini App
- Все тексты — через i18n, никаких захардкоженных строк

## Монетизация

- Trial: 7 дней полного доступа
- Free: 3 задания/день, без PvP, без детальных графиков
- Premium: полный доступ, оплата через Telegram Payments / Stars
- Реферальные бонусы: +3 дня trial обоим

## Деплой

- Docker Compose (PostgreSQL, Redis, API, Bot, Nginx)
- CI/CD: GitHub Actions → сборка → тесты → деплой на VPS по SSH
- Nginx reverse proxy + Let's Encrypt (HTTPS)
- Мониторинг: Sentry, healthcheck-эндпоинт
