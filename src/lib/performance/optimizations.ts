import { memo, lazy, ComponentType, LazyExoticComponent, createElement } from 'react'

// Простой logger для разработки
const logger = {
  dev: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] ${message}`, ...args)
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args)
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args)
  }
}

// Типы для оптимизации
interface OptimizationConfig {
  shouldMemoize?: boolean
  shouldLazyLoad?: boolean
  displayName?: string
  propsAreEqual?: (prevProps: any, nextProps: any) => boolean
}

// Глубокое сравнение пропсов для memo
export const deepPropsAreEqual = <T extends Record<string, any>>(
  prevProps: T,
  nextProps: T
): boolean => {
  const prevKeys = Object.keys(prevProps)
  const nextKeys = Object.keys(nextProps)
  
  if (prevKeys.length !== nextKeys.length) {
    return false
  }
  
  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      // Глубокое сравнение для объектов и массивов
      if (
        typeof prevProps[key] === 'object' &&
        typeof nextProps[key] === 'object' &&
        prevProps[key] !== null &&
        nextProps[key] !== null
      ) {
        if (Array.isArray(prevProps[key]) && Array.isArray(nextProps[key])) {
          if (prevProps[key].length !== nextProps[key].length) {
            return false
          }
          for (let i = 0; i < prevProps[key].length; i++) {
            if (prevProps[key][i] !== nextProps[key][i]) {
              return false
            }
          }
        } else {
          return deepPropsAreEqual(prevProps[key], nextProps[key])
        }
      } else {
        return false
      }
    }
  }
  
  return true
}

// Поверхностное сравнение пропсов
export const shallowPropsAreEqual = <T extends Record<string, any>>(
  prevProps: T,
  nextProps: T
): boolean => {
  const prevKeys = Object.keys(prevProps)
  const nextKeys = Object.keys(nextProps)
  
  if (prevKeys.length !== nextKeys.length) {
    return false
  }
  
  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false
    }
  }
  
  return true
}

// Оптимизация компонента с мемоизацией
export const optimizeComponent = <P extends Record<string, any>>(
  Component: ComponentType<P>,
  config: OptimizationConfig = {}
): ComponentType<P> => {
  const {
    shouldMemoize = true,
    displayName,
    propsAreEqual = shallowPropsAreEqual
  } = config
  
  let OptimizedComponent = Component
  
  if (shouldMemoize) {
    OptimizedComponent = memo(Component, propsAreEqual)
    
    if (displayName) {
      OptimizedComponent.displayName = `Optimized(${displayName})`
    }
    
    logger.dev(`Component ${displayName || Component.name} optimized with memoization`)
  }
  
  return OptimizedComponent
}

// Ленивая загрузка компонента
export const lazyLoadComponent = <P extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  displayName?: string
): LazyExoticComponent<ComponentType<P>> => {
  const LazyComponent = lazy(importFn)
  
  logger.dev(`Component ${displayName} configured for lazy loading`)
  
  return LazyComponent
}

// Комбинированная оптимизация
export const createOptimizedComponent = <P extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  config: OptimizationConfig = {}
): LazyExoticComponent<ComponentType<P>> => {
  const {
    shouldMemoize = true,
    shouldLazyLoad = true,
    displayName,
    propsAreEqual = shallowPropsAreEqual
  } = config
  
  if (shouldLazyLoad) {
    return lazy(async () => {
      const moduleResult = await importFn()
      const Component = moduleResult.default
      
      if (shouldMemoize) {
        const MemoizedComponent = memo(Component, propsAreEqual)
        if (displayName) {
          MemoizedComponent.displayName = displayName
        }
        return { default: MemoizedComponent as ComponentType<P> }
      }
      
      return { default: Component as ComponentType<P> }
    }) as LazyExoticComponent<ComponentType<P>>
  }
  
  // Если ленивая загрузка отключена, возвращаем обычный компонент
  // Это требует синхронного импорта, что не идеально для этой функции
  throw new Error('createOptimizedComponent requires lazy loading to be enabled')
}

// Хук для предзагрузки компонентов
export const useComponentPreloader = () => {
  const preloadComponent = async <P extends Record<string, any>>(
    importFn: () => Promise<{ default: ComponentType<P> }>
  ): Promise<void> => {
    try {
      await importFn()
      logger.dev('Component preloaded successfully')
    } catch (error) {
      logger.error('Failed to preload component:', error)
    }
  }
  
  return { preloadComponent }
}

// Утилиты для анализа производительности
export const measureComponentRender = <P extends Record<string, any>>(
  Component: ComponentType<P>,
  name?: string
): ComponentType<P> => {
  const MeasuredComponent = (props: P) => {
    const startTime = performance.now()
    
    const result = createElement(Component, props)
    
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    if (renderTime > 16) { // Больше одного кадра при 60 FPS
      logger.warn(`Slow render in ${name || Component.name}: ${renderTime.toFixed(2)}ms`)
    }
    
    return result
  }
  
  MeasuredComponent.displayName = `Measured(${name || Component.name})`
  
  return MeasuredComponent
}

// Предустановленные конфигурации оптимизации
export const OPTIMIZATION_PRESETS = {
  // Для статических компонентов (редко изменяются)
  STATIC: {
    shouldMemoize: true,
    shouldLazyLoad: false,
    propsAreEqual: deepPropsAreEqual
  },
  
  // Для динамических компонентов (часто изменяются)
  DYNAMIC: {
    shouldMemoize: true,
    shouldLazyLoad: false,
    propsAreEqual: shallowPropsAreEqual
  },
  
  // Для тяжелых компонентов (требуют ленивой загрузки)
  HEAVY: {
    shouldMemoize: true,
    shouldLazyLoad: true,
    propsAreEqual: shallowPropsAreEqual
  },
  
  // Для компонентов модальных окон
  MODAL: {
    shouldMemoize: true,
    shouldLazyLoad: true,
    propsAreEqual: deepPropsAreEqual
  },
  
  // Для списков и таблиц
  LIST: {
    shouldMemoize: true,
    shouldLazyLoad: false,
    propsAreEqual: shallowPropsAreEqual
  }
} as const



// Экспорт типов
export type { OptimizationConfig }