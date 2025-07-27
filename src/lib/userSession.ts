/**
 * Утилиты для управления сессией пользователя без регистрации
 */

// Генерация уникального ID пользователя для сессии
export function generateSessionUserId(): string {
  // Используем crypto.randomUUID() если доступно, иначе fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // Fallback для старых браузеров
  return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}

// Получение или создание ID пользователя сессии
export function getOrCreateSessionUserId(): string {
  const STORAGE_KEY = 'voevoda_user_session_id'
  
  // Проверяем localStorage
  if (typeof window !== 'undefined') {
    const existingId = localStorage.getItem(STORAGE_KEY)
    if (existingId) {
      return existingId
    }
    
    // Создаем новый ID и сохраняем
    const newId = generateSessionUserId()
    localStorage.setItem(STORAGE_KEY, newId)
    return newId
  }
  
  // Fallback для SSR
  return generateSessionUserId()
}

// Очистка ID сессии (например, при выходе)
export function clearSessionUserId(): void {
  const STORAGE_KEY = 'voevoda_user_session_id'
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

// Получение текущего ID сессии без создания нового
export function getCurrentSessionUserId(): string | null {
  const STORAGE_KEY = 'voevoda_user_session_id'
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY)
  }
  return null
}

// Проверка валидности ID сессии
export function isValidSessionUserId(userId: string): boolean {
  if (!userId || typeof userId !== 'string') {
    return false
  }
  
  // Проверяем формат UUID или наш custom формат
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const customRegex = /^user-\d+-[a-z0-9]{9}$/
  
  return uuidRegex.test(userId) || customRegex.test(userId)
}

// Создание временного пользователя в базе данных при checkout
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