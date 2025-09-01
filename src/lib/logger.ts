/**
 * Утилита для логирования с поддержкой разных режимов
 */

export const logger = {
  /**
   * Логи для разработки - показываются только в development
   */
  dev: (message: string, ...data: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [DEV] ${message}`, ...data)
    }
  },

  /**
   * Информационные логи
   */
  info: (message: string, ...data: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`ℹ️ [INFO] ${message}`, ...data)
    }
  },

  /**
   * Логи ошибок - показываются всегда
   */
  error: (message: string, error?: any) => {
    console.error(`❌ [ERROR] ${message}`, error)
  },

  /**
   * Предупреждения - показываются всегда
   */
  warn: (message: string, ...data: any[]) => {
    console.warn(`⚠️ [WARN] ${message}`, ...data)
  },

  /**
   * Логи успешных операций
   */
  success: (message: string, ...data: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [SUCCESS] ${message}`, ...data)
    }
  }
} 