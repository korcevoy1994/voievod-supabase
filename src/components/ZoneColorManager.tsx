'use client'

import { useState, useEffect } from 'react'
import { useZoneColors, useUpdateZoneColor } from '@/lib/hooks/useSupabaseData'

interface ZoneColorManagerProps {
  eventId: string
  onColorUpdate?: () => void
}

export default function ZoneColorManager({ eventId, onColorUpdate }: ZoneColorManagerProps) {
  const { zoneColors, detailedColors, loading, error } = useZoneColors()
  const { updateZoneColor, loading: updating } = useUpdateZoneColor()
  const [selectedZone, setSelectedZone] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('#8525D9')
  const [zoneName, setZoneName] = useState<string>('')

  const predefinedColors = [
    '#8525D9', // Purple
    '#22C55E', // Green
    '#EF4444', // Red
    '#3B82F6', // Blue
    '#F59E0B', // Yellow
    '#EC4899', // Pink
    '#10B981', // Emerald
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#84CC16', // Lime
  ]

  const handleUpdateColor = async () => {
    if (!selectedZone || !selectedColor) return

    try {
      await updateZoneColor(selectedZone, selectedColor, zoneName || undefined)
      onColorUpdate?.()
      // Сбросить форму
      setSelectedZone('')
      setSelectedColor('#8525D9')
      setZoneName('')
    } catch (error) {
      // Failed to update zone color
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
        <p className="text-red-400">Ошибка загрузки цветов зон: {error}</p>
      </div>
    )
  }

  const availableZones = Object.keys(zoneColors)

  return (
    <div className="p-4 bg-gray-800 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Управление цветами зон</h3>
      
      {/* Текущие цвета зон */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Текущие цвета зон:</h4>
        <div className="grid grid-cols-2 gap-2">
          {detailedColors.map((zoneColor) => (
            <div key={zoneColor.zone} className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
              <div 
                className="w-4 h-4 rounded border border-gray-500"
                style={{ backgroundColor: zoneColor.color }}
              ></div>
              <span className="text-sm text-gray-300">
                {zoneColor.name || zoneColor.zone}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Форма обновления цвета */}
      <div className="space-y-3 border-t border-gray-600 pt-4">
        <h4 className="text-sm font-medium text-gray-300">Изменить цвет зоны:</h4>
        
        {/* Выбор зоны */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Зона:</label>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          >
            <option value="">Выберите зону</option>
            {availableZones.map((zone) => (
              <option key={zone} value={zone}>
                {detailedColors.find(c => c.zone === zone)?.name || zone}
              </option>
            ))}
          </select>
        </div>

        {/* Название зоны (опционально) */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Название зоны (опционально):</label>
          <input
            type="text"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            placeholder="Введите название зоны"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
          />
        </div>

        {/* Выбор цвета */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Цвет:</label>
          <div className="grid grid-cols-5 gap-2 mb-2">
            {predefinedColors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded border-2 ${
                  selectedColor === color ? 'border-white' : 'border-gray-500'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="w-full h-8 bg-gray-700 border border-gray-600 rounded"
          />
        </div>

        {/* Кнопка обновления */}
        <button
          onClick={handleUpdateColor}
          disabled={!selectedZone || !selectedColor || updating}
          className="w-full p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
        >
          {updating ? 'Обновление...' : 'Обновить цвет зоны'}
        </button>
      </div>
    </div>
  )
}