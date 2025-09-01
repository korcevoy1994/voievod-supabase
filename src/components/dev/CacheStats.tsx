/**
 * Компонент для отображения статистики кэша в режиме разработки
 */

'use client'

import { useState, useEffect } from 'react'
import { useCacheStats, useCacheInvalidation } from '@/lib/hooks/useOptimizedData'
import { globalCache } from '@/lib/cache/enhancedCache'

interface CacheStatsProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  minimized?: boolean
}

export function CacheStats({ 
  position = 'bottom-right', 
  minimized: initialMinimized = true 
}: CacheStatsProps) {
  const [minimized, setMinimized] = useState(initialMinimized)
  const [visible, setVisible] = useState(false)
  const stats = useCacheStats()
  const { invalidateAll } = useCacheInvalidation()

  // Показываем только в режиме разработки
  useEffect(() => {
    setVisible(process.env.NODE_ENV === 'development')
  }, [])

  if (!visible) return null

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    return `${Math.round(ms / 60000)}m`
  }

  return (
    <div 
      className={`fixed ${positionClasses[position]} z-50 bg-black/80 text-white text-xs rounded-lg border border-gray-600 font-mono`}
      style={{ backdropFilter: 'blur(4px)' }}
    >
      {minimized ? (
        <button
          onClick={() => setMinimized(false)}
          className="px-3 py-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Показать статистику кэша"
        >
          📊 Cache ({stats.size})
        </button>
      ) : (
        <div className="p-3 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-green-400">Cache Stats</h3>
            <div className="flex gap-1">
              <button
                onClick={invalidateAll}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                title="Очистить весь кэш"
              >
                Clear
              </button>
              <button
                onClick={() => setMinimized(true)}
                className="px-2 py-1 hover:bg-white/10 rounded transition-colors"
                title="Свернуть"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Items:</span>
              <span className="text-blue-400">{stats.size}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Pending:</span>
              <span className="text-yellow-400">{stats.pendingRequests}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Total Access:</span>
              <span className="text-green-400">{stats.totalAccesses}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-300">Avg Age:</span>
              <span className="text-purple-400">{formatTime(stats.averageAge)}</span>
            </div>
            
            {stats.size > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-300">Hit Rate:</span>
                <span className="text-cyan-400">
                  {Math.round((stats.totalAccesses / stats.size) * 100) / 100}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="text-xs text-gray-400">
              💡 Кэш автоматически очищается при превышении лимита
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Хук для управления видимостью статистики кэша
 */
export function useCacheStatsToggle() {
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + C для переключения статистики кэша
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault()
        setShowStats(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return { showStats, setShowStats }
}