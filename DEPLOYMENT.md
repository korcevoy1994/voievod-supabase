# 🚀 Развертывание VOEV Scanner

## 📋 Перед развертыванием

1. **Убедитесь что основной сервер VOEV работает** и доступен
2. **Проверьте API эндпоинты** на основном сервере:
   - `POST /api/tickets/scan` 
   - `GET /api/tickets/scan`
3. **Настройте CORS** на основном сервере для поддомена сканнера

---

## 🌐 Развертывание на Vercel (Рекомендуется)

### Шаг 1: Подготовка
```bash
# Установите Vercel CLI
npm install -g vercel

# Войдите в аккаунт
vercel login
```

### Шаг 2: Первоначальное развертывание
```bash
# Из директории проекта
vercel

# Следуйте инструкциям:
# ? Set up and deploy "~/voev-scanner"? [Y/n] y
# ? Which scope should contain your project? [your-team]
# ? What's your project's name? voev-scanner
# ? In which directory is your code located? ./
```

### Шаг 3: Настройка переменных окружения
```bash
# Добавьте переменную с URL основного сервера
vercel env add MAIN_SERVER_URL

# Введите значение, например:
# https://voev.yourdomain.com
```

### Шаг 4: Настройка поддомена
1. Перейдите в Vercel Dashboard
2. Выберите проект `voev-scanner`
3. Перейдите в Settings → Domains
4. Добавьте домен: `scanner.yourdomain.com`
5. Настройте DNS записи у вашего провайдера:
   ```
   Type: CNAME
   Name: scanner
   Value: cname.vercel-dns.com
   ```

### Шаг 5: Финальное развертывание
```bash
# Деплой в продакшн
vercel --prod
```

---

## 🔧 Развертывание на собственном сервере

### Требования
- Node.js 18+
- Nginx (рекомендуется)
- SSL сертификат (обязательно для камеры)

### Шаг 1: Сборка проекта
```bash
npm install
npm run build
```

### Шаг 2: Запуск в продакшн
```bash
# С помощью PM2 (рекомендуется)
npm install -g pm2
pm2 start npm --name "voev-scanner" -- start

# Или обычный запуск
npm start
```

### Шаг 3: Настройка Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name scanner.yourdomain.com;

    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Редирект с HTTP на HTTPS
server {
    listen 80;
    server_name scanner.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 🐳 Развертывание с Docker

### Dockerfile уже создан, запуск:
```bash
# Сборка образа
docker build -t voev-scanner .

# Запуск контейнера
docker run -p 3000:3000 \
  -e MAIN_SERVER_URL=https://voev.yourdomain.com \
  voev-scanner
```

### Docker Compose
```yaml
version: '3.8'
services:
  voev-scanner:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MAIN_SERVER_URL=https://voev.yourdomain.com
    restart: unless-stopped
```

---

## 🔐 SSL/HTTPS Настройка

⚠️ **ВАЖНО**: HTTPS обязателен для работы камеры в браузерах!

### Получение SSL сертификата (Let's Encrypt)
```bash
# Установка certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d scanner.yourdomain.com

# Автоматическое обновление
sudo crontab -e
# Добавьте строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🔄 Настройка CORS на основном сервере

### Next.js (основной сервер VOEV)
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://scanner.yourdomain.com'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      }
    ]
  }
}
```

---

## 📱 Тестирование развертывания

### Чек-лист после развертывания:

1. **HTTPS работает** ✅
   - Зайдите на https://scanner.yourdomain.com
   - Убедитесь что нет ошибок SSL

2. **Камера доступна** ✅
   - Откройте сканнер
   - Нажмите "Запустить сканер"
   - Браузер должен запросить разрешение на камеру

3. **API работает** ✅
   - Проверьте в Network вкладке браузера
   - Должны быть запросы к `/api/scan/stats`

4. **Сканирование работает** ✅
   - Отсканируйте тестовый QR код
   - Должен появиться результат валидации

### Тестовые QR коды
Используйте существующие билеты из основного сервера для тестирования.

---

## 🔧 Устранение неполадок

### Проблема: Камера не работает
**Решение:**
- Убедитесь что используется HTTPS
- Проверьте разрешения браузера
- Откройте в приватном режиме для очистки кеша

### Проблема: API не отвечает
**Решение:**
- Проверьте `MAIN_SERVER_URL` в переменных окружения
- Убедитесь что основной сервер доступен
- Проверьте CORS настройки

### Проблема: 502 Bad Gateway
**Решение:**
- Проверьте что приложение запущено (порт 3000)
- Перезапустите Nginx
- Проверьте логи: `sudo tail -f /var/log/nginx/error.log`

---

## 📊 Мониторинг

### PM2 Dashboard
```bash
# Статус приложения
pm2 status

# Логи
pm2 logs voev-scanner

# Мониторинг
pm2 monit
```

### Полезные команды
```bash
# Рестарт приложения
pm2 restart voev-scanner

# Обновление приложения
git pull
npm install
npm run build
pm2 restart voev-scanner
```

---

## 🎯 После успешного развертывания

1. **Протестируйте на разных устройствах**
2. **Обучите персонал работе с сканнером**
3. **Настройте мониторинг и алерты**
4. **Подготовьте план обновлений**

**🎉 Ваш VOEV Scanner готов к работе!** 