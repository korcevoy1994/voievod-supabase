'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function PaymentFailedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  useEffect(() => {
    // Перенаправляем на страницу неудачного заказа с orderId
    if (orderId) {
      router.replace(`/checkout/fail?orderId=${orderId}`)
    } else {
      // Если нет orderId, перенаправляем на главную
      router.replace('/')
    }
  }, [orderId, router])

  // Показываем загрузку в темной теме сайта
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-lg">Обработка результата платежа...</p>
        <p className="text-sm text-gray-400 mt-2">Перенаправление на страницу результата</p>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-lg">Загрузка...</p>
      </div>
    </div>
  )
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentFailedContent />
    </Suspense>
  )
}