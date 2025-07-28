/**
 * Улучшенная система управления сессиями пользователей
 * Основана на лучших практиках безопасности OWASP
 */

import crypto from 'crypto'

// Интерфейсы
interface SessionData {
  id: string
  userId: string
  createdAt: Date
  lastActivity: Date
  expiresAt: Date
  fingerprint: string
  isValid: boolean
  metadata?: Record<string, any>
}

interface SessionConfig {
  sessionTimeout: number // в миллисекундах
  maxInactivePeriod: number // в миллисекундах
  enableFingerprinting: boolean
  secureStorage: boolean
}

// Конфигурация по умолчанию
const DEFAULT_CONFIG: SessionConfig = {
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 часа
  maxInactivePeriod: 2 * 60 * 60 * 1000, // 2 часа
  enableFingerprinting: true,
  secureStorage: true
}

class SecureSessionManager {
  private config: SessionConfig
  private sessions: Map<string, SessionData> = new Map()
  private readonly STORAGE_KEY = 'voevoda_secure_session'
  private readonly FINGERPRINT_KEY = 'voevoda_session_fp'

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.loadSessionsFromStorage()
    this.startCleanupTimer()
  }

  /**
   * Создание нового сессионного ID с криптографической стойкостью
   */
  private generateSecureSessionId(): string {
    const timestamp = Date.now().toString(36)
    
    // Используем Web Crypto API в браузере или Node.js crypto на сервере
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      // Браузерная среда - используем Web Crypto API
      const array = new Uint8Array(32)
      window.crypto.getRandomValues(array)
      const random = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
      return `sess_${timestamp}_${random}`
    } else {
      // Серверная среда - используем Node.js crypto
      const randomBytes = crypto.randomBytes(32)
      const random = randomBytes.toString('hex')
      return `sess_${timestamp}_${random}`
    }
  }

  /**
   * Генерация отпечатка браузера для дополнительной безопасности
   */
  private generateBrowserFingerprint(): string {
    if (typeof window === 'undefined') {
      return 'server_side'
    }

    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.platform,
      navigator.cookieEnabled ? '1' : '0'
    ]

    const fingerprint = components.join('|')
    
    // Используем простой хеш для совместимости
    return this.simpleHash(fingerprint)
  }
  
  /**
   * Простой хеш для создания отпечатка
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Конвертируем в 32-битное целое
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * Создание новой сессии
   */
  createSession(userId?: string): string {
    const sessionId = this.generateSecureSessionId()
    const now = new Date()
    const fingerprint = this.config.enableFingerprinting 
      ? this.generateBrowserFingerprint() 
      : ''

    const sessionData: SessionData = {
      id: sessionId,
      userId: userId || this.generateSecureSessionId(),
      createdAt: now,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + this.config.sessionTimeout),
      fingerprint,
      isValid: true
    }

    this.sessions.set(sessionId, sessionData)
    this.saveSessionToStorage(sessionData)
    
    return sessionId
  }

  /**
   * Получение или создание сессии пользователя
   */
  getOrCreateSession(): { sessionId: string; userId: string; isNew: boolean } {
    const existingSessionId = this.getCurrentSessionId()
    
    if (existingSessionId && this.validateSession(existingSessionId)) {
      const session = this.sessions.get(existingSessionId)!
      this.updateLastActivity(existingSessionId)
      return {
        sessionId: existingSessionId,
        userId: session.userId,
        isNew: false
      }
    }

    // Создаем новую сессию
    const sessionId = this.createSession()
    const session = this.sessions.get(sessionId)!
    
    return {
      sessionId,
      userId: session.userId,
      isNew: true
    }
  }

  /**
   * Валидация сессии
   */
  validateSession(sessionId: string): boolean {
    // На сервере просто проверяем формат sessionId
    if (typeof window === 'undefined') {
      return this.isValidSessionFormat(sessionId)
    }

    const session = this.sessions.get(sessionId)
    
    if (!session || !session.isValid) {
      return false
    }

    const now = new Date()
    
    // Проверка истечения сессии
    if (now > session.expiresAt) {
      this.invalidateSession(sessionId)
      return false
    }

    // Проверка периода неактивности
    const inactiveTime = now.getTime() - session.lastActivity.getTime()
    if (inactiveTime > this.config.maxInactivePeriod) {
      this.invalidateSession(sessionId)
      return false
    }

    // Проверка отпечатка браузера
    if (this.config.enableFingerprinting) {
      const currentFingerprint = this.generateBrowserFingerprint()
      if (session.fingerprint !== currentFingerprint) {
        this.invalidateSession(sessionId)
        return false
      }
    }

    return true
  }

  /**
   * Проверка формата sessionId
   */
  private isValidSessionFormat(sessionId: string): boolean {
    if (!sessionId || typeof sessionId !== 'string') {
      return false
    }
    
    // Проверяем новый формат сессий
    const newSessionRegex = /^sess_[a-z0-9]+_[a-f0-9]{64}$/
    return newSessionRegex.test(sessionId)
  }

  /**
   * Обновление времени последней активности
   */
  updateLastActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastActivity = new Date()
      this.saveSessionToStorage(session)
    }
  }

  /**
   * Инвалидация сессии
   */
  invalidateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.isValid = false
      this.sessions.delete(sessionId)
      this.removeSessionFromStorage(sessionId)
    }
  }

  /**
   * Получение текущего ID сессии из хранилища
   */
  getCurrentSessionId(): string | null {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        return data.sessionId
      }
    } catch (error) {
      console.warn('Ошибка чтения сессии из localStorage:', error)
    }

    return null
  }

  /**
   * Сохранение сессии в localStorage
   */
  private saveSessionToStorage(session: SessionData): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const storageData = {
        sessionId: session.id,
        userId: session.userId,
        createdAt: session.createdAt.toISOString(),
        lastActivity: session.lastActivity.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        fingerprint: session.fingerprint
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData))
      
      if (this.config.enableFingerprinting) {
        localStorage.setItem(this.FINGERPRINT_KEY, session.fingerprint)
      }
    } catch (error) {
      console.warn('Ошибка сохранения сессии в localStorage:', error)
    }
  }

  /**
   * Загрузка сессий из localStorage
   */
  private loadSessionsFromStorage(): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        const session: SessionData = {
          id: data.sessionId,
          userId: data.userId,
          createdAt: new Date(data.createdAt),
          lastActivity: new Date(data.lastActivity),
          expiresAt: new Date(data.expiresAt),
          fingerprint: data.fingerprint,
          isValid: true
        }

        this.sessions.set(session.id, session)
      }
    } catch (error) {
      console.warn('Ошибка загрузки сессии из localStorage:', error)
      this.clearAllSessions()
    }
  }

  /**
   * Удаление сессии из localStorage
   */
  private removeSessionFromStorage(sessionId: string): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        if (data.sessionId === sessionId) {
          localStorage.removeItem(this.STORAGE_KEY)
          localStorage.removeItem(this.FINGERPRINT_KEY)
        }
      }
    } catch (error) {
      console.warn('Ошибка удаления сессии из localStorage:', error)
    }
  }

  /**
   * Очистка всех сессий
   */
  clearAllSessions(): void {
    this.sessions.clear()
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY)
      localStorage.removeItem(this.FINGERPRINT_KEY)
      localStorage.removeItem('temp_user_data')
      localStorage.removeItem('checkout_data')
      localStorage.removeItem('voevoda_supabase_selectedSeats')
      localStorage.removeItem('voevoda_supabase_generalAccess')
    }
  }

  /**
   * Получение информации о сессии
   */
  getSessionInfo(sessionId: string): SessionData | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * Продление сессии
   */
  extendSession(sessionId: string, additionalTime?: number): boolean {
    const session = this.sessions.get(sessionId)
    if (!session || !this.validateSession(sessionId)) {
      return false
    }

    const extension = additionalTime || this.config.sessionTimeout
    session.expiresAt = new Date(Date.now() + extension)
    session.lastActivity = new Date()
    
    this.saveSessionToStorage(session)
    return true
  }

  /**
   * Автоматическая очистка истекших сессий
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      const now = new Date()
      const expiredSessions: string[] = []

      this.sessions.forEach((session, sessionId) => {
        if (now > session.expiresAt || !session.isValid) {
          expiredSessions.push(sessionId)
        }
      })

      expiredSessions.forEach(sessionId => {
        this.invalidateSession(sessionId)
      })
    }, 5 * 60 * 1000) // Проверка каждые 5 минут
  }

  /**
   * Получение статистики сессий
   */
  getSessionStats(): {
    totalSessions: number
    activeSessions: number
    expiredSessions: number
  } {
    const now = new Date()
    let activeSessions = 0
    let expiredSessions = 0

    this.sessions.forEach(session => {
      if (session.isValid && now <= session.expiresAt) {
        activeSessions++
      } else {
        expiredSessions++
      }
    })

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions
    }
  }
}

// Создание глобального экземпляра менеджера сессий
const sessionManager = new SecureSessionManager()

// Экспорт функций для обратной совместимости
export function getOrCreateSessionUserId(): string {
  const { userId } = sessionManager.getOrCreateSession()
  return userId
}

export function getCurrentSessionUserId(): string | null {
  const sessionId = sessionManager.getCurrentSessionId()
  if (sessionId && sessionManager.validateSession(sessionId)) {
    const session = sessionManager.getSessionInfo(sessionId)
    return session?.userId || null
  }
  return null
}

export function clearSessionUserId(): void {
  sessionManager.clearAllSessions()
}

export function isValidSessionUserId(userId: string): boolean {
  if (!userId || typeof userId !== 'string') {
    return false
  }
  
  // Проверяем новый формат сессий
  const newSessionRegex = /^sess_[a-z0-9]+_[a-f0-9]{64}$/
  if (newSessionRegex.test(userId)) {
    return true
  }
  
  // Поддержка старых форматов для обратной совместимости
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const customRegex = /^user-\d+-[a-z0-9]{9}$/
  
  return uuidRegex.test(userId) || customRegex.test(userId)
}

// Экспорт дополнительных функций
export function extendCurrentSession(additionalTime?: number): boolean {
  const sessionId = sessionManager.getCurrentSessionId()
  if (sessionId) {
    return sessionManager.extendSession(sessionId, additionalTime)
  }
  return false
}

export function getSessionStats() {
  return sessionManager.getSessionStats()
}

export function validateCurrentSession(): boolean {
  const sessionId = sessionManager.getCurrentSessionId()
  return sessionId ? sessionManager.validateSession(sessionId) : false
}

// Экспорт интерфейсов
export type { SessionData, SessionConfig }
export { SecureSessionManager }

// Экспорт функции для создания временного пользователя (обратная совместимость)
export interface TempUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  createdAt: string
}

export function createTempUserData(sessionId: string, checkoutData: {
  email: string
  firstName: string
  lastName: string
  phone?: string
}): TempUser {
  return {
    id: sessionId,
    email: checkoutData.email,
    firstName: checkoutData.firstName,
    lastName: checkoutData.lastName,
    phone: checkoutData.phone,
    createdAt: new Date().toISOString()
  }
}