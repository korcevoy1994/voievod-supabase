# PDF Ticket Generation API Documentation

Эта документация описывает API для генерации и управления PDF билетами в системе бронирования.

## Обзор

Система генерации PDF билетов включает:
- Генерацию PDF билетов с QR кодами
- Автоматическое сохранение в Supabase Storage
- API для получения списка сохраненных билетов
- Публичные URL для доступа к файлам

## API Endpoints

### 1. Генерация PDF билета

**Endpoint:** `GET /api/tickets/pdf`

**Параметры:**
- `orderId` (required) - ID заказа для генерации билета

**Пример запроса:**
```bash
curl "http://localhost:3001/api/tickets/pdf?orderId=c9feb847-1434-4e0d-9f37-b74aa4fa90fb" \
  -o ticket.pdf
```

**Ответ:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="ticket-{orderId}.pdf"`
- X-PDF-URL: Публичный URL сохраненного файла в Supabase Storage

**Функциональность:**
- Загружает данные заказа из базы данных
- Генерирует QR код для верификации
- Создает PDF с информацией о билете
- Сохраняет PDF в Supabase Storage bucket 'tickets'
- Возвращает PDF файл для скачивания

### 2. Список сохраненных билетов

**Endpoint:** `GET /api/tickets/list`

**Параметры:**
- `orderId` (optional) - Фильтр по ID заказа

**Пример запросов:**
```bash
# Все билеты
curl "http://localhost:3001/api/tickets/list"

# Билеты конкретного заказа
curl "http://localhost:3001/api/tickets/list?orderId=c9feb847-1434-4e0d-9f37-b74aa4fa90fb"
```

**Ответ:**
```json
{
  "files": [
    {
      "name": "ticket-{orderId}-{timestamp}.pdf",
      "size": 165437,
      "created_at": "2025-07-27T08:34:46.401Z",
      "updated_at": "2025-07-27T08:34:46.401Z",
      "url": "https://...supabase.co/storage/v1/object/public/tickets/tickets/..."
    }
  ],
  "total": 1
}
```

## Структура PDF билета

Генерируемый PDF содержит:

1. **Заголовок события**
   - Название: "VOEVODA"
   - Дата и время
   - Место проведения

2. **Информация о заказе**
   - ID заказа
   - Имя и фамилия покупателя
   - Email
   - Статус заказа

3. **Детали билетов**
   - Места (зона, ряд, номер, цена)
   - General Access билеты (если есть)
   - Общая стоимость

4. **QR код для верификации**
   - Формат: `ORDER:{orderId}:{timestamp}`
   - Размер: 80x80 пикселей

## Supabase Storage

### Bucket Configuration
- **Название:** `tickets`
- **Публичный доступ:** Да
- **Структура папок:** `tickets/ticket-{orderId}-{timestamp}.pdf`

### Создание bucket
```javascript
const { data, error } = await supabase.storage.createBucket('tickets', {
  public: true
});
```

## Технические детали

### Библиотеки
- **jsPDF** - Генерация PDF
- **qrcode** - Создание QR кодов
- **@supabase/supabase-js** - Работа с базой данных и Storage

### Замена pdfkit
Система была обновлена с `pdfkit` на `jsPDF` для решения проблем совместимости:
- `pdfkit` версии 0.15.0 несовместим с новыми версиями Next.js и SWC
- `jsPDF` обеспечивает лучшую совместимость и производительность

### Обработка ошибок
- При ошибке сохранения в Storage, PDF возвращается напрямую
- Логирование всех ошибок в консоль
- Graceful fallback для всех операций

## Примеры использования

### Скачивание билета в браузере
```javascript
const downloadPDF = async (orderId) => {
  const response = await fetch(`/api/tickets/pdf?orderId=${orderId}`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket-${orderId}.pdf`;
  a.click();
};
```

### Получение списка билетов
```javascript
const getTickets = async (orderId) => {
  const response = await fetch(`/api/tickets/list?orderId=${orderId}`);
  const data = await response.json();
  return data.files;
};
```

## Безопасность

- Все операции требуют валидный `orderId`
- Проверка существования заказа в базе данных
- QR коды содержат timestamp для уникальности
- Публичные URL защищены политиками Supabase

## Мониторинг

- Логирование успешных операций
- Детальное логирование ошибок
- Метрики размера файлов
- Отслеживание времени генерации

## Будущие улучшения

1. **Кэширование PDF** - Избежать повторной генерации
2. **Batch операции** - Генерация нескольких билетов
3. **Шаблоны** - Кастомизация дизайна билетов
4. **Водяные знаки** - Защита от подделки
5. **Сжатие** - Оптимизация размера файлов