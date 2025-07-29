'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'

interface OrderDebugInfo {
  orderId: string
  status: string
  paymentMethod: string
  totalPrice: number
  isPaid: boolean
  createdAt: string
  updatedAt: string
  paymentDetails?: {
    id: string
    status: string
    amount: number
    provider: string
    providerPaymentId: string
    providerData: any
    createdAt: string
    updatedAt: string
    completedAt?: string
  }
  allPayments: any[]
}

const OrderDebugPage: React.FC = () => {
  const params = useParams()
  const orderId = params.orderId as string
  const [debugInfo, setDebugInfo] = useState<OrderDebugInfo | null>(null)
  const [maibCallbackInfo, setMaibCallbackInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (orderId) {
      fetchOrderDebugInfo()
    }
  }, [orderId])

  const fetchOrderDebugInfo = async () => {
    try {
      setLoading(true)
      
      // Загружаем основную информацию о заказе
      const orderResponse = await fetch(`/api/orders/${orderId}/payment`)
      if (!orderResponse.ok) {
        throw new Error(`HTTP ${orderResponse.status}: ${orderResponse.statusText}`)
      }
      const orderData = await orderResponse.json()
      setDebugInfo(orderData)
      
      // Загружаем информацию о MAIB callbacks
      const callbackResponse = await fetch(`/api/debug/maib-callbacks/${orderId}`)
      if (callbackResponse.ok) {
        const callbackData = await callbackResponse.json()
        setMaibCallbackInfo(callbackData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Загружаем информацию о заказе...</h2>
          <p className="text-gray-600">Пожалуйста, подождите</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Ошибка загрузки</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchOrderDebugInfo}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-lg p-6 mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Отладочная информация заказа
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Основная информация о заказе */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-3">Информация о заказе</h2>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">ID заказа:</span> {debugInfo?.orderId}</p>
                <p><span className="font-medium">Статус:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    debugInfo?.status === 'paid' ? 'bg-green-100 text-green-800' :
                    debugInfo?.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {debugInfo?.status}
                  </span>
                </p>
                <p><span className="font-medium">Метод оплаты:</span> {debugInfo?.paymentMethod}</p>
                <p><span className="font-medium">Сумма:</span> {debugInfo?.totalPrice} MDL</p>
                <p><span className="font-medium">Оплачен:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    debugInfo?.isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {debugInfo?.isPaid ? 'Да' : 'Нет'}
                  </span>
                </p>
                <p><span className="font-medium">Создан:</span> {debugInfo?.createdAt ? new Date(debugInfo.createdAt).toLocaleString('ru-RU') : 'N/A'}</p>
                <p><span className="font-medium">Обновлен:</span> {debugInfo?.updatedAt ? new Date(debugInfo.updatedAt).toLocaleString('ru-RU') : 'N/A'}</p>
              </div>
            </div>

            {/* Информация о платеже */}
            <div className="bg-green-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-800 mb-3">Детали платежа</h2>
              {debugInfo?.paymentDetails ? (
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">ID платежа:</span> {debugInfo.paymentDetails.id}</p>
                  <p><span className="font-medium">Статус платежа:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      debugInfo.paymentDetails.status === 'completed' ? 'bg-green-100 text-green-800' :
                      debugInfo.paymentDetails.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {debugInfo.paymentDetails.status}
                    </span>
                  </p>
                  <p><span className="font-medium">Провайдер:</span> {debugInfo.paymentDetails.provider}</p>
                  <p><span className="font-medium">ID платежа провайдера:</span> {debugInfo.paymentDetails.providerPaymentId}</p>
                  <p><span className="font-medium">Сумма платежа:</span> {debugInfo.paymentDetails.amount} MDL</p>
                  <p><span className="font-medium">Создан:</span> {new Date(debugInfo.paymentDetails.createdAt).toLocaleString('ru-RU')}</p>
                  <p><span className="font-medium">Обновлен:</span> {new Date(debugInfo.paymentDetails.updatedAt).toLocaleString('ru-RU')}</p>
                  {debugInfo.paymentDetails.completedAt && (
                    <p><span className="font-medium">Завершен:</span> {new Date(debugInfo.paymentDetails.completedAt).toLocaleString('ru-RU')}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">Информация о платеже не найдена</p>
              )}
            </div>
          </div>

          {/* Данные провайдера */}
          {debugInfo?.paymentDetails?.providerData && (
            <div className="mt-6 bg-yellow-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-yellow-800 mb-3">Данные провайдера (MAIB)</h2>
              <pre className="text-xs bg-yellow-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(debugInfo.paymentDetails.providerData, null, 2)}
              </pre>
            </div>
          )}

          {/* Все платежи */}
          {debugInfo?.allPayments && debugInfo.allPayments.length > 0 && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Все платежи ({debugInfo.allPayments.length})
              </h2>
              <div className="space-y-3">
                {debugInfo.allPayments.map((payment, index) => (
                  <div key={payment.id} className="bg-white rounded p-3 border">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <p><span className="font-medium">#{index + 1}</span></p>
                      <p><span className="font-medium">Статус:</span> {payment.status}</p>
                      <p><span className="font-medium">Сумма:</span> {payment.amount} MDL</p>
                      <p><span className="font-medium">Провайдер:</span> {payment.provider}</p>
                      <p className="col-span-2"><span className="font-medium">ID провайдера:</span> {payment.provider_payment_id}</p>
                      <p className="col-span-2"><span className="font-medium">Создан:</span> {new Date(payment.created_at).toLocaleString('ru-RU')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MAIB Callbacks анализ */}
          {maibCallbackInfo && (
            <div className="mt-6 bg-purple-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-purple-800 mb-3">Анализ MAIB Callbacks</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded p-3">
                  <p className="text-sm font-medium text-gray-600">Всего платежей</p>
                  <p className="text-2xl font-bold text-purple-600">{maibCallbackInfo.analysis.totalPayments}</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-sm font-medium text-gray-600">С callback'ами</p>
                  <p className="text-2xl font-bold text-green-600">{maibCallbackInfo.analysis.paymentsWithCallbacks}</p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-sm font-medium text-gray-600">Успешных</p>
                  <p className="text-2xl font-bold text-blue-600">{maibCallbackInfo.analysis.successfulPayments}</p>
                </div>
              </div>

              {maibCallbackInfo.analysis.possibleIssues.length > 0 && (
                <div className="bg-red-100 border border-red-200 rounded p-3 mb-4">
                  <h3 className="font-medium text-red-800 mb-2">Обнаруженные проблемы:</h3>
                  <ul className="text-sm text-red-700 space-y-1">
                    {maibCallbackInfo.analysis.possibleIssues.map((issue: string, index: number) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {maibCallbackInfo.payments.map((payment: any, index: number) => (
                <div key={payment.paymentId} className="bg-white rounded border p-4 mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-800">Платеж #{index + 1}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><span className="font-medium">ID платежа:</span> {payment.paymentId}</p>
                      <p><span className="font-medium">MAIB Payment ID:</span> {payment.providerPaymentId}</p>
                      <p><span className="font-medium">Сумма:</span> {payment.amount} MDL</p>
                      <p><span className="font-medium">Создан:</span> {new Date(payment.createdAt).toLocaleString('ru-RU')}</p>
                    </div>
                    
                    <div>
                      {payment.analysis.hasCallbackData ? (
                        <>
                          <p><span className="font-medium">MAIB Статус:</span> {payment.analysis.maibStatus}</p>
                          <p><span className="font-medium">Код статуса:</span> {payment.analysis.maibStatusCode}</p>
                          <p><span className="font-medium">Сообщение:</span> {payment.analysis.maibStatusMessage}</p>
                          <p><span className="font-medium">Callback получен:</span> {new Date(payment.analysis.callbackReceivedAt).toLocaleString('ru-RU')}</p>
                        </>
                      ) : (
                        <p className="text-red-600 font-medium">❌ Callback от MAIB не получен</p>
                      )}
                    </div>
                  </div>
                  
                  {payment.analysis.hasCallbackData && payment.providerData && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                        Показать полные данные callback'а
                      </summary>
                      <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(payment.providerData, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Анализ проблемы */}
          <div className="mt-6 bg-red-50 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-3">Общий анализ проблемы</h2>
            <div className="space-y-2 text-sm text-red-700">
              {debugInfo?.isPaid ? (
                <p className="text-green-700">✅ Заказ помечен как оплаченный. Проблем не обнаружено.</p>
              ) : (
                <>
                  <p>❌ Заказ не помечен как оплаченный</p>
                  {!debugInfo?.paymentDetails && (
                    <p>❌ Отсутствует информация о платеже в базе данных</p>
                  )}
                  {debugInfo?.paymentDetails?.status === 'failed' && (
                    <p>❌ Платеж имеет статус 'failed'</p>
                  )}
                  {debugInfo?.paymentDetails?.status === 'pending' && (
                    <p>⚠️ Платеж находится в статусе 'pending' - возможно, callback от MAIB еще не получен</p>
                  )}
                  {debugInfo?.status === 'cancelled' && (
                    <p>❌ Заказ отменен</p>
                  )}
                  {maibCallbackInfo?.analysis.paymentsWithCallbacks === 0 && maibCallbackInfo?.analysis.totalPayments > 0 && (
                    <p>❌ Callback от MAIB не получен ни для одного платежа</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button 
              onClick={fetchOrderDebugInfo}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Обновить данные
            </button>
            <button 
              onClick={() => window.open(`/checkout/success?orderId=${orderId}`, '_blank')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Открыть Success страницу
            </button>
            <button 
              onClick={() => window.open(`/checkout/fail?orderId=${orderId}`, '_blank')}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Открыть Fail страницу
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default OrderDebugPage