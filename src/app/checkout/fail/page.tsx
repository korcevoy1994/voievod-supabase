'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useCacheInvalidation } from '@/lib/hooks/useOptimizedData'

const CheckoutFailPageContent: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { invalidateZoneData, invalidateEventData } = useCacheInvalidation()
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
      setErrorMessage('ID-ul comenzii nu a fost găsit')
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
      
      // Очищаем localStorage от данных о выбранных местах
      localStorage.removeItem('checkout_data')
        localStorage.removeItem('voevoda_reservations')
        localStorage.removeItem('voevoda_supabase_selectedSeats')
        localStorage.removeItem('voevoda_supabase_generalAccess')
        localStorage.removeItem('voevoda_supabase_vipTickets')
      
      // Инвалидируем кеш для обновления статуса мест
      invalidateZoneData()
      invalidateEventData()
    } catch (error) {
      // Error checking payment status
      setPaymentStatus('failed')
      setErrorMessage('Ошибка при проверке статуса платежа')
      
      // Очищаем localStorage от данных о выбранных местах
      localStorage.removeItem('checkout_data')
      localStorage.removeItem('voevoda_reservations')
      localStorage.removeItem('voevoda_supabase_selectedSeats')
      localStorage.removeItem('voevoda_supabase_generalAccess')
      localStorage.removeItem('voevoda_supabase_vipTickets')
      
      // Инвалидируем кеш даже при ошибке
      invalidateZoneData()
      invalidateEventData()
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Se verifică statusul plății...</h2>
          <p className="text-gray-300">Te rugăm să aștepți</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-700"
      >
        {/* Иконка ошибки */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.div>

        <h1 className="text-2xl font-bold text-white mb-4">
          Plata nu a fost finalizată
        </h1>
        
        <p className="text-gray-300 mb-6">
          Din păcate, plata nu a putut fi procesată. {errorMessage && `Eroare: ${errorMessage}`}
        </p>

        {orderId && (
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-300">
              <span className="font-medium">Numărul comenzii:</span> {orderId}
            </p>
          </div>
        )}

        {/* Отладочная информация */}
        {debugInfo && (
          <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-gray-200 mb-2">Informații pentru depanare:</h3>
            <div className="text-xs text-gray-300 space-y-1">
              <p><span className="font-medium">Status comandă:</span> {debugInfo.status}</p>
              <p><span className="font-medium">Metoda de plată:</span> {debugInfo.paymentMethod}</p>
              <p><span className="font-medium">Suma:</span> {debugInfo.totalPrice} MDL</p>
              <p><span className="font-medium">Plătit:</span> {debugInfo.isPaid ? 'Da' : 'Nu'}</p>
              
              {debugInfo.paymentDetails && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <p className="font-medium mb-1">Detalii plată:</p>
                  <p><span className="font-medium">Status plată:</span> {debugInfo.paymentDetails.status}</p>
                  <p><span className="font-medium">Furnizor:</span> {debugInfo.paymentDetails.provider}</p>
                  <p><span className="font-medium">ID plată furnizor:</span> {debugInfo.paymentDetails.providerPaymentId}</p>
                  <p><span className="font-medium">Creat:</span> {new Date(debugInfo.paymentDetails.createdAt).toLocaleString('ro-RO')}</p>
                  {debugInfo.paymentDetails.updatedAt && (
                    <p><span className="font-medium">Actualizat:</span> {new Date(debugInfo.paymentDetails.updatedAt).toLocaleString('ro-RO')}</p>
                  )}
                  {debugInfo.paymentDetails.completedAt && (
                    <p><span className="font-medium">Finalizat:</span> {new Date(debugInfo.paymentDetails.completedAt).toLocaleString('ro-RO')}</p>
                  )}
                  

                </div>
              )}
              
              {debugInfo.allPayments && debugInfo.allPayments.length > 1 && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <p className="font-medium">Total plăți: {debugInfo.allPayments.length}</p>
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
            Încearcă din nou
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleBackToHome}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Înapoi la pagina principală
          </motion.button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-600">
          <p className="text-sm text-gray-400">
            Dacă problema persistă, contactați serviciul de asistență
          </p>
        </div>
      </motion.div>
    </div>
  )
}

const CheckoutFailPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    }>
      <CheckoutFailPageContent />
    </Suspense>
  )
}

export default CheckoutFailPage