# MAIB Payment Integration

Этот документ описывает интеграцию платежной системы MAIB в приложение Voevoda.

## Обзор

Интеграция включает в себя:
- MAIB API клиент для работы с платежами
- API маршруты для создания и обработки платежей
- Callback обработчик для уведомлений от MAIB
- Обновленный UI для выбора способа оплаты
- Обработка возврата пользователя после оплаты

## Файлы интеграции

### Backend
- `src/lib/maib-client.ts` - MAIB API клиент
- `src/app/api/payments/maib/route.ts` - API для работы с MAIB платежами
- `src/app/api/payments/maib/callback/route.ts` - Callback обработчик
- `src/app/api/orders/[orderId]/payment/route.ts` - Обновленный API для платежей заказов

### Frontend
- `src/app/checkout/page.tsx` - Обновленная страница checkout с MAIB
- `src/app/checkout/success/page.tsx` - Обновленная страница успеха

### Конфигурация
- `.env.example` - Пример переменных окружения

## Настройка

### 1. Переменные окружения

Добавьте следующие переменные в ваш `.env.local` файл:

```env
# MAIB Payment Gateway
MAIB_PROJECT_ID=your_maib_project_id
MAIB_PROJECT_SECRET=your_maib_project_secret
MAIB_SIGNATURE_KEY=your_maib_signature_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Получение учетных данных MAIB

1. Зарегистрируйтесь в MAIB Merchant Portal
2. Создайте новый проект
3. Получите:
   - Project ID
   - Project Secret
   - Signature Key

### 3. Настройка callback URL

В настройках проекта MAIB укажите callback URL:
```
https://yourdomain.com/api/payments/maib/callback
```

## Структура базы данных

Для работы с MAIB платежами необходима таблица `payments`:

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MDL',
  provider VARCHAR(50) NOT NULL,
  provider_payment_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  provider_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

## Процесс оплаты

### 1. Создание платежа

1. Пользователь выбирает товары и переходит к checkout
2. Выбирает способ оплаты "Card bancar (MAIB)"
3. Заполняет данные и нажимает "Plătește"
4. Создается заказ через `/api/orders`
5. Инициируется платеж через `/api/orders/[orderId]/payment`
6. Пользователь перенаправляется на страницу оплаты MAIB

### 2. Обработка callback

1. MAIB отправляет уведомление на `/api/payments/maib/callback`
2. Проверяется подпись уведомления
3. Обновляется статус платежа в базе данных
4. Обновляется статус заказа
5. Генерируется QR код для успешных платежей

### 3. Возврат пользователя

1. После оплаты пользователь возвращается на `/checkout/success`
2. Проверяется статус платежа
3. Показывается соответствующее сообщение

## API Endpoints

### POST /api/payments/maib
Создание нового MAIB платежа

**Параметры:**
```json
{
  "orderId": "uuid",
  "amount": 100.00,
  "currency": "MDL",
  "description": "Описание платежа",
  "returnUrl": "https://yourdomain.com/success",
  "language": "ro"
}
```

### GET /api/payments/maib/[transactionId]
Получение информации о платеже

### POST /api/payments/maib/callback
Callback для уведомлений от MAIB

### POST /api/orders/[orderId]/payment
Инициация платежа для заказа

**Параметры:**
```json
{
  "paymentMethod": "card",
  "paymentProvider": "maib",
  "returnUrl": "https://yourdomain.com/success",
  "language": "ro"
}
```

## Статусы платежей

### Статусы MAIB → Наши статусы
- `COMPLETED`, `SUCCESS`, `APPROVED` → `completed`
- `FAILED`, `DECLINED`, `ERROR` → `failed`
- `CANCELLED`, `CANCELED` → `cancelled`
- `PENDING`, `PROCESSING`, `WAITING` → `pending`

## Безопасность

1. **Проверка подписи**: Все callback уведомления проверяются на подлинность
2. **HTTPS**: Все взаимодействия происходят по HTTPS
3. **Переменные окружения**: Секретные ключи хранятся в переменных окружения
4. **Валидация**: Все входящие данные валидируются

## Тестирование

### Тестовые данные MAIB

Для тестирования используйте тестовые учетные данные от MAIB:
- Тестовые карты
- Тестовый Project ID
- Тестовый Signature Key

### Локальное тестирование callback

Для тестирования callback локально используйте ngrok:

```bash
ngrok http 3000
```

И укажите ngrok URL в настройках MAIB проекта.

## Мониторинг и логирование

- Все операции логируются в консоль
- Ошибки платежей сохраняются в `provider_data`
- Callback уведомления логируются с полной информацией

## Возможные проблемы

### 1. Callback не приходит
- Проверьте URL в настройках MAIB
- Убедитесь, что сервер доступен извне
- Проверьте логи сервера

### 2. Ошибка подписи
- Проверьте правильность Signature Key
- Убедитесь в правильности алгоритма подписи

### 3. Платеж не обрабатывается
- Проверьте статус в MAIB Merchant Portal
- Проверьте логи callback обработчика
- Убедитесь в правильности маппинга статусов

## Поддержка

Для получения поддержки:
1. Проверьте документацию MAIB
2. Обратитесь в техническую поддержку MAIB
3. Проверьте логи приложения