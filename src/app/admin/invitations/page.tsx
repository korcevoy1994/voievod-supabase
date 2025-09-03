'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Users, MapPin, Mail, Phone, User, Save, Loader2, RefreshCw, LogOut } from 'lucide-react'
import { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import ArenaSVG from '@/components/ArenaSVG'
import SeatMapSupabase from '@/components/SeatMapSupabase'
import { useRouter } from 'next/navigation'
import { useZones } from '@/lib/hooks/useSupabaseData'
import { useOptimizedZoneColors } from '@/lib/hooks/useOptimizedData'
import { getSupabaseBrowserSSRClient } from '@/lib/supabase-ssr'
import AdminLogin from '@/components/AdminLogin'

interface InvitationFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
}

interface SelectedSeat {
  id: string
  row: string
  number: string
  price: number
  zone: string
}

export default function InvitationsPage() {
  const router = useRouter()
  const seatMapRef = useRef<ReactZoomPanPinchRef>(null)
  const { zones, loading: zonesLoading, error: zonesError } = useZones()
  const { data: zoneColors, loading: colorsLoading, error: colorsError } = useOptimizedZoneColors();
  
  const [selectedZone, setSelectedZone] = useState<string>('')
  const [selectedSeats, setSelectedSeats] = useState<Record<string, string[]>>({})
  const [formData, setFormData] = useState<InvitationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [step, setStep] = useState<'seats' | 'form' | 'success'>('seats')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  // Проверяем аутентификацию при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabaseBrowserSSRClient()
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setAuthLoading(false)
    }

    checkAuth()

    const supabase = getSupabaseBrowserSSRClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      setIsAuthenticated(!!session)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Устанавливаем первую зону по умолчанию когда зоны загружены
  React.useEffect(() => {
    if (zones && zones.length > 0 && !selectedZone) {
      setSelectedZone(zones[0].zone_id)
    }
  }, [zones, selectedZone])

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserSSRClient()
    await supabase.auth.signOut()
    setIsAuthenticated(false)
  }

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
    // Принудительно обновляем страницу для синхронизации с middleware
    window.location.reload()
  }



  const currentZone = zones?.find(zone => zone.zone_id === selectedZone)
  const totalSelectedSeats = Object.values(selectedSeats).flat().length
  const totalPrice = totalSelectedSeats * 0 // Цена для пригласительных = 0

  const handleZoneClick = (zoneId: string) => {
    setSelectedZone(zoneId)
  }

  const handleSeatClick = (seatId: string) => {
    if (!selectedZone) return
    
    setSelectedSeats(prev => {
      const zoneSeats = prev[selectedZone] || []
      if (zoneSeats.includes(seatId)) {
        return {
          ...prev,
          [selectedZone]: zoneSeats.filter(id => id !== seatId)
        }
      } else {
        return {
          ...prev,
          [selectedZone]: [...zoneSeats, seatId]
        }
      }
    })
  }

  const handleFormChange = (field: keyof InvitationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      alert('Пожалуйста, введите имя получателя')
      return false
    }
    if (!formData.lastName.trim()) {
      alert('Пожалуйста, введите фамилию получателя')
      return false
    }
    if (!formData.email.trim()) {
      alert('Пожалуйста, введите email получателя')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert('Пожалуйста, введите корректный email')
      return false
    }
    return true
  }

  const createInvitationOrder = async () => {
    if (totalSelectedSeats === 0) {
      alert('Пожалуйста, выберите места')
      return
    }

    if (!validateForm()) {
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          seats: Object.entries(selectedSeats).flatMap(([zoneId, seatIds]) => 
            seatIds.map(seatId => ({
              id: seatId,
              zone: zoneId,
              price: 0 // Пригласительные бесплатные
            }))
          ),
          recipient: formData,
          totalPrice,
          notes: formData.notes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка создания пригласительного')
      }

      const result = await response.json()
      setCreatedOrderId(result.orderId)
      setStep('success')
    } catch (error) {
      // Error creating invitation
      alert(error instanceof Error ? error.message : 'Ошибка создания пригласительного')
    } finally {
      setIsCreating(false)
    }
  }

  const downloadPDF = async () => {
    if (!createdOrderId) return

    try {
      const response = await fetch(`/api/tickets/pdf?orderId=${createdOrderId}`)
      if (!response.ok) {
        throw new Error('Ошибка загрузки билетов')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bilete-${createdOrderId}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      // Error downloading tickets
      alert('Ошибка загрузки билетов')
    }
  }

  const resetForm = () => {
    setSelectedSeats({})
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      notes: ''
    })
    setCreatedOrderId(null)
    setStep('seats')
  }

  // Показываем загрузку аутентификации
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-gray-300">Проверка аутентификации...</p>
        </div>
      </div>
    )
  }

  // Показываем форму входа для неаутентифицированных пользователей
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Назад к админке</span>
            </button>
            <div className="h-6 w-px bg-gray-600" />
            <h1 className="text-xl font-semibold">Создание пригласительных</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>
          
          {step === 'success' && (
            <div className="flex items-center space-x-3">
              <button
                onClick={downloadPDF}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Скачать билеты (ZIP)</span>
              </button>
              <button
                onClick={resetForm}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Создать еще</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Seat Selection */}
        {step === 'seats' && (
          <>
            {/* Zone Selector */}
            <div className="w-80 bg-gray-800 border-r border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Выбор зоны
              </h2>
              
              {zonesLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <div className="text-sm text-gray-400">Загрузка зон...</div>
                </div>
              ) : zonesError ? (
                <div className="text-center py-4 text-red-400">
                  Ошибка загрузки зон: {zonesError}
                </div>
              ) : (
                <div className="space-y-2 mb-6">
                  {zones?.map(zone => (
                    <button
                      key={zone.zone_id}
                      onClick={() => {
                        setSelectedZone(zone.zone_id)
                        setSelectedSeats({})
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedZone === zone.zone_id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      <div className="font-medium">Зона {zone.zone_id}</div>
                      <div className="text-sm opacity-75">Пригласительный</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Seats Info */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium mb-2">Выбранные места</h3>
                <div className="text-sm text-gray-300 mb-2">
                  Количество: {totalSelectedSeats}
                </div>
                <div className="text-sm text-gray-300 mb-4">
                  Общая стоимость: {totalPrice} MDL
                </div>
                
                <button
                  onClick={() => setStep('form')}
                  disabled={totalSelectedSeats === 0}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                >
                  Продолжить
                </button>
              </div>
            </div>

            {/* Seat Map */}
            <div className="flex-1 bg-gray-900">
              {selectedZone ? (
                <SeatMapSupabase
                  key={`invitations-${selectedZone}-${Date.now()}`}
                  zoneId={selectedZone}
                  selectedSeats={selectedSeats[selectedZone] || []}
                  onSeatClick={handleSeatClick}
                  eventId="550e8400-e29b-41d4-a716-446655440000"
                  price={0}
                />
              ) : (
                <ArenaSVG
                   selectedSeats={selectedSeats}
                   onZoneClick={handleZoneClick}
                   zoneColors={zoneColors?.zoneColors}
                   zoneStatus={zoneColors?.zoneStatus}
                 />
              )}
            </div>
          </>
        )}

        {/* Form Step */}
        {step === 'form' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-lg p-8 w-full max-w-md"
            >
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Данные получателя
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Имя *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleFormChange('firstName', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                    placeholder="Введите имя"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Фамилия *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleFormChange('lastName', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                    placeholder="Введите фамилию"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Телефон</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                    placeholder="+373 XX XXX XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Примечания</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 h-20 resize-none"
                    placeholder="Дополнительная информация..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setStep('seats')}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Назад
                </button>
                <button
                  onClick={createInvitationOrder}
                  disabled={isCreating}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Создать
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-lg p-8 w-full max-w-md text-center"
            >
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-xl font-semibold mb-2">Пригласительные созданы!</h2>
              <p className="text-gray-400 mb-6">
                Заказ #{createdOrderId} успешно создан.
                Места заблокированы на схеме.
              </p>

              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-300 mb-2">
                  Получатель: {formData.firstName} {formData.lastName}
                </div>
                <div className="text-sm text-gray-300 mb-2">
                  Email: {formData.email}
                </div>
                <div className="text-sm text-gray-300">
                  Мест: {totalSelectedSeats} | Сумма: {totalPrice} MDL
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={downloadPDF}
                  className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Скачать билеты (ZIP)
                </button>
                <button
                  onClick={resetForm}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Создать еще
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}