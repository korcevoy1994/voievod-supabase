'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, Download, Eye, Edit, RefreshCw, Calendar, DollarSign, Users, TrendingUp, RotateCcw, Plus, LogOut, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserSSRClient } from '@/lib/supabase-ssr'
import AdminLogin from '@/components/AdminLogin'
import Dashboard from '@/components/admin/Dashboard'
import PriceManagement from '@/components/admin/PriceManagement'
import VenueMap from '@/components/admin/VenueMap'
import ZoneAnalytics from '@/components/admin/ZoneAnalytics'

interface OrderPayment {
  id: string
  amount: number
  payment_method: string
  payment_provider: string
  status: string
  provider_payment_id?: string
  provider_data?: any
  created_at: string
  updated_at: string
  completed_at?: string
}

interface OrderSeat {
  id: string
  seat_id: string
  seats: {
    id: string
    zone: string
    row: string
    number: string
    price: number
    status: string
  }
}

interface Order {
  id: string
  customer_first_name: string
  customer_last_name: string
  customer_email: string
  customer_phone?: string
  total_price: number
  total_tickets: number
  status: string
  payment_method?: string
  created_at: string
  updated_at: string
  order_payments: OrderPayment[]
  order_seats: OrderSeat[]
}

interface OrdersResponse {
  orders: Order[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  filters: any
}

interface Filters {
  status: string
  paymentStatus: string
  paymentMethod: string
  dateFrom: string
  dateTo: string
  search: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
  processing: 'bg-blue-100 text-blue-800'
}

const paymentStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800'
}

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'pricing' | 'venue' | 'analytics'>('dashboard')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  })
  const [filters, setFilters] = useState<Filters>({
    status: '',
    paymentStatus: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [isProcessingRefund, setIsProcessingRefund] = useState(false)
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [refundAmount, setRefundAmount] = useState('')

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
    pendingOrders: 0
  })

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())
      
      if (filters.status) params.append('status', filters.status)
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus)
      if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.search) params.append('search', filters.search)
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)

      const response = await fetch(`/api/admin/orders?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки заказов')
      }

      const data: OrdersResponse = await response.json()
      setOrders(data.orders)
      setPagination(data.pagination)
      
      // Подсчет статистики
      const totalRevenue = data.orders.reduce((sum, order) => {
        return sum + (order.status === 'paid' ? order.total_price : 0)
      }, 0)
      
      setStats({
        totalOrders: data.pagination.total,
        totalRevenue,
        completedOrders: data.orders.filter(o => o.status === 'paid').length,
        pendingOrders: data.orders.filter(o => o.status === 'pending').length
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId,
          status: newStatus
        })
      })

      if (!response.ok) {
        throw new Error('Ошибка обновления статуса')
      }

      // Обновляем локальное состояние
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ))
      
      setSelectedOrder(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка обновления')
    } finally {
      setIsUpdating(false)
    }
  }

  const processRefund = async () => {
    if (!selectedOrder || !refundReason.trim()) {
      alert('Пожалуйста, укажите причину возврата')
      return
    }

    if (refundType === 'partial') {
      const amount = parseFloat(refundAmount)
      if (!refundAmount.trim() || isNaN(amount) || amount <= 0) {
        alert('Пожалуйста, укажите корректную сумму возврата')
        return
      }
      if (amount > selectedOrder.total_price) {
        alert('Сумма возврата не может превышать общую стоимость заказа')
        return
      }
    }
    
    setIsProcessingRefund(true)
    try {
      const requestBody: any = {
        orderId: selectedOrder.id,
        reason: refundReason,
      }

      if (refundType === 'partial') {
        requestBody.refundAmount = parseFloat(refundAmount)
      }

      const response = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process refund')
      }

      // Обновляем локальное состояние
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === selectedOrder.id 
            ? { ...order, status: 'refunded' }
            : order
        )
      )

      alert(result.message || 'Возврат успешно обработан')
      setIsRefundModalOpen(false)
      setIsDetailsModalOpen(false)
      setSelectedOrder(null)
      setRefundReason('')
      setRefundAmount('')
      setRefundType('full')
      
      // Обновляем список заказов
      fetchOrders()
    } catch (error: any) {
      // Error processing refund
      alert(`Ошибка при обработке возврата: ${error.message}`)
    } finally {
      setIsProcessingRefund(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} MDL`
  }

  const getLatestPayment = (order: Order): OrderPayment | null => {
    if (!order.order_payments || order.order_payments.length === 0) return null
    return order.order_payments[0] // API уже сортирует по created_at desc
  }

  const downloadTicketsPDF = async (orderId: string) => {
    try {
      const response = await fetch(`/api/tickets/pdf?orderId=${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/zip',
        },
      })

      if (!response.ok) {
        throw new Error('Ошибка при загрузке билетов')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `bilete-${orderId}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      // Error downloading tickets
      alert('Ошибка при скачивании билетов')
    }
  }

  // Проверка аутентификации при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseBrowserSSRClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setIsAuthenticated(true)
      }
      setAuthLoading(false)
    }

    checkAuth()

    // Подписка на изменения аутентификации
    const supabase = getSupabaseBrowserSSRClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders()
    }
  }, [pagination.page, filters, isAuthenticated])

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Сброс на первую страницу
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const exportToCSV = () => {
    const csvContent = [
      ['ID заказа', 'Клиент', 'Email', 'Сумма', 'Статус', 'Статус платежа', 'Дата создания'].join(','),
      ...orders.map(order => {
        const payment = getLatestPayment(order)
        return [
          order.id,
          `${order.customer_first_name} ${order.customer_last_name}`,
          order.customer_email,
          order.total_price,
          order.status,
          payment?.status || 'Нет платежа',
          formatDate(order.created_at)
        ].join(',')
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserSSRClient()
    await supabase.auth.signOut()
    setIsAuthenticated(false)
  }



  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
    // Принудительно обновляем страницу для синхронизации с middleware
    window.location.reload()
  }

  // Показываем загрузку аутентификации
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Проверка аутентификации...</p>
        </div>
      </div>
    )
  }

  // Показываем форму входа для неаутентифицированных пользователей
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />
  }

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Загрузка заказов...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {activeTab === 'dashboard' ? 'Дашборд' : activeTab === 'pricing' ? 'Управление ценами' : activeTab === 'venue' ? 'Карта зала' : activeTab === 'analytics' ? 'Аналитика зон' : 'Админка заказов'}
              </h1>
              <p className="text-gray-600 mt-1">
                {activeTab === 'dashboard' ? 'Аналитика и статистика продаж' : activeTab === 'pricing' ? 'Настройка цен по зонам и массовое редактирование' : activeTab === 'venue' ? 'Визуальная карта зала с управлением статусами мест' : activeTab === 'analytics' ? 'Статистика продаж и отчеты по периодам' : 'Управление и отслеживание заказов'}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  // Кнопка Пригласительные нажата
                  router.push('/admin/invitations')
                }}
                className="inline-flex items-center px-4 py-2 bg-purple-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Пригласительные
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Фильтры
              </button>
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </button>
              <button
                onClick={fetchOrders}
                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </button>

              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Выйти
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="border-t border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="h-4 w-4 mr-2 inline" />
                Дашборд
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="h-4 w-4 mr-2 inline" />
                Заказы
              </button>
              <button
                onClick={() => setActiveTab('pricing')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'pricing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DollarSign className="h-4 w-4 mr-2 inline" />
                 Цены
               </button>
               <button
                 onClick={() => setActiveTab('venue')}
                 className={`py-4 px-1 border-b-2 font-medium text-sm ${
                   activeTab === 'venue'
                     ? 'border-blue-500 text-blue-600'
                     : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                 }`}
               >
                 <Users className="h-4 w-4 mr-2 inline" />
                 Карта зала
               </button>
               <button
                 onClick={() => setActiveTab('analytics')}
                 className={`py-4 px-1 border-b-2 font-medium text-sm ${
                   activeTab === 'analytics'
                     ? 'border-blue-500 text-blue-600'
                     : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                 }`}
               >
                 <TrendingUp className="h-4 w-4 mr-2 inline" />
                 Аналитика
               </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' ? (
          <Dashboard />
        ) : activeTab === 'pricing' ? (
           <PriceManagement />
         ) : activeTab === 'venue' ? (
           <VenueMap />
         ) : activeTab === 'analytics' ? (
           <ZoneAnalytics />
         ) : (
          <>
            {/* Stats Cards */}
            <div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Всего заказов</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Общая выручка</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Оплаченные</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completedOrders}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">В ожидании</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-lg shadow p-6 mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Email, имя, ID..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус заказа</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все статусы</option>
                  <option value="pending">В ожидании</option>
                  <option value="paid">Оплачен</option>
                  <option value="cancelled">Отменен</option>
                  <option value="refunded">Возврат</option>
                  <option value="processing">Обработка</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус платежа</label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все статусы</option>
                  <option value="pending">В ожидании</option>
                  <option value="completed">Завершен</option>
                  <option value="failed">Неудачный</option>
                  <option value="cancelled">Отменен</option>
                  <option value="processing">Обработка</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Способ оплаты</label>
                <select
                  value={filters.paymentMethod}
                  onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Все способы</option>
                  <option value="card">Карта</option>
                  <option value="invitation">Пригласительный</option>
                  <option value="refund">Возврат</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата от</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата до</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сортировка</label>
                <select
                  value={`${filters.sortBy}_${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('_')
                    handleFilterChange('sortBy', sortBy)
                    handleFilterChange('sortOrder', sortOrder as 'asc' | 'desc')
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created_at_desc">Дата создания (новые)</option>
                  <option value="created_at_asc">Дата создания (старые)</option>
                  <option value="total_price_desc">Сумма (больше)</option>
                  <option value="total_price_asc">Сумма (меньше)</option>
                  <option value="customer_last_name_asc">Фамилия (А-Я)</option>
                  <option value="customer_last_name_desc">Фамилия (Я-А)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Orders Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID заказа</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Клиент</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус заказа</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус платежа</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата создания</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => {
                  const latestPayment = getLatestPayment(order)
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer_first_name} {order.customer_last_name}
                          </div>
                          <div className="text-sm text-gray-500">{order.customer_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(order.total_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {latestPayment ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            paymentStatusColors[latestPayment.status as keyof typeof paymentStatusColors] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {latestPayment.status}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Нет платежа</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {order.status === 'paid' && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order)
                                setIsRefundModalOpen(true)
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Возврат платежа"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Предыдущая
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Следующая
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Показано <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> до{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    из <span className="font-medium">{pagination.total}</span> результатов
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Предыдущая
                    </button>
                    
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            pageNum === pagination.page
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Следующая
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Детали заказа</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID заказа</label>
                    <p className="text-sm text-gray-900">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Статус</label>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">В ожидании</option>
                      <option value="paid">Оплачен</option>
                      <option value="cancelled">Отменен</option>
                      <option value="refunded">Возврат</option>
                      <option value="processing">Обработка</option>
                    </select>
                  </div>
                </div>
                
                {selectedOrder.status === 'paid' && (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => downloadTicketsPDF(selectedOrder.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Скачать билеты PDF
                    </button>
                    <button
                      onClick={() => {
                        setIsDetailsModalOpen(false)
                        setIsRefundModalOpen(true)
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Возврат
                    </button>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Клиент</label>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.customer_first_name} {selectedOrder.customer_last_name}
                    </p>
                    <p className="text-sm text-gray-500">{selectedOrder.customer_email}</p>
                    {selectedOrder.customer_phone && (
                      <p className="text-sm text-gray-500">{selectedOrder.customer_phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Сумма и билеты</label>
                    <p className="text-sm text-gray-900">{formatCurrency(selectedOrder.total_price)}</p>
                    <p className="text-sm text-gray-500">{selectedOrder.total_tickets} билетов</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Купленные места</label>
                  {selectedOrder.order_seats && selectedOrder.order_seats.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                      {selectedOrder.order_seats.map((orderSeat) => (
                        <div key={orderSeat.id} className="border rounded-lg p-3 bg-blue-50">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">
                                Зона {orderSeat.seats.zone}, Ряд {orderSeat.seats.row}, Место {orderSeat.seats.number}
                              </p>
                              <p className="text-xs text-gray-600">
                                {formatCurrency(orderSeat.seats.price)}
                              </p>
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              orderSeat.seats.status === 'sold' ? 'bg-green-100 text-green-800' : 
                              orderSeat.seats.status === 'available' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {orderSeat.seats.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-4">Нет информации о местах</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">История платежей</label>
                  {selectedOrder.order_payments && selectedOrder.order_payments.length > 0 ? (
                    <div className="space-y-2">
                      {selectedOrder.order_payments.map((payment) => (
                        <div key={payment.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium">
                                {formatCurrency(payment.amount)} - {payment.payment_provider}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(payment.created_at)}
                              </p>
                              {payment.provider_payment_id && (
                                <p className="text-xs text-gray-500">
                                  ID: {payment.provider_payment_id}
                                </p>
                              )}
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              paymentStatusColors[payment.status as keyof typeof paymentStatusColors] || 'bg-gray-100 text-gray-800'
                            }`}>
                              {payment.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Нет платежей</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {isRefundModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Возврат платежа</h3>
                <button
                  onClick={() => {
                    setIsRefundModalOpen(false)
                    setRefundReason('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Заказ: {selectedOrder.id}</p>
                  <p className="text-sm text-gray-600">Сумма: {formatCurrency(selectedOrder.total_price)}</p>
                  <p className="text-sm text-gray-600">Клиент: {selectedOrder.customer_first_name} {selectedOrder.customer_last_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип возврата
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="full"
                        checked={refundType === 'full'}
                        onChange={(e) => setRefundType(e.target.value as 'full' | 'partial')}
                        className="mr-2"
                      />
                      Полный возврат ({selectedOrder?.total_price} лей)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="partial"
                        checked={refundType === 'partial'}
                        onChange={(e) => setRefundType(e.target.value as 'full' | 'partial')}
                        className="mr-2"
                      />
                      Частичный возврат
                    </label>
                  </div>
                </div>

                {refundType === 'partial' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Сумма возврата (лей)
                    </label>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Введите сумму возврата"
                      min="0"
                      max={selectedOrder?.total_price}
                      step="0.01"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Причина возврата</label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Укажите причину возврата..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setIsRefundModalOpen(false)
                      setRefundReason('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={processRefund}
                    disabled={isProcessingRefund}
                    className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isProcessingRefund ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        Подтвердить возврат
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
          </>
        )}
      </div>
    </div>
  )
}