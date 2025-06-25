# TelegramFlow Bot

Телеграм-бот для колледжа на Node.js, TypeScript, Prisma и PostgreSQL.

## Возможности
- Жалобы/предложения с админ-панелью и статусами
- Истории о профессии
- Личный кабинет пользователя
- FAQ с управлением из админки
- Поиск ответа через AI (Flowise)
- Права администратора
- Хранение всех данных в PostgreSQL через Prisma

## Быстрый старт

### 1. Клонируйте репозиторий и установите зависимости
```sh
npm install
```

### 2. Настройте переменные окружения
Создайте файл `.env` в корне проекта:
```
TELEGRAM_BOT_TOKEN=ваш_токен_бота
DATABASE_URL=postgresql://user:password@localhost:5432/dbname?schema=public
ADMIN_IDS=123456789,987654321
```
- `TELEGRAM_BOT_TOKEN` — токен Telegram-бота
- `DATABASE_URL` — строка подключения к вашей базе PostgreSQL
- `ADMIN_IDS` — через запятую ID Telegram администраторов

### 3. Настройте Prisma и базу данных
```sh
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Запустите бота
```sh
npm run build
npm start
```

## Структура проекта
- `src/Bot.ts` — основной код бота
- `src/services/` — работа с БД через Prisma (жалобы, FAQ, пользователи, истории)
- `src/middleware.ts` — middleware для сессий и прав
- `prisma/schema.prisma` — схема БД

## Основные команды
- `/start` — запуск бота
- Кнопки меню — навигация по функциям
- Админ-панель — доступна только администраторам

## FAQ
- Все часто задаваемые вопросы и ответы хранятся в базе и управляются через админ-панель.

## Требования
- Node.js 18+
- PostgreSQL

## Полезные команды
- Открыть Prisma Studio для просмотра БД:
  ```sh
  npx prisma studio
  ```

---

Если возникли вопросы — пишите! 