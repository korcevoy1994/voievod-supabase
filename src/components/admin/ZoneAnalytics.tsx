'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Calendar, TrendingUp, Users, DollarSign, MapPin, Clock, Download, Filter } from 'lucide-react'

interface ZoneAnalytics {
  zone: string
  totalSeats: number
  availableSeats: number
  bookedSeats: number
  soldSeats: number
  blockedSeats: number
  revenue: number
  averagePrice: number
  occupancyRate: number
}

interface PeriodData {
  period: string
  orders: number
  revenue: number
  tickets: number
  zones: Record<string, { orders: number; revenue: number; tickets: number }>
}

interface TotalStats {
  totalSeats: number
  soldSeats: number
  bookedSeats: number
  revenue: number
  occupancyRate: number
}

interface ZoneAnalyticsData {
  zoneAnalytics: ZoneAnalytics[]
  periodData: PeriodData[]
  topZonesByRevenue: ZoneAnalytics[]
  topZonesByOccupancy: ZoneAnalytics[]
  totalStats: TotalStats
  period: string
  dateRange: { startDate: string | null; endDate: string | null }
}

interface ZoneDetails {
  zone: string
  stats: {
    totalSeats: number
    soldSeats: number
    bookedSeats: number
    availableSeats: number
    blockedSeats: number
    totalRevenue: number
    averagePrice: number
    priceRange: { min: number; max: number }
  }
  seats: Array<{
    id: string
    row: number
    number: number
    price: number
    status: string
    customerInfo?: { name: string; email: string }
    orderDate?: string
  }>
  salesHistory: Array<{
    id: string
    customer_first_name: string
    customer_last_name: string
    total_price: number
    created_at: string
    order_seats: Array<{
      seats: {
        row: number
        number: number
        price: number
      }
    }>
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function ZoneAnalytics() {
  const [data, setData] = useState<ZoneAnalyticsData | null>(null)
  const [zoneDetails, setZoneDetails] = useState<ZoneDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [period, setPeriod] = useState('day')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [eventId] = useState('550e8400-e29b-41d4-a716-446655440000')

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        eventId,
        period,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      })
      
      const response = await fetch(`/api/admin/zone-analytics?${params}`)
      if (!response.ok) throw new Error('Failed to fetch analytics')
      
      const result = await response.json()
      setData(result)
    } catch (error) {
      // Error fetching analytics
    } finally {
      setLoading(false)
    }
  }

  const fetchZoneDetails = async (zone: string) => {
    setDetailsLoading(true)
    try {
      const response = await fetch('/api/admin/zone-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone,
          eventId,
          ...(startDate && { startDate }),
          ...(endDate && { endDate })
        })
      })
      
      if (!response.ok) throw new Error('Failed to fetch zone details')
      
      const result = await response.json()
      setZoneDetails(result)
      setSelectedZone(zone)
    } catch (error) {
      // Error fetching zone details
    } finally {
      setDetailsLoading(false)
    }
  }

  const exportData = () => {
    if (!data) return
    
    const csvContent = [
      ['Зона', 'Всего мест', 'Продано', 'Забронировано', 'Доступно', 'Заблокировано', 'Выручка', 'Средняя цена', 'Заполняемость %'].join(','),
      ...data.zoneAnalytics.map(zone => [
        zone.zone,
        zone.totalSeats,
        zone.soldSeats,
        zone.bookedSeats,
        zone.availableSeats,
        zone.blockedSeats,
        zone.revenue,
        zone.averagePrice.toFixed(2),
        zone.occupancyRate.toFixed(1)
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    link.download = `zone-analytics-${dateStr}.csv`
    link.click()
  }

  useEffect(() => {
    fetchAnalytics()
  }, [period, startDate, endDate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Не удалось загрузить данные аналитики</p>
        <Button onClick={fetchAnalytics} className="mt-4">
          Попробовать снова
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры и настройки
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Период</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">По дням</SelectItem>
                  <SelectItem value="week">По неделям</SelectItem>
                  <SelectItem value="month">По месяцам</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Дата начала</label>
              <input
                type="date"
                value={startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Дата окончания</label>
              <input
                type="date"
                value={endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={exportData} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Всего мест</p>
                <p className="text-2xl font-bold">{data.totalStats.totalSeats}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Продано билетов</p>
                <p className="text-2xl font-bold">{data.totalStats.soldSeats}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Общая выручка</p>
                <p className="text-2xl font-bold">{data.totalStats.revenue.toLocaleString()} MDL</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Заполняемость</p>
                <p className="text-2xl font-bold">{data.totalStats.occupancyRate.toFixed(1)}%</p>
              </div>
              <MapPin className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button className="border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
              Статистика по зонам
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Статистика по зонам</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Детальная информация о продажах и заполняемости по зонам</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Выручка по зонам</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.zoneAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="zone" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} MDL`, 'Выручка']} />
                      <Bar dataKey="revenue" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Заполняемость по зонам</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.zoneAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="zone" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}%`, 'Заполняемость']} />
                      <Bar dataKey="occupancyRate" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-4">Детальная таблица</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-2 text-left">Зона</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Всего мест</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Продано</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Забронировано</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Выручка</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Заполняемость</th>
                        <th className="border border-gray-300 px-4 py-2 text-center">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.zoneAnalytics.map((zone) => (
                        <tr key={zone.zone} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-medium">{zone.zone}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{zone.totalSeats}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{zone.soldSeats}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{zone.bookedSeats}</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">{zone.revenue.toLocaleString()} MDL</td>
                          <td className="border border-gray-300 px-4 py-2 text-right">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              zone.occupancyRate > 80 ? 'bg-green-100 text-green-800' : 
                              zone.occupancyRate > 50 ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {zone.occupancyRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => fetchZoneDetails(zone.zone)}
                              disabled={detailsLoading}
                            >
                              Детали
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}