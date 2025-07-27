'use client'

import React, { forwardRef, useEffect, useRef, useState } from 'react'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { useZoneSeats } from '@/lib/hooks/useSupabaseData'

interface SeatMapSupabaseProps {
  zoneId: string
  selectedSeats: string[]
  onSeatClick: (seatId: string) => void
  eventId?: string
  price: number
}

const SeatMapSupabase = forwardRef<ReactZoomPanPinchRef, SeatMapSupabaseProps>(
  ({ zoneId, selectedSeats, onSeatClick, eventId = 'voevoda', price }, ref) => {
    const { seats, loading, error } = useZoneSeats(zoneId)
    const containerRef = useRef<HTMLDivElement>(null)
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null)

    useEffect(() => {
      if (!containerRef.current || loading || error || seats.length === 0) return

      const container = containerRef.current
      
      // Load correct SVG file based on zone ID
      const svgFile = `/${zoneId}.svg`
      
      fetch(svgFile)
        .then(response => response.text())
        .then(svgContent => {
          container.innerHTML = svgContent
          const svg = container.querySelector('svg')
          if (!svg) return

          // Make SVG responsive
          svg.setAttribute('width', '100%')
          svg.setAttribute('height', '100%')
          svg.style.width = '100%'
          svg.style.height = '100%'
          svg.setAttribute('class', 'w-full h-full')
          svg.style.display = 'block'
          svg.style.objectFit = 'contain'
          svg.style.margin = '0'
          svg.style.padding = '0'
        
          // Add interactivity to seats using Supabase data
          seats.forEach(seat => {
            // Convert seat ID format: "202-K-01" -> "K - 01"
            const [, row, number] = seat.id.split('-')
            const svgSeatId = `${row} - ${number.padStart(2, '0')}`
            const seatElement = svg.querySelector(`[id='${svgSeatId}']`) as SVGElement
            
            if (!seatElement) {
              console.warn(`Seat element not found for ID: ${svgSeatId}`)
              return
            }

            // Set initial state
            const isSelected = selectedSeats.includes(seat.id)
            // Место кликабельно если оно доступно или уже выбрано (для отмены)
            const isClickable = seat.status === 'available' || seat.status === 'selected' || isSelected
            
            // Apply styles based on seat status
            switch (seat.status) {
              case 'unavailable':
                seatElement.setAttribute('fill', '#9CA3AF') // gray-400
                seatElement.style.cursor = 'not-allowed'
                break
              case 'reserved':
                if (isSelected) {
                  // Если место зарезервировано, но выбрано нами - показываем как выбранное и разрешаем кликать
                  seatElement.setAttribute('fill', '#fff')
                  seatElement.setAttribute('stroke', '#d1d5db') // gray-300
                  seatElement.setAttribute('stroke-width', '3')
                  seatElement.style.filter = 'drop-shadow(0 0 8px #fff)'
                  seatElement.style.cursor = 'pointer'
                } else {
                  // Зарезервировано другим пользователем
                  seatElement.setAttribute('fill', '#FBBF24') // yellow-400
                  seatElement.style.cursor = 'not-allowed'
                }
                break
              case 'sold':
                seatElement.setAttribute('fill', '#9CA3AF') // gray-400 (как blocked)
                seatElement.style.cursor = 'not-allowed'
                break
              case 'blocked':
                seatElement.setAttribute('fill', '#374151') // gray-700
                seatElement.style.cursor = 'not-allowed'
                break
              case 'available':
              default:
                if (isSelected) {
                  // Selected seat - белый с серой рамкой и glow
                  seatElement.setAttribute('fill', '#fff')
                  seatElement.setAttribute('stroke', '#d1d5db') // gray-300
                  seatElement.setAttribute('stroke-width', '3')
                  seatElement.style.filter = 'drop-shadow(0 0 8px #fff)'
                  seatElement.style.cursor = 'pointer'
                } else {
                  // Available seat - цвет зоны из Supabase
                  seatElement.setAttribute('fill', seat.fill || '#8525D9')
                  seatElement.setAttribute('stroke', 'none')
                  seatElement.style.filter = 'none'
                  seatElement.style.cursor = 'pointer'
                }
                break
            }

            // Add event handlers
            const handleClick = () => {
              if (isClickable) {
                onSeatClick(seat.id)
              }
            }

            const handleMouseEnter = (e: MouseEvent) => {
              if (!isClickable) return
              if (!selectedSeats.includes(seat.id)) {
                seatElement.setAttribute('fill', '#fff')
                seatElement.style.opacity = '0.8'
              } else {
                // Для выбранных мест показываем эффект при наведении
                seatElement.style.opacity = '0.8'
              }
              // Tooltip
              const rect = svg.getBoundingClientRect()
              let x = e.clientX - rect.left
              let y = e.clientY - rect.top - 24
              // учёт границ
              const tooltipWidth = 110
              const tooltipHeight = 32
              if (x + tooltipWidth > rect.width) x = rect.width - tooltipWidth - 8
              if (y < 0) y = 8
              
              // Show status in tooltip
              const statusText = {
                available: 'Disponibil',
                selected: 'Selectat',
                unavailable: 'Indisponibil',
                reserved: 'Rezervat',
                sold: 'Vândut',
                blocked: 'Blocat'
              }[seat.status] || 'Necunoscut'
              
              setTooltip({
                x,
                y,
                content: `Rând: ${seat.row}, Loc: ${parseInt(seat.number, 10)}`
              })
            }

            const handleMouseLeave = () => {
              if (!isClickable) return
              if (!selectedSeats.includes(seat.id)) {
                // Reset to original color
                seatElement.setAttribute('fill', seat.fill || '#8525D9')
                seatElement.style.opacity = '1'
              } else {
                // Для выбранных мест возвращаем нормальную прозрачность
                seatElement.style.opacity = '1'
              }
              setTooltip(null)
            }

            seatElement.addEventListener('click', handleClick)
            seatElement.addEventListener('mouseenter', handleMouseEnter)
            seatElement.addEventListener('mouseleave', handleMouseLeave)
            seatElement.addEventListener('mousemove', (e: MouseEvent) => {
              if (tooltip) {
                const rect = svg.getBoundingClientRect()
                let x = e.clientX - rect.left
                let y = e.clientY - rect.top - 24
                const tooltipWidth = 110
                const tooltipHeight = 32
                if (x + tooltipWidth > rect.width) x = rect.width - tooltipWidth - 8
                if (y < 0) y = 8
                setTooltip({
                  x,
                  y,
                  content: `Rând: ${seat.row}, Loc: ${parseInt(seat.number, 10)}`
                })
              }
            })
          })
        })
        .catch(error => {
          console.error('Error loading SVG:', error)
        })
    }, [seats, selectedSeats, onSeatClick, zoneId, loading, error])

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-lg">Загрузка мест...</div>
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

    if (seats.length === 0) {
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