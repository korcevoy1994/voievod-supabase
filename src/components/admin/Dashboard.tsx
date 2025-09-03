'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, TrendingUpIcon, TrendingDownIcon, UsersIcon, CreditCardIcon, TicketIcon, DollarSignIcon } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalTicketsSold: number
  conversionRate: number
  revenueGrowth: number
  ordersGrowth: number
  averageOrderValue: number
  topZones: Array<{
    zone: string
    revenue: number
    ticketsSold: number
    occupancyRate: number
  }>
  salesByPeriod: Array<{
    date: string
    revenue: number
    orders: number
    tickets: number
  }>
  paymentMethodStats: Array<{
    method: string
    count: number
    revenue: number
    percentage: number
  }>
  orderStatusStats: Array<{
    status: string
    count: number
    percentage: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'MDL',
    minimumFractionDigits: 0,
  }).format(amount)
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('ru-RU').format(num)
}

const formatPercentage = (num: number) => {
  return `${num.toFixed(1)}%`
}

const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  growth, 
  format = 'number' 
}: { 
  title: string
  value: number
  icon: React.ElementType
  growth?: number
  format?: 'number' | 'currency' | 'percentage'
}) => {
  const formatValue = () => {
    switch (format) {
      case 'currency': return formatCurrency(value)
      case 'percentage': return formatPercentage(value)
      default: return formatNumber(value)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue()}</div>
        {growth !== undefined && (
          <div className="flex items-center text-xs text-gray-600 mt-1">
            {growth >= 0 ? (
              <TrendingUpIcon className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <TrendingDownIcon className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={growth >= 0 ? 'text-green-500' : 'text-red-500'}>
              {formatPercentage(Math.abs(growth))}
            </span>
            <span className="ml-1">за период</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/admin/dashboard?period=${period}`)
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки статистики')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [period])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchStats} variant="outline">
          Попробовать снова
        </Button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Нет данных для отображения</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Дашборд</h1>
          <p className="text-gray-600 mt-1">Аналитика продаж и ключевые метрики</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-gray-400" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 дней</SelectItem>
              <SelectItem value="30d">30 дней</SelectItem>
              <SelectItem value="90d">90 дней</SelectItem>
              <SelectItem value="1y">1 год</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Общая выручка"
          value={stats.totalRevenue}
          icon={DollarSignIcon}
          growth={stats.revenueGrowth}
          format="currency"
        />
        <MetricCard
          title="Количество заказов"
          value={stats.totalOrders}
          icon={CreditCardIcon}
          growth={stats.ordersGrowth}
        />
        <MetricCard
          title="Продано билетов"
          value={stats.totalTicketsSold}
          icon={TicketIcon}
        />
        <MetricCard
          title="Конверсия"
          value={stats.conversionRate}
          icon={UsersIcon}
          format="percentage"
        />
      </div>

      {/* Дополнительные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Средний чек</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.averageOrderValue)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Статусы заказов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.orderStatusStats.slice(0, 3).map((status, index) => (
                <div key={status.status} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{status.status}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{status.count}</span>
                    <span className="text-xs text-gray-500">
                      ({formatPercentage(status.percentage)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Способы оплаты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.paymentMethodStats.slice(0, 3).map((method, index) => (
                <div key={method.method} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{method.method}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{method.count}</span>
                    <span className="text-xs text-gray-500">
                      ({formatPercentage(method.percentage)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* График продаж по времени */}
        <Card>
          <CardHeader>
            <CardTitle>Динамика продаж</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.salesByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value: any) => new Date(value).toLocaleDateString('ru-RU')}
                    formatter={(value: any, name: any) => {
                      if (name === 'revenue') return [formatCurrency(value), 'Выручка']
                      if (name === 'orders') return [formatNumber(value), 'Заказы']
                      if (name === 'tickets') return [formatNumber(value), 'Билеты']
                      return [value, name]
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#0088FE" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Топ зоны по выручке */}
        <Card>
          <CardHeader>
            <CardTitle>Топ зоны по выручке</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topZones.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="zone" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any, name: any) => {
                      if (name === 'revenue') return [formatCurrency(value), 'Выручка']
                      if (name === 'ticketsSold') return [formatNumber(value), 'Билеты']
                      if (name === 'occupancyRate') return [formatPercentage(value), 'Заполняемость']
                      return [value, name]
                    }}
                  />
                  <Bar dataKey="revenue" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Детальная статистика по зонам */}
      <Card>
        <CardHeader>
          <CardTitle>Статистика по зонам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Зона</th>
                  <th className="text-right py-2">Выручка</th>
                  <th className="text-right py-2">Билеты</th>
                  <th className="text-right py-2">Заполняемость</th>
                </tr>
              </thead>
              <tbody>
                {stats.topZones.map((zone, index) => (
                  <tr key={zone.zone} className="border-b">
                    <td className="py-2 font-medium">{zone.zone}</td>
                    <td className="text-right py-2">{formatCurrency(zone.revenue)}</td>
                    <td className="text-right py-2">{formatNumber(zone.ticketsSold)}</td>
                    <td className="text-right py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        zone.occupancyRate >= 80 ? 'bg-green-100 text-green-800' :
                        zone.occupancyRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {formatPercentage(zone.occupancyRate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}