# VOEV - Система бронирования билетов

Современная система бронирования билетов для мероприятий с интерактивной картой мест.

## 🚀 Быстрый старт

1. Клонируйте репозиторий
2. Установите зависимости: `npm install`
3. Настройте переменные окружения (см. `.env.example`)
4. Запустите проект: `npm run dev`

## 📚 Документация

Вся документация проекта находится в папке [`docs/`](./docs/):

- **[SUPABASE_INTEGRATION_COMPLETE.md](./docs/SUPABASE_INTEGRATION_COMPLETE.md)** - Полная интеграция с Supabase
- **[MAIB_INTEGRATION.md](./docs/MAIB_INTEGRATION.md)** - Интеграция платежной системы MAIB
- **[DATABASE_README.md](./docs/DATABASE_README.md)** - Документация по базе данных
- **[SQL_README.md](./docs/SQL_README.md)** - Описание SQL скриптов
- **[PDF_API_DOCUMENTATION.md](./docs/PDF_API_DOCUMENTATION.md)** - API для генерации PDF
- **[CLEANUP_SYSTEM.md](./docs/CLEANUP_SYSTEM.md)** - Система очистки данных
- **[SUPABASE_STRUCTURE.md](./docs/SUPABASE_STRUCTURE.md)** - Структура Supabase
- **[SUPABASE_EXPORT_GUIDE.md](./docs/SUPABASE_EXPORT_GUIDE.md)** - Руководство по экспорту

## 🗂️ Структура проекта

```
├── docs/           # Документация проекта
├── sql/            # SQL скрипты
├── src/            # Исходный код
│   ├── app/        # Next.js App Router
│   ├── components/ # React компоненты
│   └── lib/        # Утилиты и библиотеки
├── database/       # Скрипты инициализации БД
└── scripts/        # Вспомогательные скрипты
```

## 🛠️ Технологии

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **База данных**: Supabase (PostgreSQL)
- **Платежи**: MAIB
- **PDF**: jsPDF

## 📄 Лицензия

MIT License