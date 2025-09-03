'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, ZoomIn, ZoomOut, RotateCcw, Filter, Eye, EyeOff } from 'lucide-react'

interface SeatData {
  id: string
  row: string
  number: string
  price: number
  x: number
  y: number
  status: 'available' | 'booked' | 'sold' | 'blocked'
}

interface ZoneData {
  zone: string
  seats: SeatData[]
  stats: {
    total: number
    available: number
    booked: number
    sold: number
    blocked: number
  }
}

interface VenueMapData {
  venueMap: Record<string, ZoneData>
  totalStats: {
    total: number
    available: number
    booked: number
    sold: number
    blocked: number
  }
  zones: string[]
}

const statusColors = {
  available: '#22c55e', // green
  booked: '#f59e0b',    // amber
  sold: '#ef4444',      // red
  blocked: '#6b7280'    // gray
}

const statusLabels = {
  available: 'Доступно',
  booked: 'Забронировано',
  sold: 'Продано',
  blocked: 'Заблокировано'
}

export default function VenueMap() {
  const [venueData, setVenueData] = useState<VenueMapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [hiddenZones, setHiddenZones] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(1)
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<string>('')

  const fetchVenueData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/venue-map')
      if (!response.ok) {
        throw new Error('Failed to fetch venue data')
      }
      const data = await response.json()
      setVenueData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVenueData()
  }, [])

  const handleSeatClick = useCallback((seatId: string) => {
    setSelectedSeats(prev => {
      const newSet = new Set(prev)
      if (newSet.has(seatId)) {
        newSet.delete(seatId)
      } else {
        newSet.add(seatId)
      }
      return newSet
    })
  }, [])

  const handleBulkAction = useCallback(async () => {
    if (!bulkAction || selectedSeats.size === 0) return

    try {
      const response = await fetch('/api/admin/venue-map', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          seatIds: Array.from(selectedSeats),
          status: bulkAction
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update seats')
      }

      // Обновляем данные
      await fetchVenueData()
      setSelectedSeats(new Set())
      setBulkAction('')
    } catch (err) {
      // Error updating seats
    }
  }, [bulkAction, selectedSeats, fetchVenueData])

  const toggleZoneVisibility = useCallback((zone: string) => {
    setHiddenZones(prev => {
      const newSet = new Set(prev)
      if (newSet.has(zone)) {
        newSet.delete(zone)
      } else {
        newSet.add(zone)
      }
      return newSet
    })
  }, [])

  const getFilteredSeats = useCallback(() => {
    if (!venueData) return []

    let seats: SeatData[] = []
    
    // Фильтр по зоне
    const zonesToShow = selectedZone === 'all' 
      ? venueData.zones 
      : [selectedZone]

    zonesToShow.forEach(zone => {
      if (!hiddenZones.has(zone) && venueData.venueMap[zone]) {
        seats = seats.concat(venueData.venueMap[zone].seats)
      }
    })

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      seats = seats.filter(seat => seat.status === statusFilter)
    }

    return seats
  }, [venueData, selectedZone, statusFilter, hiddenZones])

  const renderSeat = useCallback((seat: SeatData) => {
    const isSelected = selectedSeats.has(seat.id)
    const color = statusColors[seat.status]
    
    return (
      <circle
        key={seat.id}
        cx={seat.x * zoom}
        cy={seat.y * zoom}
        r={8 * zoom}
        fill={isSelected ? '#3b82f6' : color}
        stroke={isSelected ? '#1d4ed8' : '#000'}
        strokeWidth={isSelected ? 2 : 0.5}
        className="cursor-pointer transition-all duration-200 hover:stroke-2"
        onClick={() => handleSeatClick(seat.id)}
        data-title={`${seat.row}-${seat.number} (${statusLabels[seat.status]})`}
      />
    )
  }, [zoom, selectedSeats, handleSeatClick])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка карты зала...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600">Ошибка: {error}</div>
          <Button onClick={fetchVenueData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Повторить
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!venueData) return null

  const filteredSeats = getFilteredSeats()

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{venueData.totalStats.total}</div>
            <div className="text-sm text-gray-600">Всего мест</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{venueData.totalStats.available}</div>
            <div className="text-sm text-gray-600">Доступно</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{venueData.totalStats.booked}</div>
            <div className="text-sm text-gray-600">Забронировано</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{venueData.totalStats.sold}</div>
            <div className="text-sm text-gray-600">Продано</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{venueData.totalStats.blocked}</div>
            <div className="text-sm text-gray-600">Заблокировано</div>
          </CardContent>
        </Card>
      </div>

      {/* Управление */}
      <Card>
        <CardHeader>
          <CardTitle>Управление картой зала</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            {/* Фильтры */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все зоны</SelectItem>
                  {venueData.zones.map(zone => (
                    <SelectItem key={zone} value={zone}>Зона {zone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="available">Доступно</SelectItem>
                <SelectItem value="booked">Забронировано</SelectItem>
                <SelectItem value="sold">Продано</SelectItem>
                <SelectItem value="blocked">Заблокировано</SelectItem>
              </SelectContent>
            </Select>

            {/* Управление масштабом */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(1)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={fetchVenueData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>

          {/* Управление зонами */}
          <div className="flex flex-wrap gap-2 mb-4">
            {venueData.zones.map(zone => (
              <Button
                key={zone}
                variant={hiddenZones.has(zone) ? "outline" : "default"}
                size="sm"
                onClick={() => toggleZoneVisibility(zone)}
              >
                {hiddenZones.has(zone) ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                Зона {zone}
              </Button>
            ))}
          </div>

          {/* Массовые действия */}
          {selectedSeats.size > 0 && (
            <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">
                Выбрано мест: {selectedSeats.size}
              </span>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Действие" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Сделать доступными</SelectItem>
                  <SelectItem value="blocked">Заблокировать</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleBulkAction} disabled={!bulkAction}>
                Применить
              </Button>
              <Button variant="outline" onClick={() => setSelectedSeats(new Set())}>
                Отменить выбор
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Карта зала */}
      <Card>
        <CardHeader>
          <CardTitle>Карта зала</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-auto" style={{ height: '600px' }}>
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${800 * zoom} ${600 * zoom}`}
              className="bg-gray-50"
            >
              {filteredSeats.map(renderSeat)}
              
              {/* Легенда */}
              <g transform={`translate(${20 * zoom}, ${20 * zoom})`}>
                <rect width={200 * zoom} height={120 * zoom} fill="white" stroke="#ccc" strokeWidth="1" rx="5" />
                <text x={10 * zoom} y={20 * zoom} fontSize={12 * zoom} fontWeight="bold">Легенда:</text>
                {Object.entries(statusColors).map(([status, color], index) => (
                  <g key={status} transform={`translate(${10 * zoom}, ${(35 + index * 20) * zoom})`}>
                    <circle cx={8 * zoom} cy={0} r={6 * zoom} fill={color} />
                    <text x={20 * zoom} y={4 * zoom} fontSize={10 * zoom}>
                      {statusLabels[status as keyof typeof statusLabels]}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}