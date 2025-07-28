# Система безопасного управления сессиями

## Обзор

Новая система управления сессиями основана на лучших практиках безопасности OWASP и обеспечивает:

- Криптографически стойкие идентификаторы сессий
- Отпечатки браузера для дополнительной безопасности
- Автоматическое истечение сессий
- Защита от атак фиксации сессий
- Валидация и санитизация данных
- Rate limiting для API

## Архитектура

### Основные компоненты

1. **SecureSessionManager** (`/src/lib/secureSessionManager.ts`)
   - Управление жизненным циклом сессий
   - Генерация безопасных идентификаторов
   - Валидация и отпечатки браузера

2. **Session Middleware** (`/src/middleware/sessionMiddleware.ts`)
   - Валидация сессий на уровне API
   - Rate limiting
   - Санитизация данных
   - Установка заголовков безопасности

3. **API Integration** (`/src/app/api/orders/route.ts`)
   - Защищенные эндпоинты
   - Валидация пользователей
   - Проверка соответствия сессий

## Безопасность

### Генерация сессий

```typescript
// Криптографически стойкий ID
const randomBytes = crypto.randomBytes(32)
const timestamp = Date.now().toString(36)
const random = randomBytes.toString('hex')
return `sess_${timestamp}_${random}`
```

### Отпечатки браузера

```typescript
const components = [
  navigator.userAgent,
  navigator.language,
  screen.width + 'x' + screen.height,
  screen.colorDepth,
  new Date().getTimezoneOffset(),
  navigator.platform,
  navigator.cookieEnabled ? '1' : '0'
]
```

### Валидация сессий

- Проверка истечения времени
- Проверка периода неактивности
- Сравнение отпечатков браузера
- Проверка целостности данных

## Конфигурация

```typescript
interface SessionConfig {
  sessionTimeout: number        // 24 часа по умолчанию
  maxInactivePeriod: number    // 2 часа по умолчанию
  enableFingerprinting: boolean // true по умолчанию
  secureStorage: boolean       // true по умолчанию
}
```

## API Middleware

### Уровни доступа

1. **Public Access** - открытые эндпоинты
2. **Protected Access** - требуют валидную сессию
3. **Admin Access** - требуют административные права

### Rate Limiting

- 100 запросов в минуту для обычных пользователей
- 1000 запросов в минуту для администраторов
- Блокировка по IP при превышении лимитов

### Санитизация данных

```typescript
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>"'&]/g, '') // Удаление потенциально опасных символов
    .substring(0, 1000) // Ограничение длины
}
```

## Использование

### Создание сессии

```typescript
import { SecureSessionManager } from '@/lib/secureSessionManager'

const sessionManager = new SecureSessionManager()
const { sessionId, userId, isNew } = sessionManager.getOrCreateSession()
```

### Валидация сессии

```typescript
import { validateCurrentSession } from '@/lib/secureSessionManager'

const isValid = validateCurrentSession()
```

### Защищенные API эндпоинты

```typescript
import { withProtectedAccess } from '@/middleware/sessionMiddleware'

export const POST = withProtectedAccess(async (request, sessionData) => {
  // Логика обработки запроса
  // sessionData содержит информацию о валидной сессии
})
```

## Обратная совместимость

Система поддерживает старые форматы сессий:

- UUID формат: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Пользовательский формат: `user-{timestamp}-{random}`
- Новый безопасный формат: `sess_{timestamp}_{crypto_random}`

## Мониторинг

### Статистика сессий

```typescript
import { getSessionStats } from '@/lib/secureSessionManager'

const stats = getSessionStats()
// {
//   totalSessions: number,
//   activeSessions: number,
//   expiredSessions: number
// }
```

### Логирование

- Создание новых сессий
- Неудачные попытки валидации
- Превышение rate limits
- Подозрительная активность

## Очистка данных

### Автоматическая очистка

- Истекшие сессии удаляются каждые 5 минут
- Временные пользователи очищаются через 7 дней
- Неактивные сессии удаляются через 2 часа

### Ручная очистка

```typescript
import { clearSessionUserId } from '@/lib/secureSessionManager'

clearSessionUserId() // Очищает все данные сессии
```

## Рекомендации по безопасности

1. **Регулярно обновляйте сессии** - используйте `extendCurrentSession()`
2. **Мониторьте подозрительную активность** - проверяйте логи
3. **Используйте HTTPS** - для защиты данных в транзите
4. **Настройте CSP заголовки** - для защиты от XSS
5. **Регулярно очищайте данные** - удаляйте старые сессии

## Миграция

Для миграции с старой системы:

1. Новая система автоматически поддерживает старые форматы
2. Пользователи будут постепенно переведены на новые сессии
3. Старые данные будут очищены через 30 дней

## Тестирование

```bash
# Запуск тестов безопасности
npm run test:security

# Проверка валидации сессий
npm run test:sessions

# Тестирование rate limiting
npm run test:rate-limit
```

## Поддержка

Для вопросов по безопасности обращайтесь к документации OWASP:
- [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)