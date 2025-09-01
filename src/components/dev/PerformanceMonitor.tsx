'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { 
  usePerformanceStore, 
  useComponentMetrics, 
  useCacheMetrics, 
  useMemoryMetrics, 
  useNetworkMetrics, 
  useFPSMetrics 
} from '../../lib/performance/performanceStore'
import { 
  useGlobalPerformanceMonitor, 
  useWebVitalsMonitor 
} from '../../lib/performance/performanceMonitor'

interface PerformanceMetrics {
  fps: number
  memoryUsage: number
  renderTime: number
  componentCount: number
  reRenderCount: number
  lastUpdate: number
}

interface ComponentMetric {
  name: string
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
}

interface PerformanceMonitorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  updateInterval?: number
  showDetails?: boolean
}

// Интерфейсы для отображения
interface PerformanceDisplayProps {
  isMinimized: boolean
  onToggleMinimize: () => void
}

// Глобальный счетчик рендеров
const globalMetrics = {
  componentRenders: new Map<string, ComponentMetric>(),
  totalRenders: 0,
  startTime: Date.now()
}

export function PerformanceMonitor({
  position = 'top-right',
  updateInterval = 1000,
  showDetails = false
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0,
    componentCount: 0,
    reRenderCount: 0,
    lastUpdate: Date.now()
  })
  
  const [isMinimized, setIsMinimized] = useState(false)
  const [showComponentDetails, setShowComponentDetails] = useState(false)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(Date.now())
  const rafIdRef = useRef<number | undefined>(undefined)
  
  // Подключение глобального мониторинга
  useGlobalPerformanceMonitor({
    enableFPS: true,
    enableMemory: true,
    enableNetwork: true,
    memoryInterval: updateInterval
  })
  
  // Подключение мониторинга Web Vitals
  useWebVitalsMonitor()
  
  // Получение метрик из store
  const { metrics: componentMetrics, topSlow } = useComponentMetrics()
  const { metrics: cacheMetrics } = useCacheMetrics()
  const { current: memoryInfo, trend: memoryTrend } = useMemoryMetrics()
  const { metrics: networkMetrics } = useNetworkMetrics()
  const { fps: currentFPS, frameDrops } = useFPSMetrics()
  const resetMetrics = usePerformanceStore(state => state.resetMetrics)
  
  // Измерение FPS
  const measureFPS = useCallback(() => {
    frameCountRef.current++
    rafIdRef.current = requestAnimationFrame(measureFPS)
  }, [])
  
  // Получение метрик памяти
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100
    }
    return 0
  }, [])
  
  // Обновление метрик
  const updateMetrics = useCallback(() => {
    const now = Date.now()
    const deltaTime = now - lastTimeRef.current
    
    if (deltaTime >= updateInterval) {
      const fps = Math.round((frameCountRef.current * 1000) / deltaTime)
      const memoryUsage = getMemoryUsage()
      
      setMetrics(prev => ({
        ...prev,
        fps,
        memoryUsage,
        componentCount: globalMetrics.componentRenders.size,
        reRenderCount: globalMetrics.totalRenders,
        lastUpdate: now
      }))
      
      frameCountRef.current = 0
      lastTimeRef.current = now
      
      // Логирование критических показателей
      if (fps < 30) {
        logger.warn(`Low FPS detected: ${fps}`)
      }
      if (memoryUsage > 100) {
        logger.warn(`High memory usage: ${memoryUsage}MB`)
      }
    }
  }, [updateInterval, getMemoryUsage])
  
  useEffect(() => {
    // Запуск измерения FPS
    rafIdRef.current = requestAnimationFrame(measureFPS)
    
    // Интервал обновления метрик
    const interval = setInterval(updateMetrics, updateInterval)
    
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
      clearInterval(interval)
    }
  }, [measureFPS, updateMetrics, updateInterval])
  
  // Позиционирование
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      default:
        return 'top-4 right-4'
    }
  }
  
  // Цвет FPS
  const getFPSColor = (fps: number) => {
    if (fps >= 50) return 'text-green-500'
    if (fps >= 30) return 'text-yellow-500'
    return 'text-red-500'
  }
  
  // Цвет памяти
  const getMemoryColor = (memory: number) => {
    if (memory < 50) return 'text-green-500'
    if (memory < 100) return 'text-yellow-500'
    return 'text-red-500'
  }
  
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  return (
    <div className={`fixed ${getPositionClasses()} z-50 font-mono text-xs`}>
      <div className="bg-black bg-opacity-80 text-white rounded-lg p-3 min-w-[200px]">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-blue-400">Performance</span>
          <div className="flex space-x-1">
            <button
              onClick={() => setShowComponentDetails(!showComponentDetails)}
              className="text-gray-400 hover:text-white transition-colors"
              title="Toggle component details"
            >
              📊
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isMinimized ? '📈' : '📉'}
            </button>
          </div>
        </div>
        
        {!isMinimized && (
          <>
            {/* Основные метрики */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>FPS:</span>
                <span className={getFPSColor(metrics.fps)}>
                  {metrics.fps}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Memory:</span>
                <span className={getMemoryColor(metrics.memoryUsage)}>
                  {metrics.memoryUsage}MB
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Components:</span>
                <span className="text-blue-400">
                  {metrics.componentCount}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Re-renders:</span>
                <span className="text-yellow-400">
                  {metrics.reRenderCount}
                </span>
              </div>
            </div>
            
            {/* Метрики кэша */}
            <div className="border-t border-gray-600 mt-2 pt-2">
              <div className="text-blue-400 font-bold mb-1">Cache:</div>
              <div className="flex justify-between text-xs">
                <span>Hit Rate:</span>
                <span className={cacheMetrics.hitRate > 80 ? 'text-green-400' : 
                  cacheMetrics.hitRate > 60 ? 'text-yellow-400' : 'text-red-400'}>
                  {cacheMetrics.hitRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Requests:</span>
                <span className="text-gray-400">
                  {cacheMetrics.totalRequests}
                </span>
              </div>
            </div>
            
            {/* Метрики сети */}
            <div className="border-t border-gray-600 mt-2 pt-2">
              <div className="text-blue-400 font-bold mb-1">Network:</div>
              <div className="flex justify-between text-xs">
                <span>Success Rate:</span>
                <span className={(networkMetrics.successfulRequests / networkMetrics.totalRequests * 100) > 95 ? 'text-green-400' : 
                  (networkMetrics.successfulRequests / networkMetrics.totalRequests * 100) > 90 ? 'text-yellow-400' : 'text-red-400'}>
                  {networkMetrics.totalRequests > 0 ? 
                    ((networkMetrics.successfulRequests / networkMetrics.totalRequests) * 100).toFixed(1) : '0'
                  }%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Avg Time:</span>
                <span className="text-gray-400">
                  {networkMetrics.averageResponseTime.toFixed(0)}ms
                </span>
              </div>
            </div>
            
            {/* Детали компонентов */}
            {showComponentDetails && showDetails && (
              <>
                <div className="border-t border-gray-600 mt-2 pt-2">
                  <div className="text-blue-400 font-bold mb-1">Slow Components:</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {topSlow.map((component) => (
                        <div key={component.name} className="flex justify-between text-xs">
                          <span className="truncate max-w-[100px]" title={component.name}>
                            {component.name}
                          </span>
                          <span className={component.averageRenderTime > 16 ? 'text-red-400' : 
                            component.averageRenderTime > 8 ? 'text-yellow-400' : 'text-green-400'}>
                            {component.averageRenderTime.toFixed(1)}ms
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </>
            )}
            
            {/* Действия */}
            <div className="border-t border-gray-600 mt-2 pt-2 flex space-x-2">
              <button
                onClick={() => {
                  resetMetrics()
                  globalMetrics.componentRenders.clear()
                  globalMetrics.totalRenders = 0

                }}
                className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
              >
                Clear
              </button>
              
              <button
                onClick={() => {
                  const report = {
                    timestamp: new Date().toISOString(),
                    metrics,
                    components: Array.from(globalMetrics.componentRenders.entries())
                  }

                  console.table(Array.from(globalMetrics.componentRenders.entries()))
                }}
                className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors"
              >
                Log
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// HOC для отслеживания рендеров компонентов
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const TrackedComponent = React.forwardRef<any, P>((props, ref) => {
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown'
    const renderStartTime = useRef<number>(0)
    
    // Отслеживание начала рендера
    renderStartTime.current = performance.now()
    
    useEffect(() => {
      // Отслеживание завершения рендера
      const renderTime = performance.now() - (renderStartTime.current || 0)
      
      // Обновление глобальных метрик
      globalMetrics.totalRenders++
      
      const existing = globalMetrics.componentRenders.get(name)
      if (existing) {
        existing.renderCount++
        existing.lastRenderTime = renderTime
        existing.averageRenderTime = (
          (existing.averageRenderTime * (existing.renderCount - 1) + renderTime) / 
          existing.renderCount
        )
      } else {
        globalMetrics.componentRenders.set(name, {
          name,
          renderCount: 1,
          lastRenderTime: renderTime,
          averageRenderTime: renderTime
        })
      }
      
      // Предупреждение о медленных рендерах
      if (renderTime > 16) { // Больше одного кадра при 60 FPS
        logger.warn(`Slow render detected in ${name}: ${renderTime.toFixed(2)}ms`)
      }
    })
    
    return <WrappedComponent {...(props as P)} ref={ref} />
  })
  
  TrackedComponent.displayName = `withPerformanceTracking(${componentName || WrappedComponent.displayName || WrappedComponent.name})`
  
  return TrackedComponent
}

// Хук для измерения производительности функций
export function usePerformanceMeasure() {
  const measure = useCallback((name: string, fn: () => void | Promise<void>) => {
    const start = performance.now()
    
    const result = fn()
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start

      })
    } else {
      const duration = performance.now() - start

      return result
    }
  }, [])
  
  return { measure }
}

// Хук для отслеживания изменений пропсов
export function usePropsChangeTracker<T extends Record<string, any>>(
  props: T,
  componentName: string
) {
  const prevProps = useRef<T | undefined>(undefined)
  
  useEffect(() => {
    if (prevProps.current) {
      const changedProps: string[] = []
      
      Object.keys(props).forEach(key => {
        if (props[key] !== prevProps.current![key]) {
          changedProps.push(key)
        }
      })
      
      if (changedProps.length > 0) {

      }
    }
    
    prevProps.current = props
  }, [props, componentName])
}