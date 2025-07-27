'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  getCurrentSessionUserId, 
  clearSessionUserId, 
  isValidSessionUserId 
} from '@/lib/userSession'
import UserOrders from '@/components/UserOrders'

interface TempUserData {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  createdAt: string
}

const ProfilePage: React.FC = () => {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [tempUserData, setTempUserData] = useState<TempUserData | null>(null)
  const [sessionInfo, setSessionInfo] = useState({
    isValid: false,
    createdAt: null as Date | null,
    hasOrders: false
  })

  useEffect(() => {
    const currentUserId = getCurrentSessionUserId()
    setUserId(currentUserId)
    
    if (currentUserId) {
      // Проверяем валидность ID
      const isValid = isValidSessionUserId(currentUserId)
      setSessionInfo(prev => ({ ...prev, isValid }))
      
      // Загружаем данные пользователя из localStorage
      const savedUserData = localStorage.getItem('temp_user_data')
      if (savedUserData) {
        try {
          const userData = JSON.parse(savedUserData)
          setTempUserData(userData)
        } catch (error) {
          console.error('Ошибка загрузки данных пользователя:', error)
        }
      }
    }
  }, [])

  const handleClearSession = () => {
    if (confirm('Вы уверены, что хотите очистить сессию? Это удалит все ваши данные.')) {
      clearSessionUserId()
      localStorage.removeItem('temp_user_data')
      localStorage.removeItem('checkout_data')
      localStorage.removeItem('voevoda_supabase_selectedSeats')
      localStorage.removeItem('voevoda_supabase_generalAccess')
      
      // Перенаправляем на главную страницу
      router.push('/tickets')
    }
  }

  const handleGoToTickets = () => {
    router.push('/tickets')
  }

  const getUserIdType = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(id)) {
      return 'UUID (современный браузер)'
    }
    return 'Custom ID (fallback)'
  }

  const formatUserId = (id: string) => {
    if (id.length > 20) {
      return `${id.slice(0, 8)}...${id.slice(-8)}`
    }
    return id
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
              onClick={handleGoToTickets}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
            >
              ← Înapoi la bilete
            </button>
            <h1 className="text-3xl font-bold text-white">Profilul meu</h1>
          </div>

          {!userId ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center"
            >
              <h2 className="text-xl font-bold text-white mb-4">Nu există sesiune activă</h2>
              <p className="text-gray-400 mb-6">
                Pentru a vedea profilul și comenzile, trebuie să selectați locuri pe pagina de bilete.
                Aceasta va genera automat un ID de sesiune unic.
              </p>
              <button
                onClick={handleGoToTickets}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors cursor-pointer"
              >
                Mergi la bilete
              </button>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Informații sesiune */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-1"
              >
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6">
                  <h2 className="text-xl font-bold text-white mb-4">Informații sesiune</h2>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        ID sesiune
                      </label>
                      <div className="bg-gray-700 rounded-lg p-3">
                        <code className="text-green-400 text-sm break-all">
                          {formatUserId(userId)}
                        </code>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Tip ID
                      </label>
                      <p className="text-gray-300 text-sm">
                        {getUserIdType(userId)}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Status
                      </label>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        sessionInfo.isValid 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sessionInfo.isValid ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-600">
                    <button
                      onClick={handleClearSession}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Șterge sesiunea
                    </button>
                    <p className="text-gray-400 text-xs mt-2 text-center">
                      Aceasta va șterge toate datele
                    </p>
                  </div>
                </div>

                {/* Informații utilizator */}
                {tempUserData && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gray-800 rounded-xl p-6 border border-gray-700"
                  >
                    <h2 className="text-xl font-bold text-white mb-4">Date personale</h2>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Nume complet
                        </label>
                        <p className="text-gray-300">
                          {tempUserData.firstName} {tempUserData.lastName}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Email
                        </label>
                        <p className="text-gray-300">{tempUserData.email}</p>
                      </div>
                      
                      {tempUserData.phone && (
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">
                            Telefon
                          </label>
                          <p className="text-gray-300">{tempUserData.phone}</p>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Creat la
                        </label>
                        <p className="text-gray-300 text-sm">
                          {new Date(tempUserData.createdAt).toLocaleDateString('ro-RO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Comenzi */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-2"
              >
                <UserOrders />
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default ProfilePage