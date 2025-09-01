# 🚀 Быстрая настройка VOEV Scanner

## ✅ Что готово

Автономный сканнер билетов с прямым подключением к Supabase:

- ✅ **Next.js 15** с TypeScript и Tailwind CSS
- ✅ **Прямое Supabase подключение** - без основного сервера
- ✅ **QR сканнер** с html5-qrcode библиотекой  
- ✅ **Адаптивный дизайн** для всех устройств
- ✅ **Real-time статистика** прямо из базы данных
- ✅ **Звуковые уведомления** при сканировании
- ✅ **Автономная работа** - независимо от VOEV сервера
- ✅ **Docker** конфигурация
- ✅ **Vercel** конфигурация

## 🔧 Настройка за 3 шага

### 1. Настройте переменные окружения
```bash
echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key" > .env.local
```

### 2. Установите зависимости и соберите
```bash
npm install
npm run build
```

### 3. Запустите или разверните
```bash
# Локально
npm start

# Или разверните на Vercel
vercel --prod
```

## 🌐 Развертывание на поддомене

1. **Vercel (рекомендуется)**:
   ```bash
   vercel
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   # Добавьте домен в Vercel Dashboard
   ```

2. **Собственный сервер**:
   ```bash
   # Запуск с PM2
   pm2 start npm --name "voev-scanner" -- start
   
   # Настройка Nginx (см. DEPLOYMENT.md)
   ```

## ⚠️ Важные требования

1. **HTTPS обязателен** - камера не работает без SSL
2. **Настройте RLS в Supabase** - для безопасного доступа
3. **Проверьте структуру БД** - убедитесь что таблицы существуют

## 🗄️ Структура базы данных

Сканнер ожидает следующие таблицы в Supabase:

### tickets
```sql
id: uuid
order_id: uuid (foreign key)
event_id: uuid
qr_code: text (unique)
seat_id: uuid (nullable)
status: text ('active', 'used', 'cancelled', 'pending')
used_at: timestamp (nullable)
created_at: timestamp
```

### orders
```sql
id: uuid
holder_name: text
holder_email: text
event_id: uuid
total_price: numeric
```

### seats (optional)
```sql
id: uuid
zone_id: uuid
row_number: text
seat_number: text
```

### zones (optional)
```sql
id: uuid
name: text
price: numeric
```

## 🔒 Настройка RLS в Supabase

Добавьте политики безопасности:

```sql
-- Разрешить чтение билетов
CREATE POLICY "Allow ticket read" ON tickets FOR SELECT USING (true);

-- Разрешить обновление статуса билетов
CREATE POLICY "Allow ticket status update" ON tickets FOR UPDATE USING (true);

-- Разрешить чтение заказов
CREATE POLICY "Allow order read" ON orders FOR SELECT USING (true);
```

## 📱 API Endpoints

Сканнер использует внутренние endpoints:

- `POST /api/scan` - Сканирование билета
- `GET /api/scan` - Получение статистики

## 🎯 После развертывания

1. Откройте https://scanner.yourdomain.com
2. Разрешите доступ к камере
3. Проверьте подключение к Supabase
4. Нажмите "Запустить сканер"
5. Отсканируйте тестовый QR код

## 🔍 Тестирование

### Проверка подключения к Supabase
```javascript
// В консоли браузера
fetch('/api/scan')
  .then(r => r.json())
  .then(console.log)
```

### Тест сканирования
Создайте тестовый QR код с содержимым билета из вашей БД.

## 🚫 Ограничения

- Требуется интернет соединение для Supabase
- HTTPS обязателен для камеры
- Зависит от структуры БД Supabase

## 🎯 Преимущества новой архитектуры

✅ **Автономность** - Не зависит от основного сервера VOEV  
✅ **Скорость** - Прямые запросы к базе данных  
✅ **Надежность** - Меньше точек отказа  
✅ **Простота** - Один проект вместо двух  
✅ **Масштабируемость** - Легко создать множество сканнеров  

## 📞 Поддержка

Полная документация в файлах:
- `README.md` - детальное описание
- `DEPLOYMENT.md` - инструкции по развертыванию

### Проблемы и решения:

**Ошибка подключения к Supabase**
- Проверьте URL и ключи в `.env.local`
- Убедитесь что проект Supabase активен

**Билеты не находятся**
- Проверьте структуру таблицы `tickets`
- Убедитесь что QR коды в правильном формате

**Камера не работает**
- Используйте HTTPS
- Проверьте разрешения браузера

**🎉 Ваш автономный сканнер готов к работе!** 