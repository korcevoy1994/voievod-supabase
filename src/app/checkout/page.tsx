'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { getOrCreateSessionUserId, createTempUserData } from '@/lib/userSession'
import { SecureSessionManager } from '@/lib/secureSessionManager'
import { apiClient } from '@/lib/apiClient'
import { useCacheInvalidation } from '@/lib/hooks/useOptimizedData'


interface CheckoutSeat {
  id: string // Теперь короткий 8-символьный ID
  zone: string
  row: string
  number: string
  price: number
}

interface CheckoutGeneralAccess {
  id: string // Теперь короткий 8-символьный ID
  name: string
  price: number
  quantity: number
}

interface CheckoutVipTicket {
  id: string
  name: string
  price: number
  quantity: number
}

interface CheckoutData {
  seats: CheckoutSeat[]
  generalAccess: CheckoutGeneralAccess[]
  vipTickets: CheckoutVipTicket[]
  totalPrice: number
  totalTickets: number
}

const CheckoutPageContent: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [paymentProvider, setPaymentProvider] = useState('maib')
  const [isProcessing, setIsProcessing] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const { invalidateZoneData, invalidateEventData } = useCacheInvalidation()
  


  useEffect(() => {
    // Получаем данные о билетах из localStorage или URL параметров
    const loadCheckoutData = () => {
      try {
        const savedData = localStorage.getItem('checkout_data')
        if (savedData) {
          const data = JSON.parse(savedData)
          setCheckoutData(data)
        } else {
          // Если нет данных, перенаправляем обратно на страницу билетов
          router.push('/tickets')
        }
      } catch (error) {
        // Ошибка загрузки данных checkout
        router.push('/tickets')
      } finally {
        setLoading(false)
      }
    }

    loadCheckoutData()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // Проверяем, что мы находимся в браузере
      if (typeof window === 'undefined') {
        throw new Error('Функция доступна только в браузере')
      }

      // Получаем ID сессии пользователя
      const sessionManager = new SecureSessionManager()
      const sessionResult = sessionManager.getOrCreateSession()
      
      // Session result
      
      if (!sessionResult || !sessionResult.sessionId || !sessionResult.userId) {
        // Ошибка создания сессии
        throw new Error('Отсутствует ID сессии')
      }
      
      // Дополнительная проверка, что сессия сохранилась
      const currentSessionId = sessionManager.getCurrentSessionId()
      if (!currentSessionId) {
        // Сессия не была сохранена в localStorage
        throw new Error('Ошибка сохранения сессии')
      }
      
      const { sessionId } = sessionResult
      
      // Генерируем настоящий UUID для пользователя (функция create_temporary_user ожидает UUID)
      const userId = crypto.randomUUID()
      
      // Создаем данные временного пользователя
      const tempUserData = createTempUserData(sessionId, {
        email: customerInfo.email,
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        phone: customerInfo.phone
      })
      
      // Сохраняем данные пользователя для дальнейшего использования
      localStorage.setItem('temp_user_data', JSON.stringify(tempUserData))
      
      // Проверяем наличие данных заказа
      if (!checkoutData) {
        throw new Error('Отсутствуют данные заказа')
      }

      // Создаем заказ через API
      const orderResponse = await apiClient.post('/api/orders', {
        userId: userId,
        customerInfo: {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone
        },
        seats: checkoutData.seats || [],
        generalAccess: checkoutData.generalAccess || [],
        vipTickets: checkoutData.vipTickets || [],
        totalPrice: checkoutData.totalPrice || 0,
        totalTickets: checkoutData.totalTickets || 0,
        paymentMethod: paymentMethod
      }, {
        'x-session-id': sessionId,
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        throw new Error(errorData.error || 'Ошибка создания заказа')
      }

      const orderResult = await orderResponse.json()
      // Заказ успешно создан
      
      // Если выбран MAIB, инициируем платеж
      if (paymentProvider === 'maib' && paymentMethod === 'card') {
        const paymentResponse = await apiClient.post(`/api/orders/${orderResult.orderId}/payment`, {
          paymentMethod: paymentMethod,
          paymentProvider: paymentProvider,
          language: 'ro'
        }, {
          'x-session-id': sessionId,
        })

        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.json()
          throw new Error(errorData.error || 'Ошибка создания платежа')
        }

        const paymentResult = await paymentResponse.json()
        
        if (paymentResult.requiresRedirect && paymentResult.payUrl) {
          // Сохраняем ID заказа для возврата
          localStorage.setItem('last_order_id', orderResult.orderId)
          if (orderResult.orderNumber) {
            localStorage.setItem('last_order_number', orderResult.orderNumber)
          }
          
          // Перенаправляем на страницу оплаты MAIB
          window.location.href = paymentResult.payUrl
          return
        }
      }
      
      // Сохраняем ID заказа для страницы успеха
      localStorage.setItem('last_order_id', orderResult.orderId)
      if (orderResult.orderNumber) {
        localStorage.setItem('last_order_number', orderResult.orderNumber)
      }
      
      // Очищаем данные корзины после успешной покупки
      localStorage.removeItem('checkout_data')
        localStorage.removeItem('voevoda_reservations')
        localStorage.removeItem('voevoda_supabase_selectedSeats')
        localStorage.removeItem('voevoda_supabase_generalAccess')
        localStorage.removeItem('voevoda_supabase_vipTickets')
      
      // Инвалидируем кэш для обновления статуса мест
      invalidateZoneData()
      invalidateEventData('550e8400-e29b-41d4-a716-446655440000')
      
      // Перенаправляем на страницу успеха
      router.push('/checkout/success')
    } catch (error) {
      // Ошибка обработки платежа
      // Показываем пользователю детальную ошибку
      alert(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const isFormValid = customerInfo.firstName && customerInfo.lastName && customerInfo.email && customerInfo.phone && agreeToTerms

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Se încarcă...</div>
      </div>
    )
  }

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Nu s-au găsit date pentru checkout</div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => {
                // Возврат на страницу билетов из checkout
                // НЕ удаляем checkout_data при возврате, чтобы данные сохранились
                router.push('/tickets')
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Înapoi
            </button>
            <h1 className="text-3xl font-bold text-white">Finalizare comandă</h1>
          </div>
          


          <div className="grid lg:grid-cols-2 gap-8">
            {/* Formular de comandă */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h2 className="text-xl font-bold text-white mb-6">Informații personale</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Prenume *
                    </label>
                    <input
                      type="text"
                      value={customerInfo.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nume *
                    </label>
                    <input
                      type="text"
                      value={customerInfo.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="pt-4">
                  <h3 className="text-lg font-semibold text-white mb-0">Metodă de plată</h3>
                  <div className="space-y-3">
                    <label className="flex flex-col p-3 border border-gray-600 rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          value="card"
                          checked={paymentMethod === 'card'}
                          onChange={(e) => {
                            setPaymentMethod(e.target.value)
                            setPaymentProvider('maib')
                          }}
                          className="mr-3"
                        />
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" />
                            </svg>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-medium text-lg">Card bancar (MAIB)</span>
                            <div className="text-gray-400 text-sm mt-1">Plată securizată prin MAIB</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* MAIB Logo under radio button */}
                       <div className="mt-0 flex justify-start">
                          <img 
                            src="/maib-logo.svg" 
                            alt="MAIB Logo" 
                            className="w-32 h-20 object-contain filter brightness-110"
                            style={{maxWidth: '128px', maxHeight: '40px'}}
                          />
                        </div>
                    </label>

                  </div>
                </div>

                {/* Checkbox pentru acordul cu termenii și condițiile */}
                <div className="mt-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-gray-300 text-sm">
                      Sunt de acord cu{' '}
                      <a href="/terms" target="_blank" className="text-blue-400 hover:text-blue-300 underline">
                        termenii și condițiile
                      </a>
                      {' '}și{' '}
                      <a href="/privacy" target="_blank" className="text-blue-400 hover:text-blue-300 underline">
                        politica de confidențialitate
                      </a>
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid || isProcessing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors mt-6 cursor-pointer"
                >
                  {isProcessing ? 'Se procesează...' : `Plătește ${checkoutData.totalPrice || 0} Lei`}
                </button>
              </form>
            </motion.div>

            {/* Sumar comandă */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 h-fit"
            >
              <h2 className="text-xl font-bold text-white mb-6">Sumar comandă</h2>
              
              <div className="space-y-4">
                {/* Locuri selectate */}
                {checkoutData.seats?.map((seat) => (
                  <div key={seat.id} className="flex justify-between items-center py-2 border-b border-gray-700">
                    <div>
                      <div className="text-white font-medium">Zona {seat.zone}</div>
                      <div className="text-gray-400 text-sm">Rând {seat.row}, Loc {seat.number}</div>
                    </div>
                    <div className="text-green-400 font-bold">{seat.price} Lei</div>
                  </div>
                ))}
                
                {/* Bilete General Access */}
                {checkoutData.generalAccess?.map((ticket) => (
                  <div key={ticket.id} className="flex justify-between items-center py-2 border-b border-gray-700">
                    <div>
                      <div className="text-white font-medium">{ticket.name}</div>
                      <div className="text-gray-400 text-sm">{ticket.quantity} bilet{ticket.quantity > 1 ? 'e' : ''}</div>
                    </div>
                    <div className="text-green-400 font-bold">{ticket.price * ticket.quantity} Lei</div>
                  </div>
                ))}
                
                {/* Total */}
                <div className="pt-4 border-t border-gray-600">
                  <div className="flex justify-between items-center">
                    <div className="text-white font-bold text-lg">
                      Total ({checkoutData.totalTickets || 0} bilet{(checkoutData.totalTickets || 0) > 1 ? 'e' : ''})
                    </div>
                    <div className="text-green-400 font-bold text-xl">{checkoutData.totalPrice || 0} Lei</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

const CheckoutPage: React.FC = () => {
  return (
    <Suspense fallback={<div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <CheckoutPageContent />
    </Suspense>
  )
}

export default CheckoutPage