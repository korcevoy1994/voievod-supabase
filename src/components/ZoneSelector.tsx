'use client'

import React from 'react'
import { useZones } from '@/lib/hooks/useSupabaseData'

interface ZoneSelectorProps {
  selectedZone: string | null
  onZoneSelect: (zoneId: string) => void
  eventId?: string
}

const ZoneSelector: React.FC<ZoneSelectorProps> = ({
  selectedZone,
  onZoneSelect,
  eventId = 'voevoda'
}) => {
  const { zones, loading, error } = useZones()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-white text-sm">Se încarcă zonele...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-red-400 text-sm">Eroare: {error}</div>
      </div>
    )
  }

  if (!zones || zones.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-gray-400 text-sm">Nu s-au găsit zone</div>
      </div>
    )
  }

  return (
    <div className="bg-black/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
      <h3 className="text-white font-medium mb-3 text-sm">Selectați zona</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {zones.map((zone) => {
          const isSelected = selectedZone === zone.zone_id
          
          return (
            <button
              key={zone.zone_id}
              onClick={() => onZoneSelect(zone.zone_id)}
              className={`
                px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                border-2 hover:scale-105 active:scale-95
                ${
                  isSelected
                    ? 'bg-white text-black border-white shadow-lg'
                    : 'bg-transparent text-white border-gray-600 hover:border-white hover:bg-white/10'
                }
              `}
              style={{
                backgroundColor: isSelected ? '#ffffff' : 'transparent',
                borderColor: isSelected ? '#ffffff' : '#6b7280',
                color: isSelected ? '#000000' : '#ffffff'
              }}
            >
              <div className="flex flex-col items-center">
                <span className="font-bold">{zone.zone_id}</span>
                <span className="text-xs opacity-80 mt-1">
                  {zone.rows?.length || 0} рядов
                </span>
              </div>
            </button>
          )
        })}
      </div>
      
      {selectedZone && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-400">
            Выбрана зона: <span className="text-white font-medium">{selectedZone}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ZoneSelector