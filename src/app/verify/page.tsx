'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface TicketInfo {
  orderId: string // Теперь короткий 8-символьный ID
  orderNumber?: string
  customerName: string
  eventTitle: string
  totalTickets: number
  status: string
}

interface VerificationResult {
  valid: boolean
  ticket?: TicketInfo
  message: string
}

const VerifyPage: React.FC = () => {
  const [qrCode, setQrCode] = useState('')
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verifyTicket = async () => {
    if (!qrCode.trim()) {
      setError('Введите QR код')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrCode: qrCode.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Ошибка проверки билета')
      }
    } catch (err) {
      console.error('Ошибка проверки:', err)
      setError('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyTicket()
    }
  }

  const resetForm = () => {
    setQrCode('')
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-8 border border-gray-700"
        >
          <h1 className="text-3xl font-bold text-white mb-8 text-center">
            Проверка билетов
          </h1>

          <div className="space-y-6">
            <div>
              <label htmlFor="qrCode" className="block text-sm font-medium text-gray-300 mb-2">
                QR код билета
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  id="qrCode"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Введите или отсканируйте QR код"
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  onClick={verifyTicket}
                  disabled={loading || !qrCode.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Проверка...
                    </>
                  ) : (
                    '🔍 Проверить'
                  )}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-900/50 border border-red-500 rounded-lg p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-xl">❌</span>
                  <p className="text-red-300">{error}</p>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`border rounded-lg p-6 ${
                  result.valid
                    ? 'bg-green-900/50 border-green-500'
                    : 'bg-red-900/50 border-red-500'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">
                    {result.valid ? '✅' : '❌'}
                  </span>
                  <div>
                    <h3 className={`text-xl font-bold ${
                      result.valid ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {result.valid ? 'Билет действителен' : 'Билет недействителен'}
                    </h3>
                    <p className={`text-sm ${
                      result.valid ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {result.message}
                    </p>
                  </div>
                </div>

                {result.valid && result.ticket && (
                  <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
                    <h4 className="text-white font-medium mb-3">Информация о билете:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Номер заказа:</span>
                        <p className="text-white font-mono">{result.ticket.orderNumber || result.ticket.orderId.slice(0, 8) + '...'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Покупатель:</span>
                        <p className="text-white">{result.ticket.customerName}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Количество билетов:</span>
                        <p className="text-white">{result.ticket.totalTickets}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Статус:</span>
                        <p className="text-green-400 font-medium">{result.ticket.status}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={resetForm}
                  className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Проверить другой билет
                </button>
              </motion.div>
            )}
          </div>

          <div className="mt-8 p-4 bg-gray-700/50 rounded-lg">
            <h3 className="text-white font-medium mb-2">Инструкция:</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Введите QR код билета в поле выше</li>
              <li>• Нажмите "Проверить" или Enter</li>
              <li>• Система покажет статус билета и информацию о заказе</li>
              <li>• Действительными считаются только оплаченные билеты</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default VerifyPage