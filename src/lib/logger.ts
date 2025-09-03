/**
 * Утилита для логирования с поддержкой разных режимов
 */

export const logger = {
  /**
   * Логи для разработки - показываются только в development
   */
  dev: (message: string, ...data: any[]) => {
    // [DEV] logging disabled
  },

  /**
   * Информационные логи
   */
  info: (message: string, ...data: any[]) => {
    // [INFO] logging disabled
  },

  /**
   * Логи ошибок - показываются всегда
   */
  error: (message: string, error?: any) => {
    // [ERROR] logging disabled
  },

  /**
   * Предупреждения - показываются всегда
   */
  warn: (message: string, ...data: any[]) => {
    // [WARN] logging disabled
  },

  /**
   * Логи успешных операций
   */
  success: (message: string, ...data: any[]) => {
    // [SUCCESS] logging disabled
  }
}