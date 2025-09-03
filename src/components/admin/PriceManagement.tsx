'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Edit, Save, X, Plus, TrendingUp, TrendingDown, DollarSign, Users, Percent } from 'lucide-react'

interface ZoneStats {
  total: number
  available: number
  sold: number
  reserved: number
  blocked: number
  revenue: number
}

interface ZonePricing {
  id: string
  zone: string
  price: number
  row_multipliers: Record<string, number>
  stats: ZoneStats
  created_at: string
  updated_at: string
}

interface PriceUpdate {
  zone: string
  price: number
  rowMultipliers?: Record<string, number>
}

interface Promotion {
  name: string
  description: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  zones: string[]
  startDate: string
  endDate: string
  isActive: boolean
}

const PriceManagement: React.FC = () => {
  const [zones, setZones] = useState<ZonePricing[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingZones, setEditingZones] = useState<Set<string>>(new Set())
  const [priceUpdates, setPriceUpdates] = useState<Record<string, PriceUpdate>>({})
  const [showPromotionForm, setShowPromotionForm] = useState(false)
  const [promotion, setPromotion] = useState<Promotion>({
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    zones: [],
    startDate: '',
    endDate: '',
    isActive: true
  })
  const [bulkDiscountType, setBulkDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [eventId] = useState('default-event-id') // В реальном приложении получать из контекста

  useEffect(() => {
    fetchZonePricing()
  }, [])

  const fetchZonePricing = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/pricing?eventId=${eventId}`)
      const data = await response.json()
      
      if (response.ok) {
        setZones(data.zones)
      } else {
        // Error fetching zones
      }
    } catch (error) {
      // Error fetching zones
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (zone: string, currentPrice: number) => {
    setEditingZones(prev => new Set([...prev, zone]))
    setPriceUpdates(prev => ({
      ...prev,
      [zone]: {
        zone,
        price: currentPrice
      }
    }))
  }

  const cancelEditing = (zone: string) => {
    setEditingZones(prev => {
      const newSet = new Set(prev)
      newSet.delete(zone)
      return newSet
    })
    setPriceUpdates(prev => {
      const newUpdates = { ...prev }
      delete newUpdates[zone]
      return newUpdates
    })
  }

  const updatePrice = (zone: string, price: number) => {
    setPriceUpdates(prev => ({
      ...prev,
      [zone]: {
        ...prev[zone],
        price
      }
    }))
  }

  const saveZonePrice = async (zone: string) => {
    const update = priceUpdates[zone]
    if (!update) return

    try {
      setSaving(true)
      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId,
          updates: [update]
        })
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        // Обновляем локальное состояние
        setZones(prev => prev.map(z => 
          z.zone === zone ? { ...z, price: update.price } : z
        ))
        cancelEditing(zone)
      } else {
        // Error saving price
      }
    } catch (error) {
      // Error saving price
    } finally {
      setSaving(false)
    }
  }

  const saveBulkPrices = async () => {
    const updates = Object.values(priceUpdates)
    if (updates.length === 0) return

    try {
      setSaving(true)
      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId,
          updates
        })
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        // Обновляем локальное состояние
        setZones(prev => prev.map(zone => {
          const update = priceUpdates[zone.zone]
          return update ? { ...zone, price: update.price } : zone
        }))
        setEditingZones(new Set())
        setPriceUpdates({})
      } else {
        // Error saving prices
      }
    } catch (error) {
      // Error saving prices
    } finally {
      setSaving(false)
    }
  }

  const applyBulkDiscount = (discountType: 'percentage' | 'fixed', discountValue: number) => {
    const newUpdates: Record<string, PriceUpdate> = {}
    
    zones.forEach(zone => {
      let newPrice: number
      if (discountType === 'percentage') {
        newPrice = zone.price * (1 - discountValue / 100)
      } else {
        newPrice = Math.max(0, zone.price - discountValue)
      }
      
      newUpdates[zone.zone] = {
        zone: zone.zone,
        price: Math.round(newPrice * 100) / 100
      }
      
      setEditingZones(prev => new Set([...prev, zone.zone]))
    })
    
    setPriceUpdates(newUpdates)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'MDL',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%'
    return `${Math.round((value / total) * 100)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Загрузка данных о ценах...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и действия */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Управление ценами</h2>
          <p className="text-gray-600">Массовое редактирование цен по зонам</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowPromotionForm(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать акцию
          </Button>
          {Object.keys(priceUpdates).length > 0 && (
            <Button
              onClick={saveBulkPrices}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Сохранить все ({Object.keys(priceUpdates).length})
            </Button>
          )}
        </div>
      </div>

      {/* Быстрые действия */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Тип скидки</label>
              <Select value={bulkDiscountType} onValueChange={(value: string) => setBulkDiscountType(value as 'percentage' | 'fixed')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Процент</SelectItem>
                  <SelectItem value="fixed">Фиксированная</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Значение</label>
              <input
                type="number"
                className="border rounded px-3 py-2 w-24"
                placeholder="10"
                id="bulk-discount-value"
              />
            </div>
            <Button
              onClick={() => {
                const valueInput = document.getElementById('bulk-discount-value') as HTMLInputElement
                const discountValue = parseFloat(valueInput?.value || '0')
                
                if (discountValue > 0) {
                  applyBulkDiscount(bulkDiscountType, discountValue)
                }
              }}
              variant="outline"
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Применить ко всем
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Таблица зон */}
      <div className="grid gap-4">
        {zones.map((zone) => {
          const isEditing = editingZones.has(zone.zone)
          const currentUpdate = priceUpdates[zone.zone]
          const displayPrice = currentUpdate ? currentUpdate.price : zone.price
          const occupancyRate = zone.stats.total > 0 ? (zone.stats.sold / zone.stats.total) * 100 : 0
          
          return (
            <Card key={zone.zone} className={isEditing ? 'ring-2 ring-blue-500' : ''}>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                  {/* Зона */}
                  <div>
                    <div className="font-semibold text-lg">Зона {zone.zone}</div>
                    <div className="text-sm text-gray-500">
                      {zone.stats.total} мест
                    </div>
                  </div>
                  
                  {/* Цена */}
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Цена</div>
                    {isEditing ? (
                      <input
                        type="number"
                        value={displayPrice}
                        onChange={(e) => updatePrice(zone.zone, parseFloat(e.target.value) || 0)}
                        className="border rounded px-2 py-1 w-24 text-lg font-semibold"
                        step="0.01"
                      />
                    ) : (
                      <div className="text-lg font-semibold">
                        {formatCurrency(displayPrice)}
                      </div>
                    )}
                  </div>
                  
                  {/* Статистика */}
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Заполняемость</div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold">
                        {formatPercentage(zone.stats.sold, zone.stats.total)}
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        occupancyRate > 80 ? 'bg-red-500' :
                        occupancyRate > 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                    </div>
                  </div>
                  
                  {/* Выручка */}
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Выручка</div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(zone.stats.revenue)}
                    </div>
                  </div>
                  
                  {/* Доступность */}
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Доступно</div>
                    <div className="text-lg font-semibold text-blue-600">
                      {zone.stats.available}
                    </div>
                  </div>
                  
                  {/* Действия */}
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          onClick={() => saveZonePrice(zone.zone)}
                          disabled={saving}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => cancelEditing(zone.zone)}
                          size="sm"
                          variant="outline"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => startEditing(zone.zone, zone.price)}
                        size="sm"
                        variant="outline"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default PriceManagement