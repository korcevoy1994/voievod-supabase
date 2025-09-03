'use client'

import React, { forwardRef, useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { useZoneSeats } from '@/lib/hooks/useSupabaseData'
import { useOptimizedZoneSeats } from '@/lib/hooks/useOptimizedData'
import { logger } from '@/lib/logger'

// Типы данных
interface SeatData {
  id: string
  row: string
  number: string
  x: number
  y: number
  status: 'available' | 'unavailable' | 'selected' | 'reserved' | 'sold' | 'blocked'
  price: number
  fill: string
}

// Глобальный кэш для SVG файлов
const svgCache = new Map<string, string>()

// Батчинг DOM операций
class DOMBatcher {
  private operations: (() => void)[] = []
  private rafId: number | null = null

  add(operation: () => void) {
    this.operations.push(operation)
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.flush()
      })
    }
  }

  flush() {
    const ops = this.operations.splice(0)
    ops.forEach(op => op())
    this.rafId = null
  }
}

const domBatcher = new DOMBatcher()

interface SeatMapSupabaseProps {
  zoneId: string
  selectedSeats: string[]
  onSeatClick: (seatId: string) => void
  eventId?: string
  price?: number
}

const SeatMapSupabase = forwardRef<ReactZoomPanPinchRef, SeatMapSupabaseProps>(
  ({ zoneId, selectedSeats, onSeatClick, eventId = '550e8400-e29b-41d4-a716-446655440000' }, ref) => {
    const { data: seats, loading, error } = useOptimizedZoneSeats(zoneId, eventId)
    const containerRef = useRef<HTMLDivElement>(null)
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null)
    const eventListenersRef = useRef<Map<string, { element: SVGElement; listeners: (() => void)[] }>>(new Map())

    // Мемоизированная функция для загрузки SVG
    const loadSVG = useCallback(async (zoneId: string): Promise<string> => {
      if (svgCache.has(zoneId)) {
        return svgCache.get(zoneId)!
      }

      // Определяем правильное имя файла SVG
      let svgFileName: string
      if (['A', 'B', 'C'].includes(zoneId)) {
        svgFileName = `Sector ${zoneId}.svg`
      } else {
        svgFileName = `${zoneId}.svg`
      }

      const response = await fetch(`/${svgFileName}`)
      if (!response.ok) {
        throw new Error(`Failed to load SVG for zone ${zoneId} (${svgFileName})`)
      }
      
      const svgContent = await response.text()
      svgCache.set(zoneId, svgContent)
      return svgContent
    }, [])

    // Мемоизированная карта мест для быстрого поиска
    const seatsMap = useMemo(() => {
      const map = new Map<string, SeatData>()
      const seatsArray = seats?.seats || seats
      if (Array.isArray(seatsArray)) {
        // Processing seats for zone
        seatsArray.forEach((seat: SeatData, index) => {
          // Для зон A,B,C номера приходят как "1", "2", нужно добавить ведущий ноль
          // Для зон 201-212 номера уже приходят как "01", "02"
          const paddedNumber = seat.number.length === 1 ? seat.number.padStart(2, '0') : seat.number
          const svgSeatId = `${seat.row} - ${paddedNumber}`
          map.set(svgSeatId, seat)
          if (index < 3) {
            // Processing seat
          }
        })
        // Created seat map
      } else {
        // No seats array found
      }
      return map
    }, [seats, zoneId, eventId])

    // Очистка event listeners
    const cleanupEventListeners = useCallback(() => {
      eventListenersRef.current.forEach(({ element, listeners }) => {
        listeners.forEach(cleanup => cleanup())
      })
      eventListenersRef.current.clear()
    }, [])

    useEffect(() => {
      const seatsArray = seats?.seats || seats
      if (!containerRef.current || loading || error || !Array.isArray(seatsArray) || seatsArray.length === 0) return

      const container = containerRef.current
      
      // Очищаем предыдущие listeners
      cleanupEventListeners()
      
      loadSVG(zoneId)
        .then(svgContent => {
          container.innerHTML = svgContent
          const svg = container.querySelector('svg')
          if (!svg) return

          // Настройка SVG
          domBatcher.add(() => {
            svg.setAttribute('width', '100%')
            svg.setAttribute('height', '100%')
            svg.style.cssText = 'width: 100%; height: 100%; display: block; object-fit: contain; margin: 0; padding: 0;'
            svg.setAttribute('class', 'w-full h-full')
          })
          
          // Батчинг обработки мест
          const seatUpdates: Array<() => void> = []
          let foundCount = 0
          let notFoundCount = 0
          
          seatsMap.forEach((seat, svgSeatId) => {
            const seatElement = svg.querySelector(`[id='${svgSeatId}']`) as SVGElement
            
            if (!seatElement) {
              notFoundCount++
              if (notFoundCount <= 3) {
                // Seat element not found
              }
              logger.warn(`Seat element not found for ID: ${svgSeatId}`)
              return
            }
            
            foundCount++
            if (foundCount <= 3) {
              // Seat element found
            }

            const isSelected = selectedSeats.includes(seat.id)
            const isClickable = seat.status === 'available' || seat.status === 'selected' || isSelected
            
            // Создаем функцию обновления стилей
            const updateStyles = () => {
              switch (seat.status) {
                case 'unavailable':
                  seatElement.setAttribute('fill', '#9CA3AF')
                  seatElement.style.cursor = 'not-allowed'
                  break
                case 'reserved':
                  if (isSelected) {
                    seatElement.setAttribute('fill', '#fff')
                    seatElement.setAttribute('stroke', '#d1d5db')
                    seatElement.setAttribute('stroke-width', '3')
                    seatElement.style.filter = 'drop-shadow(0 0 8px #fff)'
                    seatElement.style.cursor = 'pointer'
                  } else {
                    seatElement.setAttribute('fill', '#FBBF24')
                    seatElement.style.cursor = 'not-allowed'
                  }
                  break
                case 'sold':
                  seatElement.setAttribute('fill', '#9CA3AF')
                  seatElement.style.cursor = 'not-allowed'
                  break
                case 'blocked':
                  seatElement.setAttribute('fill', '#374151')
                  seatElement.style.cursor = 'not-allowed'
                  break
                case 'available':
                default:
                  if (isSelected) {
                    seatElement.setAttribute('fill', '#fff')
                    seatElement.setAttribute('stroke', '#d1d5db')
                    seatElement.setAttribute('stroke-width', '3')
                    seatElement.style.filter = 'drop-shadow(0 0 8px #fff)'
                    seatElement.style.cursor = 'pointer'
                  } else {
                    const finalFill = seat.fill || '#8525D9'
                    seatElement.setAttribute('fill', finalFill)
                    seatElement.setAttribute('stroke', 'none')
                    seatElement.style.filter = 'none'
                    seatElement.style.cursor = 'pointer'
                  }
                  break
              }
            }

            seatUpdates.push(updateStyles)

            // Оптимизированные event handlers
            if (isClickable) {
              const handleClick = () => onSeatClick(seat.id)
              
              const handleMouseEnter = (e: MouseEvent) => {
                if (!selectedSeats.includes(seat.id)) {
                  seatElement.setAttribute('fill', '#fff')
                  seatElement.style.opacity = '0.8'
                } else {
                  seatElement.style.opacity = '0.8'
                }
                
                const rect = svg.getBoundingClientRect()
                let x = e.clientX - rect.left
                let y = e.clientY - rect.top - 24
                const tooltipWidth = 110
                if (x + tooltipWidth > rect.width) x = rect.width - tooltipWidth - 8
                if (y < 0) y = 8
                
                setTooltip({
                  x,
                  y,
                  content: `Rând: ${seat.row}, Loc: ${parseInt(seat.number, 10)}, Preț: ${seat.price} lei`
                })
              }

              const handleMouseLeave = () => {
                if (!selectedSeats.includes(seat.id)) {
                  seatElement.setAttribute('fill', seat.fill || '#8525D9')
                  seatElement.style.opacity = '1'
                } else {
                  seatElement.style.opacity = '1'
                }
                setTooltip(null)
              }

              const handleMouseMove = (e: MouseEvent) => {
                if (tooltip) {
                  const rect = svg.getBoundingClientRect()
                  let x = e.clientX - rect.left
                  let y = e.clientY - rect.top - 24
                  const tooltipWidth = 110
                  if (x + tooltipWidth > rect.width) x = rect.width - tooltipWidth - 8
                  if (y < 0) y = 8
                  setTooltip({
                    x,
                    y,
                    content: `Rând: ${seat.row}, Loc: ${parseInt(seat.number, 10)}, Preț: ${seat.price} lei`
                  })
                }
              }

              seatElement.addEventListener('click', handleClick)
              seatElement.addEventListener('mouseenter', handleMouseEnter)
              seatElement.addEventListener('mouseleave', handleMouseLeave)
              seatElement.addEventListener('mousemove', handleMouseMove)

              // Сохраняем cleanup функции
              const listeners = [
                () => seatElement.removeEventListener('click', handleClick),
                () => seatElement.removeEventListener('mouseenter', handleMouseEnter),
                () => seatElement.removeEventListener('mouseleave', handleMouseLeave),
                () => seatElement.removeEventListener('mousemove', handleMouseMove)
              ]
              
              eventListenersRef.current.set(seat.id, { element: seatElement, listeners })
            }
          })

          // Processing complete

          // Выполняем все обновления стилей батчем
          domBatcher.add(() => {
            seatUpdates.forEach(update => update())
          })
        })
        .catch(error => {
          logger.error('Error loading SVG', error)
        })

      return () => {
        cleanupEventListeners()
      }
    }, [seats, selectedSeats, onSeatClick, zoneId, loading, error, seatsMap, loadSVG, cleanupEventListeners])

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-lg">Încărcare locuri...</div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-red-400 text-lg">Ошибка загрузки: {error}</div>
        </div>
      )
    }

    const seatsArray = seats?.seats || seats
    if (!Array.isArray(seatsArray) || seatsArray.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400 text-lg">Места не найдены для зоны {zoneId}</div>
        </div>
      )
    }

    if (!zoneId) return null

    return (
      <div className="w-full h-full overflow-hidden" style={{ position: 'relative' }}>
        <TransformWrapper
          ref={ref}
          minScale={1}
          maxScale={5}
          limitToBounds
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: '100%', height: '100%', display: 'block', margin: 0, padding: 0 }}
          >
            <div
              ref={containerRef}
              className="w-full h-full"
              style={{ width: '100%', height: '100%', display: 'block', margin: 0, padding: 0 }}
            />
            {tooltip && (
              <div
                style={{
                  position: 'absolute',
                  left: tooltip.x,
                  top: tooltip.y,
                  background: 'white',
                  color: 'black',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  pointerEvents: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  whiteSpace: 'nowrap',
                }}
              >
                {tooltip.content}
              </div>
            )}
          </TransformComponent>
        </TransformWrapper>
      </div>
    )
  }
)

SeatMapSupabase.displayName = 'SeatMapSupabase'

export default SeatMapSupabase