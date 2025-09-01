'use client'

import React, { memo, useMemo, useCallback, useState } from 'react'
import { VirtualizedList } from './VirtualizedList'

interface OptimizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string
  itemHeight?: number
  containerHeight?: number
  enableVirtualization?: boolean
  enableSearch?: boolean
  searchPlaceholder?: string
  searchFields?: (keyof T)[]
  filterFunction?: (item: T, searchTerm: string) => boolean
  sortFunction?: (a: T, b: T) => number
  className?: string
  emptyMessage?: string
  loadingMessage?: string
  isLoading?: boolean
  onItemClick?: (item: T, index: number) => void
}

// Мемоизированный элемент списка
function MemoizedListItemComponent<T>({
  item,
  index,
  renderItem,
  keyExtractor,
  onItemClick
}: {
  item: T
  index: number
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string
  onItemClick?: (item: T, index: number) => void
}) {
  const handleClick = useCallback(() => {
    onItemClick?.(item, index)
  }, [item, index, onItemClick])

  return (
    <div
      key={keyExtractor(item, index)}
      onClick={handleClick}
      className={onItemClick ? 'cursor-pointer' : ''}
    >
      {renderItem(item, index)}
    </div>
  )
}

const MemoizedListItem = memo(MemoizedListItemComponent) as typeof MemoizedListItemComponent

export function OptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  itemHeight = 60,
  containerHeight = 400,
  enableVirtualization = false,
  enableSearch = false,
  searchPlaceholder = 'Поиск...',
  searchFields,
  filterFunction,
  sortFunction,
  className = '',
  emptyMessage = 'Нет элементов для отображения',
  loadingMessage = 'Загрузка...',
  isLoading = false,
  onItemClick
}: OptimizedListProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')

  // Функция поиска по умолчанию
  const defaultFilterFunction = useCallback((item: T, term: string): boolean => {
    if (!term) return true
    
    const searchLower = term.toLowerCase()
    
    if (searchFields && searchFields.length > 0) {
      return searchFields.some(field => {
        const value = item[field]
        return String(value).toLowerCase().includes(searchLower)
      })
    }
    
    // Поиск по всем строковым полям объекта
    return Object.values(item as any).some(value => 
      String(value).toLowerCase().includes(searchLower)
    )
  }, [searchFields])

  // Фильтрация и сортировка элементов
  const processedItems = useMemo(() => {
    let result = [...items]
    
    // Фильтрация
    if (enableSearch && searchTerm) {
      const filter = filterFunction || defaultFilterFunction
      result = result.filter(item => filter(item, searchTerm))
    }
    
    // Сортировка
    if (sortFunction) {
      result.sort(sortFunction)
    }
    
    return result
  }, [items, searchTerm, enableSearch, filterFunction, defaultFilterFunction, sortFunction])

  // Мемоизированная функция рендеринга для виртуализации
  const memoizedRenderItem = useCallback((item: T, index: number) => (
    <MemoizedListItem
      item={item}
      index={index}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onItemClick={onItemClick}
    />
  ), [renderItem, keyExtractor, onItemClick])

  // Обычный рендеринг списка
  const renderNormalList = () => (
    <div className={`space-y-2 ${className}`}>
      {processedItems.map((item, index) => (
        <MemoizedListItem
          key={keyExtractor(item, index)}
          item={item}
          index={index}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">{loadingMessage}</div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Поисковая строка */}
      {enableSearch && (
        <div className="mb-4">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Список элементов */}
      {processedItems.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">{emptyMessage}</div>
        </div>
      ) : enableVirtualization ? (
        <VirtualizedList<T>
          items={processedItems}
          itemHeight={itemHeight}
          containerHeight={containerHeight}
          renderItem={memoizedRenderItem}
          className={className}
        />
      ) : (
        renderNormalList()
      )}
    </div>
  )
}

// Хук для оптимизации больших списков
export function useOptimizedList<T>({
  items,
  pageSize = 50,
  enablePagination = false
}: {
  items: T[]
  pageSize?: number
  enablePagination?: boolean
}) {
  const [currentPage, setCurrentPage] = useState(1)
  
  const paginatedItems = useMemo(() => {
    if (!enablePagination) return items
    
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return items.slice(startIndex, endIndex)
  }, [items, currentPage, pageSize, enablePagination])
  
  const totalPages = Math.ceil(items.length / pageSize)
  
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])
  
  const nextPage = useCallback(() => {
    goToPage(currentPage + 1)
  }, [currentPage, goToPage])
  
  const prevPage = useCallback(() => {
    goToPage(currentPage - 1)
  }, [currentPage, goToPage])
  
  return {
    items: paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  }
}

// Компонент пагинации
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  maxVisiblePages?: number
  className?: string
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  maxVisiblePages = 5,
  className = ''
}: PaginationProps) {
  const getVisiblePages = useMemo(() => {
    const pages: number[] = []
    const halfVisible = Math.floor(maxVisiblePages / 2)
    
    let startPage = Math.max(1, currentPage - halfVisible)
    let endPage = Math.min(totalPages, currentPage + halfVisible)
    
    // Корректировка если страниц меньше максимального количества
    if (endPage - startPage + 1 < maxVisiblePages) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
      } else {
        startPage = Math.max(1, endPage - maxVisiblePages + 1)
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    return pages
  }, [currentPage, totalPages, maxVisiblePages])
  
  if (totalPages <= 1) return null
  
  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      {/* Первая страница */}
      {showFirstLast && currentPage > 1 && (
        <button
          onClick={() => onPageChange(1)}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Первая
        </button>
      )}
      
      {/* Предыдущая страница */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ←
      </button>
      
      {/* Номера страниц */}
      {getVisiblePages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 text-sm border rounded-md ${
            page === currentPage
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white border-gray-300 hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      ))}
      
      {/* Следующая страница */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        →
      </button>
      
      {/* Последняя страница */}
      {showFirstLast && currentPage < totalPages && (
        <button
          onClick={() => onPageChange(totalPages)}
          className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Последняя
        </button>
      )}
    </div>
  )
}