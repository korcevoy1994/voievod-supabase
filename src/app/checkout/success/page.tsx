'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'

const CheckoutSuccessPageContent: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'success' | 'failed'>('checking')

  const fetchOrderDetails = async (orderIdToFetch: string) => {
    try {
      const response = await fetch(`/api/orders/${orderIdToFetch}`)
      if (response.ok) {
        const data = await response.json()
        if (data.order && data.order.short_order_number) {
          setOrderNumber(data.order.short_order_number)
        }
      }
    } catch (error) {
      console.error('Error fetching order details:', error)
    }
  }

  useEffect(() => {
    // Проверяем, есть ли orderId в URL параметрах (возврат от MAIB)
    const urlOrderId = searchParams.get('orderId')
    const payId = searchParams.get('payId')
    
    if (urlOrderId) {
      setOrderId(urlOrderId)
      fetchOrderDetails(urlOrderId)
      
      // Если есть payId, это означает возврат от MAIB
      // Но пользователь попал на success страницу, хотя платеж мог быть неуспешным
      // Проверяем реальный статус платежа
      if (payId) {
        checkPaymentStatus(urlOrderId)
      } else {
        // Обычный success flow без MAIB параметров
        setPaymentStatus('success')
      }
      
      // Очищаем данные корзины после возврата от MAIB
      localStorage.removeItem('checkout_data')
      localStorage.removeItem('voevoda_reservations')
      localStorage.removeItem('voevoda_supabase_selectedSeats')
      localStorage.removeItem('voevoda_supabase_generalAccess')
    } else {
      // Получаем ID последнего заказа из localStorage (обычный flow)
      const lastOrderId = localStorage.getItem('last_order_id')
      const lastOrderNumber = localStorage.getItem('last_order_number')
      if (lastOrderId) {
        setOrderId(lastOrderId)
        if (lastOrderNumber) {
          setOrderNumber(lastOrderNumber)
        } else {
          fetchOrderDetails(lastOrderId)
        }
        setPaymentStatus('success')
        // Очищаем ID заказа после получения
        localStorage.removeItem('last_order_id')
        localStorage.removeItem('last_order_number')
      }
    }
  }, [searchParams])

  const checkPaymentStatus = async (orderIdToCheck: string) => {
    try {
      const response = await fetch(`/api/orders/${orderIdToCheck}/payment`)
      if (response.ok) {
        const data = await response.json()
        if (data.isPaid) {
          setPaymentStatus('success')
        } else {
          // Если платеж неуспешный, перенаправляем на fail страницу
          router.push(`/checkout/fail?orderId=${orderIdToCheck}`)
          return
        }
      } else {
        // Если ошибка API, перенаправляем на fail страницу
        router.push(`/checkout/fail?orderId=${orderIdToCheck}`)
        return
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
      // Если ошибка сети, перенаправляем на fail страницу
      router.push(`/checkout/fail?orderId=${orderIdToCheck}`)
      return
    }
  }

  const downloadPDF = async () => {
    if (!orderId) {
      alert('ID заказа не найден. Попробуйте вернуться на страницу заказов.')
      return
    }
    
    setDownloadingPdf(true)
    try {
      console.log('Скачивание PDF для заказа:', orderId)
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
      a.download = `bilete-${orderId}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log('PDF успешно скачан')
    } catch (error) {
      console.error('Ошибка скачивания PDF:', error)
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      alert(`Ошибка при скачивании билета: ${errorMessage}. Попробуйте позже или обратитесь в поддержку.`)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const sendEmailPDF = async () => {
    if (!orderId) {
      alert('ID заказа не найден. Попробуйте вернуться на страницу заказов.')
      return
    }
    
    setSendingEmail(true)
    try {
      console.log('Отправка PDF билета по email для заказа:', orderId)
      const response = await fetch('/api/tickets/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId })
      })
      
      if (!response.ok) {
        let errorMessage = 'Ошибка отправки email'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      console.log('Email отправлен успешно:', result)
      
      alert(`Biletele au fost trimise pe email cu succes!\n\nPentru testare, poți vedea email-ul aici:\n${result.previewUrl || 'Email trimis'}`)
    } catch (error) {
      console.error('Ошибка отправки email:', error)
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      alert(`Ошибка при отправке билета на email: ${errorMessage}. Попробуйте позже или обратитесь в поддержку.`)
    } finally {
      setSendingEmail(false)
    }
  }

  if (paymentStatus === 'checking') {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-800/95 rounded-2xl p-8 border border-gray-700 text-center max-w-md mx-4"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <h1 className="text-xl font-bold text-white mb-4">
            Se verifică plata...
          </h1>
          <p className="text-gray-300">
            Te rugăm să aștepți în timp ce verificăm statusul plății tale.
          </p>
        </motion.div>
      </div>
    )
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-800/95 rounded-2xl p-8 border border-gray-700 text-center max-w-md mx-4"
        >
          {/* Error Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mb-4"
          >
            Plata nu a fost finalizată
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-300 mb-6"
          >
            Din păcate, plata nu a putut fi procesată. Te rugăm să încerci din nou.
          </motion.p>

          {orderId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-700 rounded-lg p-4 mb-6"
            >
              <p className="text-sm text-gray-400 mb-1">Numărul comenzii:</p>
              <p className="text-white font-mono text-lg">{orderId}</p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-3"
          >
            <button
              onClick={() => router.push('/tickets')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Încearcă din nou
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Înapoi la pagina principală
            </button>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800/95 rounded-2xl p-8 border border-gray-700 text-center max-w-md mx-4"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-white mb-4"
        >
          Comandă finalizată cu succes!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-300 mb-6"
        >
          Mulțumim pentru cumpărare! Biletele tale au fost confirmate și plata a fost procesată cu succes.
        </motion.p>

        {(orderNumber || orderId) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-700 rounded-lg p-4 mb-6"
          >
            <p className="text-sm text-gray-400 mb-1">Numărul comenzii:</p>
            <p className="text-white font-mono text-lg">{orderNumber || orderId}</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          {orderId && (
            <>
              <button
                onClick={downloadPDF}
                disabled={downloadingPdf}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {downloadingPdf ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Se descarcă...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Descarcă biletele (PDF)
                  </>
                )}
              </button>
              
              <button
                onClick={sendEmailPDF}
                disabled={sendingEmail}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Se trimite...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Trimite pe email (TEST)
                  </>
                )}
              </button>
            </>
          )}
          
          <button
            onClick={() => router.push('/tickets')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Cumpără alte bilete
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Înapoi la pagina principală
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}

const CheckoutSuccessPage: React.FC = () => {
  return (
    <Suspense fallback={<div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
      <CheckoutSuccessPageContent />
    </Suspense>
  )
}

export default CheckoutSuccessPage