/**
 * Расширенная система кэширования с поддержкой различных стратегий
 */

import { logger } from '@/lib/logger'

export interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
}

export interface CacheConfig {
  maxSize: number
  defaultTtl: number
  enableBrowserStorage: boolean
  storagePrefix: string
}

export class EnhancedCache {
  private cache = new Map<string, CacheItem<any>>()
  private pendingRequests = new Map<string, Promise<any>>()
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100,
      defaultTtl: 30000, // 30 секунд
      enableBrowserStorage: true,
      storagePrefix: 'voev_cache_',
      ...config
    }
  }

  /**
   * Получить данные из кэша
   */
  get<T>(key: string): T | null {
    // Проверяем память
    const memoryItem = this.cache.get(key)
    if (memoryItem && this.isValid(memoryItem)) {
      memoryItem.accessCount++
      memoryItem.lastAccessed = Date.now()
      return memoryItem.data
    }

    // Проверяем браузерное хранилище
    if (this.config.enableBrowserStorage && typeof window !== 'undefined') {
      const browserItem = this.getBrowserCache<T>(key)
      if (browserItem) {
        // Восстанавливаем в память
        this.cache.set(key, browserItem)
        return browserItem.data
      }
    }

    return null
  }

  /**
   * Сохранить данные в кэш
   */
  set<T>(key: string, data: T, ttl: number = this.config.defaultTtl): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccessed: Date.now()
    }

    // Проверяем размер кэша и очищаем при необходимости
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed()
    }

    this.cache.set(key, item)

    // Сохраняем в браузерное хранилище для статических данных
    if (this.config.enableBrowserStorage && this.isStaticData(key)) {
      this.setBrowserCache(key, item)
    }
  }

  /**
   * Получить данные или выполнить запрос
   */
  async getOrFetch<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number = this.config.defaultTtl
  ): Promise<T> {
    // Проверяем кэш
    const cached = this.get<T>(key)
    if (cached) {
      return cached
    }

    // Проверяем pending запросы
    const pending = this.pendingRequests.get(key)
    if (pending) {
      return pending
    }

    // Создаем новый запрос
    const request = fetcher().then(data => {
      this.set(key, data, ttl)
      this.pendingRequests.delete(key)
      return data
    }).catch(error => {
      this.pendingRequests.delete(key)
      logger.error(`Failed to fetch data for key ${key}:`, error)
      throw error
    })

    this.pendingRequests.set(key, request)
    return request
  }

  /**
   * Инвалидировать кэш по ключу или паттерну
   */
  invalidate(keyOrPattern: string): void {
    if (keyOrPattern.includes('*')) {
      // Паттерн с wildcard
      const pattern = keyOrPattern.replace(/\*/g, '.*')
      const regex = new RegExp(`^${pattern}$`)
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key)
          this.deleteBrowserCache(key)
        }
      }
    } else {
      // Точный ключ
      this.cache.delete(keyOrPattern)
      this.deleteBrowserCache(keyOrPattern)
    }
  }

  /**
   * Очистить весь кэш
   */
  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
    
    if (this.config.enableBrowserStorage && typeof window !== 'undefined') {
      this.clearBrowserCache()
    }
  }

  /**
   * Получить статистику кэша
   */
  getStats() {
    const items = Array.from(this.cache.values())
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      totalAccesses: items.reduce((sum, item) => sum + item.accessCount, 0),
      averageAge: items.length > 0 
        ? items.reduce((sum, item) => sum + (Date.now() - item.timestamp), 0) / items.length
        : 0
    }
  }

  /**
   * Проверить валидность элемента кэша
   */
  private isValid(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp < item.ttl
  }

  /**
   * Определить, являются ли данные статическими
   */
  private isStaticData(key: string): boolean {
    const staticPatterns = ['zones', 'zone_colors', 'events', 'pricing']
    return staticPatterns.some(pattern => key.includes(pattern))
  }

  /**
   * Удалить наименее используемые элементы
   */
  private evictLeastUsed(): void {
    const items = Array.from(this.cache.entries())
    items.sort(([, a], [, b]) => {
      // Сортируем по частоте использования и времени последнего доступа
      if (a.accessCount !== b.accessCount) {
        return a.accessCount - b.accessCount
      }
      return a.lastAccessed - b.lastAccessed
    })

    // Удаляем 25% наименее используемых элементов
    const toRemove = Math.ceil(items.length * 0.25)
    for (let i = 0; i < toRemove; i++) {
      const [key] = items[i]
      this.cache.delete(key)
      this.deleteBrowserCache(key)
    }
  }

  /**
   * Получить данные из браузерного хранилища
   */
  private getBrowserCache<T>(key: string): CacheItem<T> | null {
    try {
      const stored = localStorage.getItem(this.config.storagePrefix + key)
      if (!stored) return null

      const item: CacheItem<T> = JSON.parse(stored)
      if (this.isValid(item)) {
        return item
      } else {
        this.deleteBrowserCache(key)
        return null
      }
    } catch (error) {
      logger.warn(`Failed to read browser cache for key ${key}:`, error)
      return null
    }
  }

  /**
   * Сохранить данные в браузерное хранилище
   */
  private setBrowserCache<T>(key: string, item: CacheItem<T>): void {
    try {
      localStorage.setItem(
        this.config.storagePrefix + key,
        JSON.stringify(item)
      )
    } catch (error) {
      logger.warn(`Failed to save browser cache for key ${key}:`, error)
    }
  }

  /**
   * Удалить данные из браузерного хранилища
   */
  private deleteBrowserCache(key: string): void {
    try {
      localStorage.removeItem(this.config.storagePrefix + key)
    } catch (error) {
      logger.warn(`Failed to delete browser cache for key ${key}:`, error)
    }
  }

  /**
   * Очистить все данные браузерного хранилища
   */
  private clearBrowserCache(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.config.storagePrefix)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      logger.warn('Failed to clear browser cache:', error)
    }
  }
}

// Предустановленные TTL для разных типов данных
export const CACHE_TTL = {
  STATIC: 5 * 60 * 1000,      // 5 минут для статических данных
  DYNAMIC: 30 * 1000,         // 30 секунд для динамических данных
  REALTIME: 5 * 1000,         // 5 секунд для данных реального времени
  LONG_TERM: 60 * 60 * 1000,  // 1 час для долгосрочных данных
} as const

// Глобальный экземпляр кэша
export const globalCache = new EnhancedCache({
  maxSize: 200,
  defaultTtl: CACHE_TTL.DYNAMIC,
  enableBrowserStorage: true,
  storagePrefix: 'voev_cache_'
})