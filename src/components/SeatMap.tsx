'use client'
import { forwardRef, useEffect, useRef, useState } from 'react'
import { getZoneData } from '@/lib/zoneData'
import { TransformWrapper, TransformComponent, ReactZoomPanPinchContentRef } from 'react-zoom-pan-pinch'
import { logger } from '@/lib/logger'

interface SeatMapProps {
  zoneId: string
  price: number
  selectedSeats: string[]
  onSeatClick: (id: string) => void
}

const SeatMap = forwardRef<ReactZoomPanPinchContentRef, SeatMapProps>(({ zoneId, price, selectedSeats, onSeatClick }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

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
        // svg.style.background = 'red' // debug
      
        // Add interactivity to seats
        const seats = getZoneData(zoneId)
        seats.forEach(seat => {
          // Convert seat ID format: \"202-K-01\" -> \"K - 01\" (for 201) or \"K - 1\" (for 202)
          const [ , row, number] = seat.id.split('-')
          const svgSeatId = `${row} - ${number.padStart(2, '0')}`
          const seatElement = svg.querySelector(`[id='${svgSeatId}']`) as SVGElement
          
          if (!seatElement) {
            logger.warn(`Seat element not found for ID: ${svgSeatId}`)
            return
          }

          // Set initial state
          const isSelected = selectedSeats.includes(seat.id)
          const isUnavailable = seat.status === 'unavailable'
          
          if (isUnavailable) {
            seatElement.setAttribute('fill', '#9CA3AF') // gray-400
            seatElement.style.cursor = 'not-allowed'
          } else if (isSelected) {
            // Selected seat - белый с серой рамкой и glow
            seatElement.setAttribute('fill', '#fff')
            seatElement.setAttribute('stroke', '#d1d5db') // gray-300
            seatElement.setAttribute('stroke-width', '3')
            seatElement.style.filter = 'drop-shadow(0 0 8px #fff)'
            seatElement.style.cursor = 'pointer'
          } else {
            // Available seat - оригинальный цвет из SVG
            seatElement.setAttribute('fill', (seat as any).fill || '#8525D9')
            seatElement.setAttribute('stroke', 'none')
            seatElement.style.filter = 'none'
            seatElement.style.cursor = 'pointer'
          }

          // Add event handlers
          const handleClick = () => {
            if (seat.status !== 'unavailable') {
              onSeatClick(seat.id)
            }
          }

          const handleMouseEnter = (e: MouseEvent) => {
            if (seat.status === 'unavailable') return
            if (!selectedSeats.includes(seat.id)) {
              seatElement.setAttribute('fill', '#fff')
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
            setTooltip({
              x,
              y,
              content: `Rând: ${seat.row}, Loc: ${parseInt(seat.number, 10)}`
            })
          }

          const handleMouseLeave = () => {
            if (seat.status === 'unavailable') return
            if (!selectedSeats.includes(seat.id)) {
              // Reset to original color
              seatElement.setAttribute('fill', (seat as any).fill || '#8525D9')
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
        logger.error('Error loading SVG', error)
      })
  }, [selectedSeats, onSeatClick, zoneId])

  if (!zoneId) return null

  return (
    <div className="w-full h-full overflow-hidden" style={{ position: 'relative' }}>
      <TransformWrapper
        ref={ref}
        minScale={1}
        maxScale={5}
        limitToBounds
        // centerOnInit и initialScale убраны
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
})

SeatMap.displayName = 'SeatMap'

export default SeatMap