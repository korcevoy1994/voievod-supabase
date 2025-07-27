'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'

// Import the SVG as a React component
import ArenaSVG from '@/components/ArenaSVG'
import SeatMapSupabase from '@/components/SeatMapSupabase'
import SelectedTickets from '@/components/SelectedTickets'
import MobileSelectedTickets from '@/components/MobileSelectedTickets'
import LegendBar from '@/components/LegendBar'
import { useEventPricing } from '@/lib/hooks/useSupabaseData'
import { getOrCreateSessionUserId } from '@/lib/userSession'

interface GeneralAccessTicket {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const viewVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

export default function VoevodaSupabaseEventPage() {
  const router = useRouter()
  // Загружаем цены из базы данных
  const { zonePrices, loading: pricingLoading, error: pricingError } = useEventPricing('550e8400-e29b-41d4-a716-446655440000')
  const [activeZone, setActiveZone] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(true)
  const [selectedSeats, setSelectedSeats] = useState<Record<string, string[]>>({})
  const [generalAccessTickets, setGeneralAccessTickets] = useState<GeneralAccessTicket[]>([])
  const [showGeneralAccessModal, setShowGeneralAccessModal] = useState(false)
  const [generalAccessQuantity, setGeneralAccessQuantity] = useState(1)
  const seatmapRef = React.useRef<ReactZoomPanPinchRef | null>(null)

  // Загружаем выбранные места и general access билеты из localStorage при монтировании
  useEffect(() => {
    console.log('🔄 Загрузка данных при монтировании компонента')
    
    // Сначала проверяем, есть ли данные checkout (возврат с checkout)
    const checkoutData = localStorage.getItem('checkout_data')
    console.log('📦 checkout_data:', checkoutData ? 'найден' : 'не найден')
    
    if (checkoutData) {
      try {
        const data = JSON.parse(checkoutData)
        console.log('✅ Восстанавливаем данные из checkout_data:', data)
        
        // Восстанавливаем выбранные места из checkout данных
         const restoredSeats: Record<string, string[]> = {}
         
         data.seats?.forEach((seat: any) => {
           if (!restoredSeats[seat.zone]) {
             restoredSeats[seat.zone] = []
           }
           restoredSeats[seat.zone].push(seat.id)
         })
         setSelectedSeats(restoredSeats)
         console.log('🎫 Восстановлены места:', restoredSeats)
         
         // Восстанавливаем general access билеты
         if (data.generalAccess) {
           setGeneralAccessTickets(data.generalAccess)
           console.log('🎟️ Восстановлены general access билеты:', data.generalAccess)
         }
        
        return // Выходим, чтобы не загружать из других источников
      } catch (error) {
        console.error('❌ Ошибка восстановления данных из checkout:', error)
      }
    }
    
    // Если нет checkout данных, загружаем из обычного localStorage
    const savedSeats = localStorage.getItem('voevoda_supabase_selectedSeats')
    console.log('💾 voevoda_supabase_selectedSeats:', savedSeats ? 'найден' : 'не найден')
    
    if (savedSeats) {
      try {
        const seats = JSON.parse(savedSeats)
        console.log('✅ Загружаем сохраненные места:', seats)
        setSelectedSeats(seats)
      } catch (error) {
        console.error('❌ Ошибка загрузки сохраненных мест:', error)
      }
    }
    
    const savedGeneralAccess = localStorage.getItem('voevoda_supabase_generalAccess')
    console.log('🎟️ voevoda_supabase_generalAccess:', savedGeneralAccess ? 'найден' : 'не найден')
    
    if (savedGeneralAccess) {
      try {
        const tickets = JSON.parse(savedGeneralAccess)
        console.log('✅ Загружаем сохраненные general access билеты:', tickets)
        setGeneralAccessTickets(tickets)
      } catch (error) {
        console.error('❌ Ошибка загрузки general access билетов:', error)
      }
    }
  }, [])

  // Сохраняем выбранные места в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('voevoda_supabase_selectedSeats', JSON.stringify(selectedSeats))
  }, [selectedSeats])
  
  // Сохраняем general access билеты в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('voevoda_supabase_generalAccess', JSON.stringify(generalAccessTickets))
  }, [generalAccessTickets])

  const GENERAL_ACCESS_MAX = 2000
  const GENERAL_ACCESS_PRICE = 500

  const currentGeneralAccessCount = generalAccessTickets.reduce((sum, ticket) => sum + ticket.quantity, 0)

  const handleZoneClick = (zoneId: string) => {
    setActiveZone(zoneId)
  }

  const handleGeneralAccessClick = () => {
    setShowGeneralAccessModal(true)
  }

  const handleAddGeneralAccess = () => {
    if (currentGeneralAccessCount + generalAccessQuantity <= GENERAL_ACCESS_MAX) {
      setGeneralAccessTickets(prev => {
        const existingTicket = prev.find(ticket => ticket.name === 'General Access')
        if (existingTicket) {
          // Update existing ticket quantity
          return prev.map(ticket => 
            ticket.name === 'General Access' 
              ? { ...ticket, quantity: ticket.quantity + generalAccessQuantity }
              : ticket
          )
        } else {
          // Create new ticket
          const newTicket: GeneralAccessTicket = {
            id: `general-${Date.now()}`,
            name: 'General Access',
            price: GENERAL_ACCESS_PRICE,
            quantity: generalAccessQuantity
          }
          return [...prev, newTicket]
        }
      })
      setShowGeneralAccessModal(false)
      setGeneralAccessQuantity(1)
    }
  }

  const handleRemoveGeneralAccess = (ticketId: string) => {
    setGeneralAccessTickets(prev => prev.filter(ticket => ticket.id !== ticketId))
  }

  const handleSeatClick = (seatId: string) => {
    if (!activeZone) return
    
    const currentSeats = selectedSeats[activeZone] || []
    const isSelected = currentSeats.includes(seatId)
    
    if (isSelected) {
      // Убираем место из выбранных
      const newSeats = currentSeats.filter(id => id !== seatId)
      setSelectedSeats(prev => ({ ...prev, [activeZone]: newSeats }))
      console.log('🎫 Место убрано из выбранных:', seatId)
    } else {
      // Добавляем место в выбранные
      const newSeats = [...currentSeats, seatId]
      setSelectedSeats(prev => ({ ...prev, [activeZone]: newSeats }))
      console.log('🎫 Место добавлено в выбранные:', seatId)
    }
  }

  const handleZoomIn = () => {
    seatmapRef.current?.zoomIn()
  }

  const handleZoomOut = () => {
    seatmapRef.current?.zoomOut()
  }

  const handleResetZoom = () => {
    seatmapRef.current?.resetTransform()
  }

  const handleBackToZones = () => {
    setActiveZone(null)
  }

  const handleRemoveSeat = (seatId: string) => {
    const zoneId = seatId.split('-')[0]
    const currentSeats = selectedSeats[zoneId] || []
    const newSeats = currentSeats.filter(id => id !== seatId)
    
    // Убираем место из выбранных
    setSelectedSeats(prev => ({ ...prev, [zoneId]: newSeats }))
    console.log('🎫 Место удалено:', seatId)
  }

  const currentZoneSeats = activeZone ? selectedSeats[activeZone] || [] : []
  const price = activeZone ? zonePrices[activeZone] || 0 : 0

  // Показываем загрузку, если цены еще не загружены
  if (pricingLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen w-full flex items-center justify-center">
        <div className="text-white text-xl">Загрузка цен...</div>
      </div>
    )
  }

  // Показываем ошибку, если не удалось загрузить цены
  if (pricingError) {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen w-full flex items-center justify-center">
        <div className="text-red-400 text-xl">Ошибка загрузки цен: {pricingError}</div>
      </div>
    )
  }

  // Обработчик перехода к checkout
  const handleCheckout = async () => {
    console.log('🛒 Начинаем процесс checkout')
    
    // Собираем все выбранные места
    const allSelectedSeats: string[] = []
    Object.values(selectedSeats).forEach(seats => {
      allSelectedSeats.push(...seats)
    })
    
    if (allSelectedSeats.length === 0 && generalAccessTickets.length === 0) {
      alert('Выберите места или билеты общего доступа')
      return
    }
    
    try {
      // Очищаем старые checkout_data перед созданием новых
      localStorage.removeItem('checkout_data')
      console.log('🗑️ Очищены старые checkout_data')
      
      // Собираем данные о выбранных местах с ценами
      const checkoutSeats: Array<{
        id: string
        zone: string
        row: string
        number: string
        price: number
      }> = []
      
      for (const [zoneId, seatIds] of Object.entries(selectedSeats)) {
        if (seatIds.length === 0) continue
        
        try {
          // Получаем данные о местах зоны
          const response = await fetch(`/api/zones/${zoneId}/seats`)
          if (!response.ok) continue
          
          const data = await response.json()
          const zoneSeats = data.seats || []
          
          // Находим выбранные места и добавляем их с реальными ценами
          seatIds.forEach(seatId => {
             const seatData = zoneSeats.find((seat: any) => seat.id === seatId)
             
             if (seatData) {
               checkoutSeats.push({
                 id: seatId,
                 zone: zoneId,
                 row: seatData.row,
                 number: seatData.number,
                 price: seatData.price || 0
               })
             }
          })
        } catch (error) {
          console.error('Error fetching seat prices for checkout:', error)
          // Fallback к старой логике с zonePrices
          seatIds.forEach(seatId => {
            const [, row, number] = seatId.split('-')
             const zonePrice = zonePrices[zoneId] || 0
             
             checkoutSeats.push({
               id: seatId,
               zone: zoneId,
               row: row || '',
               number: number || '',
               price: zonePrice
             })
          })
        }
      }
      
      // Подсчитываем общую стоимость
      const totalPrice = checkoutSeats.reduce((sum, seat) => sum + seat.price, 0) + 
                         generalAccessTickets.reduce((sum, ticket) => sum + (ticket.price * ticket.quantity), 0)
      const totalTickets = checkoutSeats.length + generalAccessTickets.reduce((sum, ticket) => sum + ticket.quantity, 0)
      
      // Сохраняем данные для checkout в localStorage
      const checkoutData = {
        seats: checkoutSeats,
        generalAccess: generalAccessTickets,
        totalPrice,
        totalTickets
      }
      
      console.log('💾 Сохраняем checkout_data:', checkoutData)
      localStorage.setItem('checkout_data', JSON.stringify(checkoutData))
      
      // Перенаправляем на страницу checkout
      console.log('🔄 Переходим на страницу checkout')
      router.push('/checkout')
    } catch (error) {
      console.error('Ошибка при подготовке к чекауту:', error)
      alert('Произошла ошибка при подготовке к оплате')
    }
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen w-full p-2 sm:p-4 lg:p-6 xl:p-8 flex flex-col pb-32 lg:pb-8">
      <div className="flex flex-col lg:flex-row justify-center items-stretch gap-3 sm:gap-4 lg:gap-6 w-full max-w-[95vw] lg:max-w-7xl mx-auto h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)]">
        <div className="w-full lg:w-3/4 relative bg-gray-800/80 backdrop-blur-lg rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-2xl border border-gray-700 p-2 sm:p-4 lg:p-6 xl:p-8 flex flex-col h-full">
          <AnimatePresence mode="wait">
            {!activeZone ? (
              <motion.div
                key="zones-view"
                variants={viewVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col h-full"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-6 lg:mb-8">
                  <div className="flex items-center gap-4">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white">
                      Voievoda (Supabase)
                    </h1>
                    <button
                      onClick={() => router.push('/profile')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    >
                      Profil
                    </button>
                  </div>
                  {showTooltip && (
                    <div className="bg-blue-500 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm">
                      Faceți clic pe o zonă pentru a selecta locuri
                      <button
                        onClick={() => setShowTooltip(false)}
                        className="ml-2 text-blue-200 hover:text-white"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col flex-1 min-h-0">
                  <LegendBar />
                  <div className="flex-1 flex items-center justify-center min-h-0">
                    <ArenaSVG 
                      onZoneClick={handleZoneClick} 
                      selectedSeats={selectedSeats} 
                      onGeneralAccessClick={handleGeneralAccessClick}
                      zonePrices={zonePrices}
                      generalAccessCount={currentGeneralAccessCount}
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="seats-view"
                variants={viewVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full h-full flex flex-col"
              >
                {/* Mobile Header */}
                <div className="sm:hidden flex items-center gap-6 mb-4">
                  <button
                    onClick={handleBackToZones}
                    className="flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold whitespace-nowrap"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Înapoi
                  </button>
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    Zona {activeZone}
                  </h1>
                </div>

                {/* Desktop Header */}
                <div className="hidden sm:flex flex-row justify-between items-center gap-4 mb-6 md:mb-8">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleBackToZones}
                      className="bg-gray-600 text-white px-3 lg:px-5 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold cursor-pointer"
                    >
                      ← Înapoi la zone
                    </button>
                    <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-white tracking-tight">
                      Zona {activeZone} (Supabase)
                    </h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleZoomIn}
                      className="w-10 h-10 text-xl text-white bg-gray-700/80 rounded-full hover:bg-gray-600/90 transition-colors cursor-pointer flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      onClick={handleZoomOut}
                      className="w-10 h-10 text-xl text-white bg-gray-700/80 rounded-full hover:bg-gray-600/90 transition-colors cursor-pointer flex items-center justify-center"
                    >
                      -
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="w-10 h-10 text-xl text-white bg-gray-700/80 rounded-full hover:bg-gray-600/90 transition-colors cursor-pointer flex items-center justify-center"
                    >
                      ⟲
                    </button>
                  </div>
                </div>
                
                {/* SeatMap Container */}
                <div className="relative flex-1 flex flex-col min-h-0">
                  <div className="relative flex-1 overflow-hidden">
                    <SeatMapSupabase
                  ref={seatmapRef}
                  zoneId={activeZone}
                  selectedSeats={currentZoneSeats}
                  onSeatClick={handleSeatClick}
                  eventId="550e8400-e29b-41d4-a716-446655440000"
                  price={price}
                />
                  </div>
                  {/* Mobile Zoom Controls */}
                  <div className="sm:hidden flex justify-center py-2 mt-[100px] shrink-0">
                    <div className="flex items-center gap-2 bg-gray-900/50 backdrop-blur-sm p-2 rounded-full">
                      <button
                        onClick={handleZoomIn}
                        className="w-10 h-10 text-xl text-white bg-gray-700/80 rounded-full hover:bg-gray-600/90 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        +
                      </button>
                      <button
                        onClick={handleZoomOut}
                        className="w-10 h-10 text-xl text-white bg-gray-700/80 rounded-full hover:bg-gray-600/90 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        -
                      </button>
                      <button
                        onClick={handleResetZoom}
                        className="w-10 h-10 text-xl text-white bg-gray-700/80 rounded-full hover:bg-gray-600/90 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        ⟲
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden lg:block lg:w-1/4 min-w-[280px] xl:min-w-[320px] h-full">
          <SelectedTickets
            selectedSeats={selectedSeats}
            zonePrices={zonePrices}
            onRemoveSeat={handleRemoveSeat}
            generalAccessTickets={generalAccessTickets}
            onGeneralAccessRemove={handleRemoveGeneralAccess}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

      {/* Mobile Selected Tickets - Always visible at bottom */}
      <MobileSelectedTickets
        selectedSeats={selectedSeats}
        zonePrices={zonePrices}
        onRemoveSeat={handleRemoveSeat}
        generalAccessTickets={generalAccessTickets}
        onGeneralAccessRemove={handleRemoveGeneralAccess}
        onCheckout={handleCheckout}
      />

      {/* General Access Modal */}
      {showGeneralAccessModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowGeneralAccessModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Acces General</h3>
              <button 
                onClick={() => setShowGeneralAccessModal(false)}
                className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Price Info */}
            <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Preț per bilet:</span>
                <span className="text-2xl font-bold text-green-400">{GENERAL_ACCESS_PRICE} Lei</span>
              </div>
            </div>
            
            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">Cantitate:</label>
              <div className="flex items-center justify-center space-x-4">
                <button 
                  onClick={() => setGeneralAccessQuantity(Math.max(1, generalAccessQuantity - 1))}
                  disabled={generalAccessQuantity <= 1}
                  className="w-12 h-12 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 flex items-center justify-center text-xl font-bold text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  −
                </button>
                <div className="bg-gray-700/50 rounded-xl px-6 py-3 min-w-[80px] text-center">
                  <span className="text-2xl font-bold text-white">{generalAccessQuantity}</span>
                </div>
                <button 
                  onClick={() => setGeneralAccessQuantity(Math.min(GENERAL_ACCESS_MAX - currentGeneralAccessCount, generalAccessQuantity + 1))}
                  disabled={generalAccessQuantity >= GENERAL_ACCESS_MAX - currentGeneralAccessCount}
                  className="w-12 h-12 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 flex items-center justify-center text-xl font-bold text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-blue-300 font-medium">Total:</span>
                <span className="text-2xl font-bold text-blue-400">
                  {generalAccessQuantity * GENERAL_ACCESS_PRICE} Lei
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowGeneralAccessModal(false)}
                className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors cursor-pointer"
              >
                Anulează
              </button>
              <button 
                onClick={handleAddGeneralAccess}
                disabled={currentGeneralAccessCount + generalAccessQuantity > GENERAL_ACCESS_MAX}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all shadow-lg disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
              >
                Adaugă în coș
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}