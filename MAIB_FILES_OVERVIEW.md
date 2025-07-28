# Обзор всех файлов MAIB в проекте

## Основные файлы интеграции

### 1. Клиент MAIB API
**Файл:** `src/lib/maib-client.ts`
- Основной клиент для работы с MAIB API
- Содержит методы для создания платежей, получения информации о платежах, возвратов
- Обрабатывает аутентификацию и генерацию токенов
- **ИСПРАВЛЕНО:** Переменные окружения теперь используют правильные имена (MAIB_PROJECT_ID, MAIB_PROJECT_SECRET, MAIB_SIGNATURE_KEY)

### 2. API маршруты для платежей

#### `src/app/api/payments/maib/route.ts`
- POST: Создание нового MAIB платежа
- GET: Получение статуса MAIB платежа
- **ИСПРАВЛЕНО:** Использует NEXT_PUBLIC_APP_URL вместо NEXT_PUBLIC_BASE_URL

#### `src/app/api/payments/maib/callback/route.ts`
- POST: Обработка callback уведомлений от MAIB
- GET: Проверка доступности endpoint
- Проверяет подпись callback и обновляет статусы платежей

#### `src/app/api/orders/[orderId]/payment/route.ts`
- Обработка платежей для конкретных заказов
- Поддерживает MAIB как провайдера платежей

### 3. Тестовые файлы

#### `src/app/api/test-maib/env/route.ts`
- Проверка переменных окружения MAIB
- **ИСПРАВЛЕНО:** Использует правильные имена переменных окружения

#### `src/app/api/test-maib/token/route.ts`
- Тестирование генерации токена доступа MAIB
- **ИСПРАВЛЕНО:** Использует правильные имена переменных окружения

#### `src/app/api/test-maib/payment/route.ts`
- Создание тестовых платежей MAIB
- **ИСПРАВЛЕНО:** Callback URL теперь указывает на правильный endpoint

#### `src/app/test-maib/page.tsx`
- Веб-интерфейс для тестирования интеграции MAIB
- Позволяет проверить переменные окружения, генерацию токенов и создание платежей

### 4. Frontend интеграция

#### `src/app/checkout/page.tsx`
- Страница оформления заказа с поддержкой MAIB
- Позволяет выбрать MAIB как способ оплаты

#### `src/app/checkout/success/page.tsx`
- Страница успешного завершения платежа
- Обрабатывает возврат пользователя после оплаты через MAIB

### 5. Документация

#### `docs/MAIB_INTEGRATION.md`
- Полная документация по интеграции MAIB
- Описание настройки, API endpoints, статусов платежей
- Руководство по тестированию и решению проблем

#### `MAIB` (файл документации API)
- Документация по API MAIB e-commerce
- Описание взаимодействия через HTTPS-запросы

## Исправленные проблемы

### 1. Неправильные имена переменных окружения
**Было:** `process.env.projectId`, `process.env.projectSecret`, `process.env.signatureKey`
**Стало:** `process.env.MAIB_PROJECT_ID`, `process.env.MAIB_PROJECT_SECRET`, `process.env.MAIB_SIGNATURE_KEY`

**Затронутые файлы:**
- `src/lib/maib-client.ts`
- `src/app/api/test-maib/env/route.ts`
- `src/app/api/test-maib/token/route.ts`

### 2. Неправильная переменная для базового URL
**Было:** `process.env.NEXT_PUBLIC_BASE_URL`
**Стало:** `process.env.NEXT_PUBLIC_APP_URL`

**Затронутые файлы:**
- `src/app/api/payments/maib/route.ts`

### 3. Неправильный callback URL
**Было:** `/api/maib/callback`
**Стало:** `/api/payments/maib/callback`

**Затронутые файлы:**
- `src/app/api/test-maib/payment/route.ts`

## Необходимые переменные окружения

Для работы MAIB интеграции необходимо настроить следующие переменные в `.env.local`:

```env
# MAIB Payment Gateway
MAIB_PROJECT_ID=your_maib_project_id
MAIB_PROJECT_SECRET=your_maib_project_secret
MAIB_SIGNATURE_KEY=your_maib_signature_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
```

## Следующие шаги для исправления проблемы

1. **Обновите переменные окружения в Vercel:**
   - Добавьте `MAIB_PROJECT_ID`
   - Добавьте `MAIB_PROJECT_SECRET`
   - Добавьте `MAIB_SIGNATURE_KEY`
   - Убедитесь, что `NEXT_PUBLIC_APP_URL` указывает на ваш Vercel домен

2. **Настройте callback URL в MAIB Merchant Portal:**
   - URL: `https://your-vercel-domain.vercel.app/api/payments/maib/callback`

3. **Протестируйте интеграцию:**
   - Откройте `/test-maib` на вашем сайте
   - Проверьте все три теста: переменные окружения, генерация токена, создание платежа

4. **Проверьте логи Vercel:**
   - Откройте Vercel Dashboard
   - Перейдите в Functions → View Function Logs
   - Проверьте ошибки в API маршрутах MAIB

После внесения этих изменений интеграция MAIB должна работать корректно на Vercel.