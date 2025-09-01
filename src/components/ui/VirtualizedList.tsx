'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  onScroll?: (scrollTop: number) => void
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Вычисляем видимые элементы
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  // Обработчик скролла с throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  // Общая высота контейнера
  const totalHeight = items.length * itemHeight

  // Видимые элементы
  const visibleItems = useMemo(() => {
    const result = []
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (items[i]) {
        result.push({
          item: items[i],
          index: i,
          top: i * itemHeight
        })
      }
    }
    return result
  }, [items, visibleRange, itemHeight])

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Хук для автоматического определения высоты элемента
export function useItemHeight<T>(items: T[], sampleSize = 10) {
  const [itemHeight, setItemHeight] = useState(50) // Значение по умолчанию
  const measureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (measureRef.current && items.length > 0) {
      // Измеряем высоту первых нескольких элементов
      const heights: number[] = []
      const children = measureRef.current.children
      
      for (let i = 0; i < Math.min(sampleSize, children.length); i++) {
        heights.push(children[i].getBoundingClientRect().height)
      }
      
      if (heights.length > 0) {
        const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length
        setItemHeight(Math.ceil(avgHeight))
      }
    }
  }, [items, sampleSize])

  return { itemHeight, measureRef }
}

// Компонент для измерения высоты элементов
interface ItemMeasurerProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  sampleSize?: number
  onHeightMeasured: (height: number) => void
}

export function ItemMeasurer<T>({
  items,
  renderItem,
  sampleSize = 5,
  onHeightMeasured
}: ItemMeasurerProps<T>) {
  const { itemHeight, measureRef } = useItemHeight(items, sampleSize)

  useEffect(() => {
    if (itemHeight > 0) {
      onHeightMeasured(itemHeight)
    }
  }, [itemHeight, onHeightMeasured])

  return (
    <div
      ref={measureRef}
      style={{
        position: 'absolute',
        top: -9999,
        left: -9999,
        visibility: 'hidden',
        pointerEvents: 'none'
      }}
    >
      {items.slice(0, sampleSize).map((item, index) => (
        <div key={index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}