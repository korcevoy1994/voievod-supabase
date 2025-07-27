'use client'

import React, { useState } from 'react'
import SeatMapSupabase from '@/components/SeatMapSupabase'
import ZoneSelector from '@/components/ZoneSelector'
import ZoneColorManager from '@/components/ZoneColorManager'
import ZonePriceManager from '@/components/ZonePriceManager'

const zones = [
  { id: '201', name: 'Зона 201' },
  { id: '202', name: 'Зона 202' },
  { id: '203', name: 'Зона 203' },
  { id: '204', name: 'Зона 204' },
  { id: '205', name: 'Зона 205' },
  { id: '206', name: 'Зона 206' },
  { id: '207', name: 'Зона 207' },
  { id: '208', name: 'Зона 208' },
  { id: '209', name: 'Зона 209' },
  { id: '210', name: 'Зона 210' },
  { id: '211', name: 'Зона 211' },
  { id: '212', name: 'Зона 212' },
  { id: '213', name: 'Зона 213' }
]

export default function TestSupabasePage() {
  const [selectedZone, setSelectedZone] = useState<string>('201')
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSeatClick = (seatId: string) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatId)) {
        return prev.filter(id => id !== seatId)
      } else {
        return [...prev, seatId]
      }
    })
  }

  const handleZoneChange = (zoneId: string) => {
    setSelectedZone(zoneId)
    setSelectedSeats([]) // Очищаем выбранные места при смене зоны
  }

  const handleDataUpdate = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Тест загрузки данных из Supabase
        </h1>
        
        {/* Управление зонами */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ZoneColorManager 
            eventId="550e8400-e29b-41d4-a716-446655440000"
            onColorUpdate={handleDataUpdate}
          />
          <ZonePriceManager 
            eventId="550e8400-e29b-41d4-a716-446655440000"
            onPriceUpdate={handleDataUpdate}
          />
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Выберите зону:</h2>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {zones.map(zone => (
              <button
                key={zone.id}
                onClick={() => handleZoneChange(zone.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedZone === zone.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {zone.id}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">
            Зона {selectedZone}
          </h2>
          <p className="text-gray-400 mb-4">
            Выбрано мест: {selectedSeats.length}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4" style={{ height: '600px' }}>
          <SeatMapSupabase
            key={`${selectedZone}-${refreshKey}`}
            zoneId={selectedZone}
            selectedSeats={selectedSeats}
            onSeatClick={handleSeatClick}
            eventId="550e8400-e29b-41d4-a716-446655440000"
            price={100}
          />
        </div>

        {selectedSeats.length > 0 && (
          <div className="mt-6 bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Выбранные места:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {selectedSeats.map(seatId => (
                <div key={seatId} className="bg-blue-600 text-white px-3 py-2 rounded text-center">
                  {seatId}
                </div>
              ))}
            </div>
            <div className="mt-4 text-right">
              <p className="text-xl font-bold">
                Итого: {selectedSeats.length * 100}₽
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}