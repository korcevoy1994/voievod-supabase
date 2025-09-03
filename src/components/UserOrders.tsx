'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getCurrentSessionUserId } from '@/lib/userSession'
import { SecureSessionManager } from '@/lib/secureSessionManager'

interface OrderSeat {
  id: string // Теперь короткий 8-символьный ID
  seat_id: string
  zone: string
  row: string
  number: string
  price: number
}

interface OrderGeneralAccess {
  id: string // Теперь короткий 8-символьный ID
  ticket_name: string
  price: number
  quantity: number
}

interface Order {
  id: string // Теперь короткий 8-символьный ID
  short_order_number?: string
  customer_email: string
  customer_first_name: string
  customer_last_name: string
  customer_phone?: string
  total_price: number
  total_tickets: number
  payment_method: string
  status: string
  created_at: string
  order_seats: OrderSeat[]
  order_general_access: OrderGeneralAccess[]
}

interface UserOrdersProps {
  className?: string
}

const UserOrders: React.FC<UserOrdersProps> = ({ className = '' }) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null)

  useEffect(() => {
    const currentUserId = getCurrentSessionUserId()
    
    if (currentUserId) {
      setUserId(currentUserId)
      fetchUserOrders(currentUserId)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserOrders = async (userId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/orders?userId=${encodeURIComponent(userId)}`)
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки заказов')
      }
      
      const data = await response.json()
      setOrders(data.orders || [])
    } catch (err) {
      // Ошибка загрузки заказов
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-400'
      case 'pending':
        return 'text-yellow-400'
      case 'cancelled':
        return 'text-red-400'
      case 'refunded':
        return 'text-orange-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Оплачен'
      case 'pending':
        return 'В ожидании'
      case 'cancelled':
        return 'Отменен'
      case 'refunded':
        return 'Возвращен'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const downloadPDF = async (orderId: string) => {
    try {
      setDownloadingPdf(orderId)
      
      // Скачивание PDF для заказа
      const response = await fetch(`/api/tickets/pdf?orderId=${orderId}`)
      
      if (!response.ok) {
        let errorMessage = 'Ошибка загрузки PDF'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `ticket-${orderId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      // PDF успешно скачан
    } catch (error) {
      // Ошибка скачивания PDF
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      alert(`Ошибка при скачивании билета: ${errorMessage}. Попробуйте позже или обратитесь в поддержку.`)
    } finally {
      setDownloadingPdf(null)
    }
  }

  if (!userId) {
    return (
      <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
        <div className="text-center text-gray-400">
          <p>Nu există ID de sesiune</p>
          <p className="text-sm mt-2">Selectați locuri pentru a genera un ID de sesiune</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Se încarcă comenzile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
        <div className="text-center text-red-400">
          <p>Eroare: {error}</p>
          <button
            onClick={() => userId && fetchUserOrders(userId)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Încearcă din nou
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Comenzile mele</h2>
        <div className="text-sm text-gray-400">
          ID sesiune: {userId.slice(0, 8)}...
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <p>Nu aveți comenzi încă</p>
          <p className="text-sm mt-2">Comenzile dvs. vor apărea aici după finalizarea unei achiziții</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-700 rounded-lg p-4 border border-gray-600"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-semibold">
                    Comandă #{order.short_order_number || order.id.slice(0, 8)}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </div>
                  <div className="text-green-400 font-bold">
                    {order.total_price} Lei
                  </div>
                  {/* Временно убрана проверка статуса paid для тестирования PDF */}
                  <button
                    onClick={() => downloadPDF(order.id)}
                    disabled={downloadingPdf === order.id}
                    className="mt-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors flex items-center gap-1"
                  >
                    {downloadingPdf === order.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                        Загрузка...
                      </>
                    ) : (
                      <>
                        📄 Скачать билет
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-white font-medium mb-2">Client</h4>
                    <p className="text-gray-300 text-sm">
                      {order.customer_first_name} {order.customer_last_name}
                    </p>
                    <p className="text-gray-400 text-sm">{order.customer_email}</p>
                    {order.customer_phone && (
                      <p className="text-gray-400 text-sm">{order.customer_phone}</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-2">Bilete</h4>
                    {order.order_seats.map((seat) => (
                      <p key={seat.id} className="text-gray-300 text-sm">
                        Zona {seat.zone}, Rând {seat.row}, Loc {seat.number} - {seat.price} Lei
                      </p>
                    ))}
                    {order.order_general_access.map((ticket) => (
                      <p key={ticket.id} className="text-gray-300 text-sm">
                        {ticket.ticket_name} x{ticket.quantity} - {ticket.price * ticket.quantity} Lei
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UserOrders