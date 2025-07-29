'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'

const CheckoutFailPageContent: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orderId, setOrderId] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'failed'>('checking')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    const urlOrderId = searchParams.get('orderId')
    
    if (urlOrderId) {
      setOrderId(urlOrderId)
      checkPaymentStatus(urlOrderId)
    } else {
      setPaymentStatus('failed')
      setErrorMessage('ID заказа не найден')
    }
  }, [searchParams])

  const checkPaymentStatus = async (orderIdToCheck: string) => {
    try {
      const response = await fetch(`/api/orders/${orderIdToCheck}/payment`)
      if (response.ok) {
        const data = await response.json()
        setDebugInfo(data) // Сохраняем всю информацию для отладки
        
        if (data.isPaid) {
          // Если платеж все-таки прошел, перенаправляем на success
          router.push(`/checkout/success?orderId=${orderIdToCheck}`)
          return
        }
      }
      setPaymentStatus('failed')
    } catch (error) {
      console.error('Error checking payment status:', error)
      setPaymentStatus('failed')
      setErrorMessage('Ошибка при проверке статуса платежа')
    }
  }

  const handleRetryPayment = () => {
    if (orderId) {
      // Перенаправляем обратно на checkout с сохраненным заказом
      router.push(`/checkout?retryOrderId=${orderId}`)
    } else {
      router.push('/checkout')
    }
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  if (paymentStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Проверяем статус платежа...</h2>
          <p className="text-gray-600">Пожалуйста, подождите</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        {/* Иконка ошибки */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Платеж не прошел
        </h1>
        
        <p className="text-gray-600 mb-6">
          К сожалению, ваш платеж не был обработан. {errorMessage && `Ошибка: ${errorMessage}`}
        </p>

        {orderId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Номер заказа:</span> {orderId}
            </p>
          </div>
        )}

        {/* Отладочная информация */}
        {debugInfo && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Информация для отладки:</h3>
            <div className="text-xs text-yellow-700 space-y-1">
              <p><span className="font-medium">Статус заказа:</span> {debugInfo.status}</p>
              <p><span className="font-medium">Метод оплаты:</span> {debugInfo.paymentMethod}</p>
              <p><span className="font-medium">Сумма:</span> {debugInfo.totalPrice} MDL</p>
              <p><span className="font-medium">Оплачен:</span> {debugInfo.isPaid ? 'Да' : 'Нет'}</p>
              
              {debugInfo.paymentDetails && (
                <div className="mt-2 pt-2 border-t border-yellow-200">
                  <p className="font-medium mb-1">Детали платежа:</p>
                  <p><span className="font-medium">Статус платежа:</span> {debugInfo.paymentDetails.status}</p>
                  <p><span className="font-medium">Провайдер:</span> {debugInfo.paymentDetails.provider}</p>
                  <p><span className="font-medium">ID платежа провайдера:</span> {debugInfo.paymentDetails.providerPaymentId}</p>
                  <p><span className="font-medium">Создан:</span> {new Date(debugInfo.paymentDetails.createdAt).toLocaleString('ru-RU')}</p>
                  {debugInfo.paymentDetails.updatedAt && (
                    <p><span className="font-medium">Обновлен:</span> {new Date(debugInfo.paymentDetails.updatedAt).toLocaleString('ru-RU')}</p>
                  )}
                  {debugInfo.paymentDetails.completedAt && (
                    <p><span className="font-medium">Завершен:</span> {new Date(debugInfo.paymentDetails.completedAt).toLocaleString('ru-RU')}</p>
                  )}
                  
                  {debugInfo.paymentDetails.providerData && (
                    <div className="mt-2">
                      <p className="font-medium">Данные провайдера:</p>
                      <pre className="text-xs bg-yellow-100 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(debugInfo.paymentDetails.providerData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              
              {debugInfo.allPayments && debugInfo.allPayments.length > 1 && (
                <div className="mt-2 pt-2 border-t border-yellow-200">
                  <p className="font-medium">Всего платежей: {debugInfo.allPayments.length}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRetryPayment}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Попробовать снова
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleBackToHome}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Вернуться на главную
          </motion.button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Если проблема повторяется, обратитесь в службу поддержки
          </p>
        </div>
      </motion.div>
    </div>
  )
}

const CheckoutFailPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    }>
      <CheckoutFailPageContent />
    </Suspense>
  )
}

export default CheckoutFailPage