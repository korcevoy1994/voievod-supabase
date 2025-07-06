'use client'
import React, { forwardRef } from 'react'
import Tooltip from './Tooltip'
import { cn } from '@/lib/utils'

export type SeatStatus = 'available' | 'selected' | 'unavailable'

interface SeatProps {
  id: string
  x: number
  y: number
  status: SeatStatus
  onClick: (id: string) => void
  tooltipContent: React.ReactNode
  ref?: React.Ref<HTMLDivElement>
}

const seatStyles: Record<SeatStatus, string> = {
  available: 'bg-gray-200 border-gray-300 hover:bg-gray-300',
  unavailable: 'bg-gray-500 border-gray-600 cursor-not-allowed',
  selected: 'bg-white border-gray-400',
}

const seatLabelStyles: Record<SeatStatus, string> = {
  available: 'bg-gray-400 border-gray-500 hover:bg-white hover:border-gray-400',
  selected: 'bg-white border-gray-400',
  unavailable: 'bg-gray-300 border-gray-400 cursor-not-allowed',
}

export const Seat = forwardRef<HTMLDivElement, SeatProps>(({ 
  id, 
  x, 
  y, 
  status, 
  onClick, 
  tooltipContent 
}, ref) => {
  const isClickable = status === 'available' || status === 'selected'

  return (
    <Tooltip
      content={tooltipContent}
      placement="top"
    >
      <div
        ref={ref}
        onClick={() => isClickable && onClick(id)}
        style={{
          position: 'absolute',
          top: `${y}%`,
          left: `${x}%`,
          transform: 'translate(-50%, -50%)',
        }}
        className={cn(
          'w-2 h-2 md:w-4 md:h-4 rounded-full cursor-pointer transition-all duration-200 border-2',
          seatStyles[status]
        )}
        aria-label={`Seat ${id}, status: ${status}`}
      />
    </Tooltip>
  )
}) 