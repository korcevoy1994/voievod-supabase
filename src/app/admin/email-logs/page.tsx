'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Search, Mail, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface EmailLog {
  id: string
  order_id: string
  recipient_email: string
  email_type: string
  status: 'pending' | 'sent' | 'failed'
  error_message?: string
  smtp_response?: any
  sent_at?: string
  created_at: string
  updated_at: string
}

interface EmailLogsResponse {
  success: boolean
  data: EmailLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  statistics: {
    total: number
    sent: number
    failed: number
    pending: number
  }
}

export default function EmailLogsPage() {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [resending, setResending] = useState<string | null>(null)
  const [isSendingEmailToAll, setIsSendingEmailToAll] = useState(false)
  const [statistics, setStatistics] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  
  // Фильтры
  const [filters, setFilters] = useState({
    orderId: '',
    status: '',
    email: '',
    dateFrom: '',
    dateTo: ''
  })

  const fetchEmailLogs = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })
      
      const response = await fetch(`/api/admin/email-logs?${params}`)
      const data: EmailLogsResponse = await response.json()
      
      if (data.success) {
        setEmailLogs(data.data)
        setStatistics(data.statistics)
        setPagination(data.pagination)
      } else {
        alert('Ошибка загрузки логов email')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      alert('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async (orderId: string) => {
    try {
      setResending(orderId)
      const response = await fetch('/api/admin/email-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Email успешно отправлен повторно')
        fetchEmailLogs(pagination.page)
      } else {
        alert(data.error || 'Ошибка повторной отправки')
      }
    } catch (error) {
      console.error('Ошибка:', error)
      alert('Ошибка повторной отправки')
    } finally {
      setResending(null)
    }
  }

  const sendEmailToAllPaidUsers = async () => {
    setIsSendingEmailToAll(true)
    try {
      const response = await fetch('/api/tickets/email-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка при массовой отправке email')
      }

      alert(`Email с билетами успешно отправлены всем пользователям! Отправлено: ${result.sent} писем`)
      fetchEmailLogs() // Обновляем список логов
    } catch (error) {
      alert(`Ошибка при массовой отправке email: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setIsSendingEmailToAll(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
    const statusClasses = {
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    }
    
    return (
      <span className={`${baseClasses} ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
        {getStatusIcon(status)}
        <span className="ml-1">
          {status === 'sent' ? 'Отправлено' : 
           status === 'failed' ? 'Ошибка' : 
           status === 'pending' ? 'В ожидании' : status}
        </span>
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU')
  }

  useEffect(() => {
    fetchEmailLogs()
  }, [])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    fetchEmailLogs(1)
  }

  const clearFilters = () => {
    setFilters({
      orderId: '',
      status: '',
      email: '',
      dateFrom: '',
      dateTo: ''
    })
    setTimeout(() => fetchEmailLogs(1), 100)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Логи отправки Email</h1>
        <div className="flex space-x-3">
          <button 
            onClick={sendEmailToAllPaidUsers}
            disabled={isSendingEmailToAll || loading}
            className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Mail className={`h-4 w-4 mr-2 ${isSendingEmailToAll ? 'animate-pulse' : ''}`} />
            {isSendingEmailToAll ? 'Отправляем...' : 'Отправить всем'}
          </button>
          <button 
            onClick={() => fetchEmailLogs(pagination.page)} 
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Mail className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Всего</dt>
                  <dd className="text-lg font-medium text-gray-900">{statistics.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Отправлено</dt>
                  <dd className="text-lg font-medium text-green-600">{statistics.sent}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ошибки</dt>
                  <dd className="text-lg font-medium text-red-600">{statistics.failed}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">В ожидании</dt>
                  <dd className="text-lg font-medium text-yellow-600">{statistics.pending}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Фильтры</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <input
              type="text"
              placeholder="ID заказа"
              value={filters.orderId}
              onChange={(e) => handleFilterChange('orderId', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            
            <input
              type="text"
              placeholder="Email"
              value={filters.email}
              onChange={(e) => handleFilterChange('email', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Все статусы</option>
              <option value="sent">Отправлено</option>
              <option value="failed">Ошибка</option>
              <option value="pending">В ожидании</option>
            </select>
            
            <input
              type="date"
              placeholder="Дата от"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            
            <input
              type="date"
              placeholder="Дата до"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            
            <div className="flex gap-2">
              <button 
                onClick={applyFilters}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Search className="h-4 w-4 mr-2" />
                Поиск
              </button>
              <button 
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Сброс
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица логов */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Логи отправки ({pagination.total})</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата создания</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID заказа</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата отправки</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ошибка</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {emailLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(log.created_at)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{log.order_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.recipient_email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.email_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(log.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.sent_at ? formatDate(log.sent_at) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          {log.error_message ? (
                            <span className="text-red-600 truncate block" title={log.error_message}>
                              {log.error_message}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {(log.status === 'failed' || log.status === 'pending') && (
                            <button
                              onClick={() => handleResendEmail(log.order_id)}
                              disabled={resending === log.order_id}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                              {resending === log.order_id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                              <span className="ml-1">Повторить</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Пагинация */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-500">
                    Страница {pagination.page} из {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchEmailLogs(pagination.page - 1)}
                      disabled={pagination.page <= 1 || loading}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      Предыдущая
                    </button>
                    <button
                      onClick={() => fetchEmailLogs(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages || loading}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      Следующая
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}