/**
 * Middleware для проверки и валидации сессий на уровне API
 * Обеспечивает безопасность API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { SecureSessionManager } from '@/lib/secureSessionManager'

// Конфигурация middleware
interface MiddlewareConfig {
  requireValidSession: boolean
  allowAnonymous: boolean
  maxRequestsPerMinute: number
  enableRateLimiting: boolean
}

const DEFAULT_MIDDLEWARE_CONFIG: MiddlewareConfig = {
  requireValidSession: true,
  allowAnonymous: false,
  maxRequestsPerMinute: 60,
  enableRateLimiting: true
}

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Основной middleware для проверки сессий
 */
export function withSessionValidation(
  handler: (request: NextRequest, sessionData?: any) => Promise<NextResponse>,
  config: Partial<MiddlewareConfig> = {}
) {
  const middlewareConfig = { ...DEFAULT_MIDDLEWARE_CONFIG, ...config }
  const sessionManager = new SecureSessionManager()

  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Rate limiting
      if (middlewareConfig.enableRateLimiting) {
        const rateLimitResult = checkRateLimit(request, middlewareConfig.maxRequestsPerMinute)
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            { 
              error: 'Слишком много запросов',
              retryAfter: rateLimitResult.retryAfter 
            },
            { status: 429 }
          )
        }
      }

      // Извлечение session ID из различных источников
      const sessionId = extractSessionId(request)
      
      // Проверка сессии если требуется
      if (middlewareConfig.requireValidSession) {
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Отсутствует ID сессии' },
            { status: 401 }
          )
        }

        const isValidSession = sessionManager.validateSession(sessionId)
        if (!isValidSession) {
          return NextResponse.json(
            { error: 'Недействительная или истекшая сессия' },
            { status: 401 }
          )
        }

        // Обновление активности сессии
        sessionManager.updateLastActivity(sessionId)
      }

      // Получение данных сессии для передачи в handler
      const sessionData = sessionId ? sessionManager.getSessionInfo(sessionId) : null

      // Вызов основного handler
      const response = await handler(request, sessionData)

      // Добавление security headers
      addSecurityHeaders(response)

      return response

    } catch (error) {
      console.error('Ошибка в session middleware:', error)
      return NextResponse.json(
        { error: 'Внутренняя ошибка сервера' },
        { status: 500 }
      )
    }
  }
}

/**
 * Извлечение session ID из запроса
 */
function extractSessionId(request: NextRequest): string | null {
  // 1. Проверяем заголовок Authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // 2. Проверяем custom заголовок
  const sessionHeader = request.headers.get('x-session-id')
  if (sessionHeader) {
    return sessionHeader
  }

  // 3. Проверяем query параметры
  const { searchParams } = new URL(request.url)
  const sessionParam = searchParams.get('sessionId')
  if (sessionParam) {
    return sessionParam
  }

  // 4. Проверяем cookies
  const sessionCookie = request.cookies.get('voevoda_session_id')
  if (sessionCookie) {
    return sessionCookie.value
  }

  return null
}

/**
 * Rate limiting проверка
 */
function checkRateLimit(
  request: NextRequest, 
  maxRequests: number
): { allowed: boolean; retryAfter?: number } {
  const clientId = getClientIdentifier(request)
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 минута
  
  const clientData = rateLimitStore.get(clientId)
  
  if (!clientData || now > clientData.resetTime) {
    // Новое окно или первый запрос
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + windowMs
    })
    return { allowed: true }
  }
  
  if (clientData.count >= maxRequests) {
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }
  
  // Увеличиваем счетчик
  clientData.count++
  rateLimitStore.set(clientId, clientData)
  
  return { allowed: true }
}

/**
 * Получение идентификатора клиента для rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Используем IP адрес как основной идентификатор
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'
  
  // Добавляем User-Agent для дополнительной уникальности
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const userAgentHash = require('crypto')
    .createHash('md5')
    .update(userAgent)
    .digest('hex')
    .substring(0, 8)
  
  return `${ip}_${userAgentHash}`
}

/**
 * Добавление security headers к ответу
 */
function addSecurityHeaders(response: NextResponse): void {
  // Предотвращение XSS
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // CSP для дополнительной защиты
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  )
  
  // Предотвращение кеширования чувствительных данных
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  // HSTS для HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
}

/**
 * Middleware для публичных endpoints (не требующих аутентификации)
 */
export function withPublicAccess(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return withSessionValidation(handler, {
    requireValidSession: false,
    allowAnonymous: true,
    enableRateLimiting: true,
    maxRequestsPerMinute: 100
  })
}

/**
 * Middleware для защищенных endpoints
 */
export function withProtectedAccess(
  handler: (request: NextRequest, sessionData: any) => Promise<NextResponse>
) {
  return withSessionValidation(handler, {
    requireValidSession: true,
    allowAnonymous: false,
    enableRateLimiting: true,
    maxRequestsPerMinute: 30
  })
}

/**
 * Middleware для административных endpoints
 */
export function withAdminAccess(
  handler: (request: NextRequest, sessionData: any) => Promise<NextResponse>
) {
  return withSessionValidation(async (request, sessionData) => {
    // Дополнительная проверка прав администратора
    // Здесь можно добавить проверку ролей пользователя
    
    return handler(request, sessionData)
  }, {
    requireValidSession: true,
    allowAnonymous: false,
    enableRateLimiting: true,
    maxRequestsPerMinute: 10
  })
}

/**
 * Утилита для очистки rate limit store
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  const expiredKeys: string[] = []
  
  rateLimitStore.forEach((data, key) => {
    if (now > data.resetTime) {
      expiredKeys.push(key)
    }
  })
  
  expiredKeys.forEach(key => {
    rateLimitStore.delete(key)
  })
}

// Автоматическая очистка каждые 5 минут
setInterval(cleanupRateLimitStore, 5 * 60 * 1000)

/**
 * Валидация входящих данных
 */
export function validateRequestData(
  data: any,
  schema: Record<string, (value: any) => boolean>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  for (const [field, validator] of Object.entries(schema)) {
    if (!validator(data[field])) {
      errors.push(`Недопустимое значение для поля: ${field}`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitization входящих данных
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  return input
    .trim()
    .replace(/[<>"'&]/g, '') // Удаляем потенциально опасные символы
    .substring(0, 1000) // Ограничиваем длину
}

export type { MiddlewareConfig }