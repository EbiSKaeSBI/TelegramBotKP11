# TelegramFlow Bot

Телеграм-бот для колледжа на Node.js, TypeScript, Prisma и PostgreSQL с поддержкой AI через Flowise.

## 🚀 Возможности

- **🤖 AI-ассистент** - интеллектуальные ответы через Flowise AI
- **📝 Жалобы/предложения** - система обратной связи с админ-панелью
- **🎯 Профориентация** - истории о профессиях от студентов
- **👤 Личный кабинет** - управление профилем пользователя
- **❓ FAQ** - база знаний с управлением из админки
- **🔍 Умный поиск** - поиск ответов через AI
- **🛡️ Права администратора** - расширенная панель управления
- **🗄️ PostgreSQL** - надежное хранение данных через Prisma
- **🐳 Docker** - контейнеризация для простого развертывания

## 🛠️ Технологии

- **Backend**: Node.js, TypeScript
- **Database**: PostgreSQL с Prisma ORM
- **Bot Framework**: Grammy
- **AI Integration**: Flowise API
- **Containerization**: Docker & Docker Compose
- **Environment**: dotenv для конфигурации

## 📋 Быстрый старт

### Вариант 1: Docker (Рекомендуется)

#### 1. Клонируйте репозиторий
```bash
git clone <repository-url>
cd telegramFlow
```

#### 2. Настройте переменные окружения
```bash
cp env.example .env
```

Отредактируйте `.env` файл:
```env
# Telegram token
TELEGRAM_BOT_TOKEN=ваш_токен_бота

# Admins (через запятую)
ADMIN_IDS=123456789,987654321

# Database (для Docker)
DATABASE_URL=postgresql://postgres:1234@postgres:5432/telegramflow

# Flowise AI
FLOWISE_API_URL=https://your-flowise-instance.com/api/v1/prediction/your-flow-id
FLOWISE_API_KEY=ваш_ключ_api
```

#### 3. Запустите с Docker Compose
```bash
# Сборка и запуск
docker compose up --build

# Запуск в фоновом режиме
docker compose up -d --build

# Просмотр логов
docker compose logs -f telegram-bot
```

#### 4. Остановка
```bash
# Остановить сервисы
docker compose down

# Остановить и удалить данные
docker compose down -v
```

### Вариант 2: Локальная установка

#### 1. Установите зависимости
```bash
npm install
```

#### 2. Настройте базу данных
```bash
# Создайте базу PostgreSQL
# Обновите DATABASE_URL в .env

# Запустите миграции
npx prisma migrate dev --name init
npx prisma generate
```

#### 3. Запустите бота
```bash
# Сборка
npm run build

# Запуск
npm start

# Разработка
npm run dev
```

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Описание | Пример |
|------------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота от @BotFather | `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz` |
| `ADMIN_IDS` | ID администраторов (через запятую) | `123456789,987654321` |
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `FLOWISE_API_URL` | URL API Flowise | `https://flowise.example.com/api/v1/prediction/flow-id` |
| `FLOWISE_API_KEY` | Ключ API Flowise | `your-api-key` |

### Структура базы данных

- **Users** - пользователи бота
- **Complaints** - жалобы и предложения
- **ProfessionStories** - истории о профессиях
- **FAQ** - часто задаваемые вопросы

## 📱 Основные команды бота

### Для пользователей
- `/start` - запуск бота
- **📚 Организация образовательного процесса** - информация об учебе
- **🌱 Воспитательный процесс** - воспитательные мероприятия
- **❓ Ответы на часто задаваемые вопросы** - база знаний
- **✉️ Жалоба/Предложение** - обратная связь
- **🧭 Профориентация** - рассказы о профессиях
- **🔍 Поиск ответа** - AI-поиск ответов
- **👤 Личный кабинет** - управление профилем

### Для администраторов
- **🛠️ Админ-панель** - управление системой
- Просмотр и обработка жалоб
- Управление FAQ
- Просмотр историй о профессиях
- Управление пользователями

## 🐳 Docker команды

### Основные команды
```bash
# Сборка и запуск
docker compose up --build

# Запуск в фоне
docker compose up -d

# Остановка
docker compose down

# Просмотр логов
docker compose logs -f

# Пересборка
docker compose up --build --force-recreate
```

### Управление базой данных
```bash
# Запуск миграций
docker compose exec telegram-bot npx prisma migrate deploy

# Генерация Prisma клиента
docker compose exec telegram-bot npx prisma generate

# Резервная копия
docker compose exec postgres pg_dump -U postgres telegramflow > backup.sql

# Восстановление
docker compose exec -T postgres psql -U postgres telegramflow < backup.sql
```

## 🔍 AI интеграция

Бот интегрирован с Flowise AI для предоставления интеллектуальных ответов:

- **Автоматическое форматирование** - Markdown → HTML для Telegram
- **Обработка ошибок** - graceful fallback при недоступности AI
- **Логирование** - детальные логи для отладки
- **Кэширование** - оптимизация производительности

## 📁 Структура проекта

```
telegramFlow/
├── src/
│   ├── Bot.ts                 # Основная логика бота
│   ├── services/              # Сервисы для работы с данными
│   │   ├── complaints.ts      # Обработка жалоб
│   │   ├── faq.ts            # Управление FAQ
│   │   ├── flowise-ai.ts     # Интеграция с AI
│   │   ├── professionStories.ts # Истории о профессиях
│   │   └── users.ts          # Управление пользователями
│   ├── middleware.ts         # Middleware для сессий
│   ├── types.ts              # TypeScript типы
│   └── constants.ts          # Константы
├── prisma/
│   ├── schema.prisma         # Схема базы данных
│   └── migrations/           # Миграции БД
├── docker-compose.yml        # Docker Compose конфигурация
├── Dockerfile               # Docker образ
├── .dockerignore           # Исключения для Docker
└── env.example             # Пример переменных окружения
```

## 🚨 Устранение неполадок

### Частые проблемы

#### 1. Ошибка подключения к базе данных
```bash
# Проверьте статус PostgreSQL
docker compose ps

# Проверьте логи
docker compose logs postgres
```

#### 2. Бот не отвечает
```bash
# Проверьте токен бота
# Проверьте логи приложения
docker compose logs telegram-bot
```

#### 3. AI не работает
```bash
# Проверьте переменные Flowise
# Проверьте доступность API
curl -X POST $FLOWISE_API_URL
```

#### 4. Ошибки Docker
```bash
# Очистите Docker кэш
docker system prune -a

# Пересоберите образы
docker compose build --no-cache
```

### Логи и отладка

```bash
# Просмотр логов в реальном времени
docker compose logs -f telegram-bot

# Просмотр логов базы данных
docker compose logs postgres

# Подключение к контейнеру
docker compose exec telegram-bot sh
```

## 🔒 Безопасность

- **Переменные окружения** - никогда не коммитьте `.env` файлы
- **Docker secrets** - используйте для production
- **Non-root user** - контейнеры запускаются от непривилегированного пользователя
- **Health checks** - автоматическая проверка состояния сервисов

## 📈 Производительность

- **Multi-stage builds** - оптимизированные Docker образы
- **Connection pooling** - эффективное использование БД
- **Caching** - кэширование частых запросов
- **Rate limiting** - защита от спама

## 🤝 Разработка

### Добавление новых функций

1. Создайте сервис в `src/services/`
2. Добавьте типы в `src/types.ts`
3. Обновите схему БД в `prisma/schema.prisma`
4. Добавьте обработчики в `src/Bot.ts`
5. Протестируйте с Docker

### Линтинг и форматирование

```bash
# Проверка кода
npm run lint

# Исправление ошибок
npm run lint -- --fix
````
---

**TelegramFlow Bot** - современное решение для автоматизации обратной связи в образовательных учреждениях. 