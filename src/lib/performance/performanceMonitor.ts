import React, { useEffect, useRef, useCallback } from 'react'
import { usePerformanceStore, useCacheMetrics, useMemoryMetrics, useNetworkMetrics, useFPSMetrics } from './performanceStore'

// Автоматический мониторинг FPS
export const useFPSMonitor = (interval: number = 1000) => {
  const { update } = useFPSMetrics()
  const frameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(performance.now())
  const frameCountRef = useRef<number>(0)
  
  const measureFPS = useCallback(() => {
    const now = performance.now()
    frameCountRef.current++
    
    if (now - lastTimeRef.current >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current))
      update(fps)
      
      frameCountRef.current = 0
      lastTimeRef.current = now
    }
    
    frameRef.current = requestAnimationFrame(measureFPS)
  }, [update])
  
  useEffect(() => {
    frameRef.current = requestAnimationFrame(measureFPS)
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [measureFPS])
}

// Автоматический мониторинг памяти
export const useMemoryMonitor = (interval: number = 5000) => {
  const { record } = useMemoryMetrics()
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      record()
    }, interval)
    
    return () => clearInterval(intervalId)
  }, [record, interval])
}

// Мониторинг сетевых запросов
export const useNetworkMonitor = () => {
  const { record } = useNetworkMetrics()
  
  useEffect(() => {
    // Перехват fetch запросов
    const originalFetch = window.fetch
    
    window.fetch = async (...args) => {
      const startTime = performance.now()
      
      try {
        const response = await originalFetch(...args)
        const endTime = performance.now()
        const responseTime = endTime - startTime
        
        record(response.ok, responseTime)
        
        return response
      } catch (err) {
        const endTime = performance.now()
        const responseTime = endTime - startTime
        
        record(false, responseTime)
        
        throw err
      }
    }
    
    // Перехват XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send
    
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async: boolean = true, username?: string | null, password?: string | null) {
      this._startTime = performance.now()
      return originalXHROpen.call(this, method, url, async, username, password)
    }
    
    XMLHttpRequest.prototype.send = function(...args) {
      const startTime = this._startTime || performance.now()
      
      this.addEventListener('loadend', () => {
        const endTime = performance.now()
        const responseTime = endTime - startTime
        const success = this.status >= 200 && this.status < 300
        
        record(success, responseTime)
      })
      
      return originalXHRSend.call(this, ...args)
    }
    
    return () => {
      window.fetch = originalFetch
      XMLHttpRequest.prototype.open = originalXHROpen
      XMLHttpRequest.prototype.send = originalXHRSend
    }
  }, [record])
}

// Мониторинг кэша с интеграцией в существующий кэш
export const useCacheMonitor = () => {
  const { recordHit, recordMiss } = useCacheMetrics()
  
  return {
    recordHit: useCallback((responseTime: number = 0) => {
      recordHit(responseTime)
    }, [recordHit]),
    
    recordMiss: useCallback((responseTime: number = 0) => {
      recordMiss(responseTime)
    }, [recordMiss])
  }
}

// Хук для мониторинга производительности компонента
export const useComponentPerformanceMonitor = (componentName: string) => {
  const recordRender = usePerformanceStore(state => state.recordComponentRender)
  const renderStartRef = useRef<number>(0)
  
  // Запись начала рендера
  const startRender = useCallback(() => {
    renderStartRef.current = performance.now()
  }, [])
  
  // Запись окончания рендера
  const endRender = useCallback(() => {
    if (renderStartRef.current) {
      const renderTime = performance.now() - renderStartRef.current
      recordRender(componentName, renderTime)
    }
  }, [componentName, recordRender])
  
  // Автоматический мониторинг каждого рендера
  useEffect(() => {
    startRender()
    endRender()
  }, [startRender, endRender])
  
  return { startRender, endRender }
}

// Глобальный мониторинг производительности
export const useGlobalPerformanceMonitor = (options: {
  enableFPS?: boolean
  enableMemory?: boolean
  enableNetwork?: boolean
  memoryInterval?: number
} = {}) => {
  const {
    enableFPS = true,
    enableMemory = true,
    enableNetwork = true,
    memoryInterval = 5000
  } = options
  
  const startMonitoring = usePerformanceStore(state => state.startMonitoring)
  const stopMonitoring = usePerformanceStore(state => state.stopMonitoring)
  
  // Запуск мониторинга
  useEffect(() => {
    startMonitoring()
    
    return () => {
      stopMonitoring()
    }
  }, [startMonitoring, stopMonitoring])
  
  // Условное подключение мониторов
  if (enableFPS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useFPSMonitor(1000)
  }
  
  if (enableMemory) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useMemoryMonitor(memoryInterval)
  }
  
  if (enableNetwork) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useNetworkMonitor()
  }
}

// Хук для мониторинга долгих задач
export const useLongTaskMonitor = () => {
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Задачи длиннее 50ms
            console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`, entry)
          }
        }
      })
      
      try {
        observer.observe({ entryTypes: ['longtask'] })
      } catch (err) {
        console.warn('Long task monitoring not supported')
      }
      
      return () => {
        observer.disconnect()
      }
    }
  }, [])
}

// Мониторинг Layout Shift
export const useLayoutShiftMonitor = () => {
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).value > 0.1) { // CLS больше 0.1
            console.warn(`Layout shift detected: ${(entry as any).value.toFixed(4)}`, entry)
          }
        }
      })
      
      try {
        observer.observe({ entryTypes: ['layout-shift'] })
      } catch (err) {
        console.warn('Layout shift monitoring not supported')
      }
      
      return () => {
        observer.disconnect()
      }
    }
  }, [])
}

// Мониторинг First Input Delay
export const useFirstInputDelayMonitor = () => {
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as any).processingStart - entry.startTime
          if (fid > 100) { // FID больше 100ms
            console.warn(`High First Input Delay: ${fid.toFixed(2)}ms`, entry)
          }
        }
      })
      
      try {
        observer.observe({ entryTypes: ['first-input'] })
      } catch (err) {
        console.warn('First Input Delay monitoring not supported')
      }
      
      return () => {
        observer.disconnect()
      }
    }
  }, [])
}

// Комплексный мониторинг Web Vitals
export const useWebVitalsMonitor = () => {
  useLongTaskMonitor()
  useLayoutShiftMonitor()
  useFirstInputDelayMonitor()
}

// Утилита для создания обертки компонента с мониторингом
export const withPerformanceMonitoring = <P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const WrappedComponent = (props: P) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown'
    useComponentPerformanceMonitor(name)
    
    return React.createElement(Component, props)
  }
  
  WrappedComponent.displayName = `WithPerformanceMonitoring(${componentName || Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Декларация типов для XMLHttpRequest
declare global {
  interface XMLHttpRequest {
    _startTime?: number
  }
}