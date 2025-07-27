'use client'

import { useState, useEffect } from 'react'
import { useEventPricing } from '@/lib/hooks/useSupabaseData'

interface ZonePricing {
  zone: string
  base_price: number
  row_multipliers?: Record<string, number>
}

interface ZonePriceManagerProps {
  eventId: string
  onPriceUpdate?: () => void
}

export default function ZonePriceManager({ eventId, onPriceUpdate }: ZonePriceManagerProps) {
  const { zonePrices, detailedPricing, loading, error } = useEventPricing(eventId)
  const [selectedZone, setSelectedZone] = useState<string>('')
  const [basePrice, setBasePrice] = useState<number>(0)
  const [rowMultipliers, setRowMultipliers] = useState<Record<string, number>>({})
  const [updating, setUpdating] = useState(false)

  const handleUpdatePricing = async () => {
    if (!selectedZone || basePrice <= 0) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/events/${eventId}/pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zone: selectedZone,
          base_price: basePrice,
          row_multipliers: rowMultipliers,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update pricing')
      }

      // Обновление произойдет автоматически при следующем рендере
      onPriceUpdate?.()
      
      // Сбросить форму
      setSelectedZone('')
      setBasePrice(0)
      setRowMultipliers({})
    } catch (error) {
      console.error('Failed to update pricing:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleRowMultiplierChange = (row: string, multiplier: string) => {
    const value = parseFloat(multiplier)
    if (isNaN(value)) {
      const { [row]: removed, ...rest } = rowMultipliers
      setRowMultipliers(rest)
    } else {
      setRowMultipliers(prev => ({ ...prev, [row]: value }))
    }
  }

  const addRowMultiplier = () => {
    const newRow = prompt('Введите номер ряда:')
    if (newRow && !rowMultipliers[newRow]) {
      setRowMultipliers(prev => ({ ...prev, [newRow]: 1.0 }))
    }
  }

  if (loading) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-600 rounded"></div>
            <div className="h-8 bg-gray-600 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
        <p className="text-red-400">Ошибка загрузки цен: {error}</p>
      </div>
    )
  }

  const availableZones = detailedPricing?.map((p: ZonePricing) => p.zone) || []
  const selectedZonePricing = detailedPricing?.find((p: ZonePricing) => p.zone === selectedZone)

  return (
    <div className="p-4 bg-gray-800 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Управление ценами зон</h3>
      
      {/* Текущие цены зон */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Текущие цены зон:</h4>
        <div className="space-y-2">
          {detailedPricing?.map((zonePricing: ZonePricing) => (
            <div key={zonePricing.zone} className="p-3 bg-gray-700 rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium">Зона {zonePricing.zone}</span>
                <span className="text-green-400 font-bold">{zonePricing.base_price}₽</span>
              </div>
              {zonePricing.row_multipliers && Object.keys(zonePricing.row_multipliers).length > 0 && (
                <div className="text-xs text-gray-400">
                  <span>Множители рядов: </span>
                  {Object.entries(zonePricing.row_multipliers).map(([row, multiplier]) => (
                    <span key={row} className="mr-2">
                      Ряд {row}: ×{multiplier}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Форма обновления цены */}
      <div className="space-y-3 border-t border-gray-600 pt-4">
        <h4 className="text-sm font-medium text-gray-300">Изменить цену зоны:</h4>
        
        {/* Выбор зоны */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Зона:</label>
          <select
            value={selectedZone}
            onChange={(e) => {
              setSelectedZone(e.target.value)
              const zonePricing = detailedPricing?.find((p: ZonePricing) => p.zone === e.target.value)
              if (zonePricing) {
                setBasePrice(zonePricing.base_price)
                setRowMultipliers(zonePricing.row_multipliers || {})
              } else {
                setBasePrice(0)
                setRowMultipliers({})
              }
            }}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          >
            <option value="">Выберите зону</option>
            {availableZones.map((zone: string) => (
              <option key={zone} value={zone}>
                Зона {zone}
              </option>
            ))}
          </select>
        </div>

        {/* Базовая цена */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Базовая цена (₽):</label>
          <input
            type="number"
            value={basePrice || ''}
            onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
            placeholder="Введите базовую цену"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            min="0"
            step="0.01"
          />
        </div>

        {/* Множители рядов */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs text-gray-400">Множители рядов:</label>
            <button
              onClick={addRowMultiplier}
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
            >
              + Добавить ряд
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(rowMultipliers).map(([row, multiplier]) => (
              <div key={row} className="flex items-center space-x-2">
                <span className="text-xs text-gray-400 w-16">Ряд {row}:</span>
                <input
                  type="number"
                  value={multiplier}
                  onChange={(e) => handleRowMultiplierChange(row, e.target.value)}
                  className="flex-1 p-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                  min="0"
                  step="0.1"
                />
                <button
                  onClick={() => {
                    const { [row]: removed, ...rest } = rowMultipliers
                    setRowMultipliers(rest)
                  }}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопка обновления */}
        <button
          onClick={handleUpdatePricing}
          disabled={!selectedZone || basePrice <= 0 || updating}
          className="w-full p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
        >
          {updating ? 'Обновление...' : 'Обновить цену зоны'}
        </button>
      </div>
    </div>
  )
}