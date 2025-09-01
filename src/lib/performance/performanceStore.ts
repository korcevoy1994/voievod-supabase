import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Типы для метрик производительности
interface ComponentMetrics {
  name: string
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
  totalRenderTime: number
  slowRenders: number
}

interface CacheMetrics {
  hits: number
  misses: number
  totalRequests: number
  hitRate: number
  averageResponseTime: number
}

interface MemoryMetrics {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  timestamp: number
}

interface NetworkMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  slowRequests: number
}

interface PerformanceState {
  // Метрики компонентов
  componentMetrics: Map<string, ComponentMetrics>
  
  // Метрики кэша
  cacheMetrics: CacheMetrics
  
  // Метрики памяти
  memoryMetrics: MemoryMetrics[]
  
  // Метрики сети
  networkMetrics: NetworkMetrics
  
  // FPS метрики
  fps: number
  frameDrops: number
  
  // Общие метрики
  isMonitoring: boolean
  startTime: number
  
  // Действия
  startMonitoring: () => void
  stopMonitoring: () => void
  recordComponentRender: (name: string, renderTime: number) => void
  recordCacheHit: (responseTime: number) => void
  recordCacheMiss: (responseTime: number) => void
  recordMemoryUsage: () => void
  recordNetworkRequest: (success: boolean, responseTime: number) => void
  updateFPS: (fps: number) => void
  resetMetrics: () => void
  getComponentStats: () => ComponentMetrics[]
  getTopSlowComponents: (limit?: number) => ComponentMetrics[]
  getMemoryTrend: () => MemoryMetrics[]
}

// Начальное состояние
const initialState = {
  componentMetrics: new Map<string, ComponentMetrics>(),
  cacheMetrics: {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
    averageResponseTime: 0
  },
  memoryMetrics: [],
  networkMetrics: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    slowRequests: 0
  },
  fps: 60,
  frameDrops: 0,
  isMonitoring: false,
  startTime: 0
}

// Создание store
export const usePerformanceStore = create<PerformanceState>()(devtools(
  (set, get) => ({
    ...initialState,
    
    startMonitoring: () => {
      set({ 
        isMonitoring: true, 
        startTime: performance.now() 
      })
    },
    
    stopMonitoring: () => {
      set({ isMonitoring: false })
    },
    
    recordComponentRender: (name: string, renderTime: number) => {
      const state = get()
      if (!state.isMonitoring) return
      
      const componentMetrics = new Map(state.componentMetrics)
      const existing = componentMetrics.get(name)
      
      if (existing) {
        const newRenderCount = existing.renderCount + 1
        const newTotalTime = existing.totalRenderTime + renderTime
        
        componentMetrics.set(name, {
          ...existing,
          renderCount: newRenderCount,
          lastRenderTime: renderTime,
          averageRenderTime: newTotalTime / newRenderCount,
          totalRenderTime: newTotalTime,
          slowRenders: renderTime > 16 ? existing.slowRenders + 1 : existing.slowRenders
        })
      } else {
        componentMetrics.set(name, {
          name,
          renderCount: 1,
          lastRenderTime: renderTime,
          averageRenderTime: renderTime,
          totalRenderTime: renderTime,
          slowRenders: renderTime > 16 ? 1 : 0
        })
      }
      
      set({ componentMetrics })
    },
    
    recordCacheHit: (responseTime: number) => {
      const state = get()
      if (!state.isMonitoring) return
      
      const { cacheMetrics } = state
      const newHits = cacheMetrics.hits + 1
      const newTotal = cacheMetrics.totalRequests + 1
      const newAverageTime = (
        (cacheMetrics.averageResponseTime * cacheMetrics.totalRequests + responseTime) / newTotal
      )
      
      set({
        cacheMetrics: {
          ...cacheMetrics,
          hits: newHits,
          totalRequests: newTotal,
          hitRate: (newHits / newTotal) * 100,
          averageResponseTime: newAverageTime
        }
      })
    },
    
    recordCacheMiss: (responseTime: number) => {
      const state = get()
      if (!state.isMonitoring) return
      
      const { cacheMetrics } = state
      const newMisses = cacheMetrics.misses + 1
      const newTotal = cacheMetrics.totalRequests + 1
      const newAverageTime = (
        (cacheMetrics.averageResponseTime * cacheMetrics.totalRequests + responseTime) / newTotal
      )
      
      set({
        cacheMetrics: {
          ...cacheMetrics,
          misses: newMisses,
          totalRequests: newTotal,
          hitRate: (cacheMetrics.hits / newTotal) * 100,
          averageResponseTime: newAverageTime
        }
      })
    },
    
    recordMemoryUsage: () => {
      const state = get()
      if (!state.isMonitoring) return
      
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const memoryMetric: MemoryMetrics = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          timestamp: performance.now()
        }
        
        const memoryMetrics = [...state.memoryMetrics, memoryMetric]
        
        // Ограничиваем количество записей (последние 100)
        if (memoryMetrics.length > 100) {
          memoryMetrics.shift()
        }
        
        set({ memoryMetrics })
      }
    },
    
    recordNetworkRequest: (success: boolean, responseTime: number) => {
      const state = get()
      if (!state.isMonitoring) return
      
      const { networkMetrics } = state
      const newTotal = networkMetrics.totalRequests + 1
      const newSuccessful = success ? networkMetrics.successfulRequests + 1 : networkMetrics.successfulRequests
      const newFailed = !success ? networkMetrics.failedRequests + 1 : networkMetrics.failedRequests
      const newSlowRequests = responseTime > 1000 ? networkMetrics.slowRequests + 1 : networkMetrics.slowRequests
      const newAverageTime = (
        (networkMetrics.averageResponseTime * networkMetrics.totalRequests + responseTime) / newTotal
      )
      
      set({
        networkMetrics: {
          totalRequests: newTotal,
          successfulRequests: newSuccessful,
          failedRequests: newFailed,
          averageResponseTime: newAverageTime,
          slowRequests: newSlowRequests
        }
      })
    },
    
    updateFPS: (fps: number) => {
      const state = get()
      if (!state.isMonitoring) return
      
      const frameDrops = fps < 55 ? state.frameDrops + 1 : state.frameDrops
      set({ fps, frameDrops })
    },
    
    resetMetrics: () => {
      set({
        ...initialState,
        isMonitoring: get().isMonitoring
      })
    },
    
    getComponentStats: () => {
      return Array.from(get().componentMetrics.values())
    },
    
    getTopSlowComponents: (limit = 5) => {
      const components = Array.from(get().componentMetrics.values())
      return components
        .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
        .slice(0, limit)
    },
    
    getMemoryTrend: () => {
      return get().memoryMetrics.slice(-20) // Последние 20 записей
    }
  }),
  {
    name: 'performance-store'
  }
))

// Хуки для удобного доступа к метрикам
export const useComponentMetrics = () => {
  return usePerformanceStore(state => ({
    metrics: state.getComponentStats(),
    topSlow: state.getTopSlowComponents(),
    recordRender: state.recordComponentRender
  }))
}

export const useCacheMetrics = () => {
  return usePerformanceStore(state => ({
    metrics: state.cacheMetrics,
    recordHit: state.recordCacheHit,
    recordMiss: state.recordCacheMiss
  }))
}

export const useMemoryMetrics = () => {
  return usePerformanceStore(state => ({
    current: state.memoryMetrics[state.memoryMetrics.length - 1],
    trend: state.getMemoryTrend(),
    record: state.recordMemoryUsage
  }))
}

export const useNetworkMetrics = () => {
  return usePerformanceStore(state => ({
    metrics: state.networkMetrics,
    record: state.recordNetworkRequest
  }))
}

export const useFPSMetrics = () => {
  return usePerformanceStore(state => ({
    fps: state.fps,
    frameDrops: state.frameDrops,
    update: state.updateFPS
  }))
}

// Экспорт типов
export type {
  ComponentMetrics,
  CacheMetrics,
  MemoryMetrics,
  NetworkMetrics,
  PerformanceState
}