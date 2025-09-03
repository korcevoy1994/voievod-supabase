'use client'

import React, { useState, useEffect, useCallback, useMemo, memo, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'

// Lazy load heavy components for better performance
const ArenaSVG = lazy(() => import('@/components/ArenaSVG'))
const SeatMapSupabase = lazy(() => import('@/components/SeatMapSupabase'))
const SelectedTickets = lazy(() => import('@/components/SelectedTickets'))
const MobileSelectedTickets = lazy(() => import('@/components/MobileSelectedTickets'))
import LegendBar from '@/components/LegendBar'
import { useEventPricing } from '@/lib/hooks/useSupabaseData'
import { useOptimizedEventPricing, useOptimizedZones, useOptimizedZoneColors, useOptimizedVipZones } from '@/lib/hooks/useOptimizedData'
import { getOrCreateSessionUserId } from '@/lib/userSession'
import { logger } from '@/lib/logger'
import { CacheStats } from '@/components/dev/CacheStats'

interface VipTicket {
  id: string;
  name: string;
  price: number;
  quantity: number;
  zone: string;
}

const viewVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

export default function VoevodaSupabaseEventPage() {
  const router = useRouter()
  // Încărcăm prețurile din baza de date cu cache optimizat
  const { data: pricingData, loading: pricingLoading, error: pricingError } = useOptimizedEventPricing('550e8400-e29b-41d4-a716-446655440000')
  const zonePrices = pricingData?.zonePrices || pricingData || {}
  
  // Предзагружаем зоны и цвета для лучшей производительности
  const { data: zones } = useOptimizedZones()
  const { data: zoneColors } = useOptimizedZoneColors()
  const { data: vipZonesData, loading: vipZonesLoading } = useOptimizedVipZones('550e8400-e29b-41d4-a716-446655440000')
  const [activeZone, setActiveZone] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(true)
  const [selectedSeats, setSelectedSeats] = useState<Record<string, string[]>>({})
  const [vipTickets, setVipTickets] = useState<VipTicket[]>([])
  const [showVipModal, setShowVipModal] = useState(false)
  const [selectedVipZone, setSelectedVipZone] = useState<string | null>(null)
  const [vipQuantity, setVipQuantity] = useState(1)
  const seatmapRef = React.useRef<ReactZoomPanPinchRef | null>(null)

  // Загружаем выбранные места и general access билеты из localStorage при монтировании
  useEffect(() => {
    // Приоритет у актуального состояния voevoda_supabase_selectedSeats
    const savedSeats = localStorage.getItem('voevoda_supabase_selectedSeats')
    
    if (savedSeats) {
      try {
        const seats = JSON.parse(savedSeats)
        setSelectedSeats(seats)
        return // Используем актуальное состояние
      } catch (error) {
        // Ошибка загрузки сохраненных мест
      }
    }
    
    // Только если нет актуального состояния, проверяем checkout_data (возврат с checkout)
    const checkoutData = localStorage.getItem('checkout_data')
    
    if (checkoutData) {
      try {
        const data = JSON.parse(checkoutData)
        
        // Восстанавливаем выбранные места из checkout данных
        const restoredSeats: Record<string, string[]> = {}
        
        data.seats?.forEach((seat: any) => {
          if (!restoredSeats[seat.zone]) {
            restoredSeats[seat.zone] = []
          }
          restoredSeats[seat.zone].push(seat.id)
        })
        setSelectedSeats(restoredSeats)
      } catch (error) {
        // Ошибка восстановления данных из checkout
      }
    }
  }, [])

  // Сохраняем выбранные места в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('voevoda_supabase_selectedSeats', JSON.stringify(selectedSeats))
  }, [selectedSeats])

  // Загружаем VIP билеты из localStorage при монтировании
  useEffect(() => {
    const savedVipTickets = localStorage.getItem('voevoda_supabase_vipTickets')
    if (savedVipTickets) {
      try {
        const tickets = JSON.parse(savedVipTickets)
        setVipTickets(tickets)
      } catch (error) {
        // Ошибка загрузки VIP билетов
      }
    }
  }, [])

  // Сохраняем VIP билеты в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('voevoda_supabase_vipTickets', JSON.stringify(vipTickets))
  }, [vipTickets])

  // Мемоизированные выбранные места для активной зоны
  const activeZoneSelectedSeats = useMemo(() => 
    activeZone ? selectedSeats[activeZone] || [] : [], 
    [selectedSeats, activeZone]
  )

  // Мемоизированный общий список всех выбранных мест
  const allSelectedSeats = useMemo(() => 
    Object.values(selectedSeats).flat(), 
    [selectedSeats]
  )

  const handleZoneClick = useCallback((zoneId: string) => {
    setActiveZone(zoneId)
  }, [])



  const handleVipZoneClick = useCallback((vipZone: string) => {
    setSelectedVipZone(vipZone)
    setShowVipModal(true)
    setVipQuantity(1)
  }, [])



  // VIP зоны данные из API
  const VIP_ZONES_DATA: Record<string, { name: string; price: number; maxSeats: number }> = useMemo(() => {
    if (!vipZonesData?.data?.vipZones) return {}
    
    const zones: Record<string, { name: string; price: number; maxSeats: number }> = {}
    vipZonesData.data.vipZones.forEach((zone: any) => {
      zones[zone.zone] = {
        name: zone.name,
        price: zone.price,
        maxSeats: zone.totalSeats // Используем totalSeats вместо availableSeats
      }
    })
    return zones
  }, [vipZonesData])

  const handleAddVipTicket = useCallback(() => {
    if (!selectedVipZone) {
      return
    }
    
    const vipData = VIP_ZONES_DATA[selectedVipZone as keyof typeof VIP_ZONES_DATA]
    
    if (!vipData) {
      alert('Данные VIP зоны не найдены')
      return
    }

    // Проверяем, не куплена ли уже эта VIP зона
    const existingTicket = vipTickets.find(ticket => ticket.zone === selectedVipZone)
    if (existingTicket) {
      alert('Эта VIP зона уже добавлена в корзину')
      return
    }

    // Добавляем целую VIP зону (количество всегда 1 зона)
    const newTicket: VipTicket = {
      id: `vip-${selectedVipZone}-${Date.now()}`,
      name: vipData.name,
      price: vipData.price, // Цена за всю зону
      quantity: 1, // Всегда 1 зона
      zone: selectedVipZone
    }
    
    setVipTickets(prev => [...prev, newTicket])
    setShowVipModal(false)
    setVipQuantity(1)
    setSelectedVipZone(null)
  }, [selectedVipZone, vipTickets, VIP_ZONES_DATA])

  const handleRemoveVipTicket = useCallback((ticketId: string) => {
    setVipTickets(prev => prev.filter(ticket => ticket.id !== ticketId))
  }, [])

  const handleSeatClick = useCallback((seatId: string) => {
    if (!activeZone) return
    
    const currentSeats = selectedSeats[activeZone] || []
    const isSelected = currentSeats.includes(seatId)
    
    let updatedSeats: Record<string, string[]>
    
    if (isSelected) {
      // Убираем место из выбранных
      const newSeats = currentSeats.filter(id => id !== seatId)
      updatedSeats = { ...selectedSeats, [activeZone]: newSeats }
      
      // Если в зоне не осталось мест, удаляем зону полностью
      if (newSeats.length === 0) {
        delete updatedSeats[activeZone]
      }
    } else {
      // Добавляем место в выбранные
      const newSeats = [...currentSeats, seatId]
      updatedSeats = { ...selectedSeats, [activeZone]: newSeats }
    }
    
    setSelectedSeats(updatedSeats)
    
    // Обновляем localStorage сразу после изменения состояния
    localStorage.setItem('voevoda_supabase_selectedSeats', JSON.stringify(updatedSeats))
  }, [activeZone, selectedSeats])

  const handleZoomIn = useCallback(() => {
    seatmapRef.current?.zoomIn()
  }, [])

  const handleZoomOut = useCallback(() => {
    seatmapRef.current?.zoomOut()
  }, [])

  const handleResetZoom = useCallback(() => {
    seatmapRef.current?.resetTransform()
  }, [])

  const handleBackToZones = useCallback(() => {
    setActiveZone(null)
  }, [])

  const handleRemoveSeat = useCallback((seatId: string) => {
    // Ищем зону, в которой находится это место
    let foundZoneId: string | null = null
    for (const [zoneId, seatIds] of Object.entries(selectedSeats)) {
      if (seatIds.includes(seatId)) {
        foundZoneId = zoneId
        break
      }
    }
    
    if (!foundZoneId) return
    
    const currentSeats = selectedSeats[foundZoneId] || []
    const newSeats = currentSeats.filter(id => id !== seatId)
    
    // Убираем место из выбранных
    const updatedSeats = { ...selectedSeats, [foundZoneId]: newSeats }
    
    // Если в зоне не осталось мест, удаляем зону полностью
    if (newSeats.length === 0) {
      delete updatedSeats[foundZoneId]
    }
    
    setSelectedSeats(updatedSeats)
    
    // Обновляем localStorage сразу после изменения состояния
    localStorage.setItem('voevoda_supabase_selectedSeats', JSON.stringify(updatedSeats))

  }, [selectedSeats])

  // Мемоизированные значения для текущей зоны
  const currentZoneSeats = useMemo(() => 
    activeZone ? selectedSeats[activeZone] || [] : [], 
    [activeZone, selectedSeats]
  )
  
  const price = useMemo(() => 
    activeZone ? zonePrices[activeZone] || 0 : 0, 
    [activeZone, zonePrices]
  )

  // Обработчик перехода к checkout
  const handleCheckout = useCallback(async () => {

    
    // Собираем все выбранные места
    const allSelectedSeats: string[] = []
    Object.values(selectedSeats).forEach(seats => {
      allSelectedSeats.push(...seats)
    })
    
    if (allSelectedSeats.length === 0 && vipTickets.length === 0) {
      alert('Выберите места или VIP билеты')
      return
    }
    
    try {
      // Очищаем старые checkout_data перед созданием новых
      localStorage.removeItem('checkout_data')

      
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
          // Error fetching seat prices for checkout
          // Fallback к старой логике с zonePrices
          seatIds.forEach(seatId => {
            // Не можем парсить ID, так как это теперь TEXT ID из базы
            const zonePrice = zonePrices[zoneId] || 0
             
             checkoutSeats.push({
               id: seatId,
               zone: zoneId,
               row: '',
               number: '',
               price: zonePrice
             })
          })
        }
      }
      
      // Подсчитываем общую стоимость
      const totalPrice = checkoutSeats.reduce((sum, seat) => sum + seat.price, 0) + 
                         vipTickets.reduce((sum, ticket) => sum + (ticket.price * ticket.quantity), 0)
      const totalTickets = checkoutSeats.length + vipTickets.reduce((sum, ticket) => sum + ticket.quantity, 0)
      
      // Сохраняем данные для checkout в localStorage
      const checkoutData = {
        seats: checkoutSeats,
        vipTickets: vipTickets,
        totalPrice,
        totalTickets
      }
      

      localStorage.setItem('checkout_data', JSON.stringify(checkoutData))
      
      // Перенаправляем на страницу checkout

      router.push('/checkout')
    } catch (error) {
      // Ошибка при подготовке к чекауту
      alert('Произошла ошибка при подготовке к оплате')
    }
  }, [selectedSeats, vipTickets, zonePrices, router])

  // Показываем загрузку, если цены еще не загружены
  if (pricingLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen w-full flex items-center justify-center">
        <div className="text-white text-xl">Încărcare prețuri...</div>
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
                      Bilete
                    </h1>

                  </div>

                </div>
                <div className="flex flex-col flex-1 min-h-0">
                  <LegendBar />
                  <div className="flex-1 flex items-center justify-center min-h-0">
                    <Suspense fallback={
                      <div className="flex items-center justify-center w-full h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                      </div>
                    }>
                      <ArenaSVG 
                        onZoneClick={handleZoneClick} 
                        selectedSeats={selectedSeats} 
                        onVipZoneClick={handleVipZoneClick}
                        zonePrices={zonePrices}
                        zoneColors={zoneColors?.zoneColors}
                        zoneStatus={zoneColors?.zoneStatus}
                        vipZonesData={vipZonesData}
                        vipTickets={vipTickets}
                      />
                    </Suspense>
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
                      Zona {activeZone}
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
                    {activeZone && (
                      <Suspense fallback={
                        <div className="flex items-center justify-center w-full h-full">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        </div>
                      }>
                        <SeatMapSupabase
                          ref={seatmapRef}
                          zoneId={activeZone}
                          selectedSeats={currentZoneSeats}
                          onSeatClick={handleSeatClick}
                          eventId="550e8400-e29b-41d4-a716-446655440000"
                        />
                      </Suspense>
                    )}
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
          <Suspense fallback={
            <div className="flex items-center justify-center w-full h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            </div>
          }>
            <SelectedTickets
              selectedSeats={selectedSeats}
              zonePrices={zonePrices}
              onRemoveSeat={handleRemoveSeat}
              vipTickets={vipTickets}
              onVipRemove={handleRemoveVipTicket}
              onCheckout={handleCheckout}
            />
          </Suspense>
        </div>
      </div>

      {/* Mobile Selected Tickets - Always visible at bottom */}
      <Suspense fallback={
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
          </div>
        </div>
      }>
        <MobileSelectedTickets
          selectedSeats={selectedSeats}
          zonePrices={zonePrices}
          onRemoveSeat={handleRemoveSeat}
          vipTickets={vipTickets}
          onVipRemove={handleRemoveVipTicket}
          onCheckout={handleCheckout}
        />
      </Suspense>



      {/* VIP Modal */}
      {showVipModal && selectedVipZone && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowVipModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">{VIP_ZONES_DATA[selectedVipZone]?.name || `Zona VIP ${selectedVipZone}`}</h3>
              <button 
                onClick={() => setShowVipModal(false)}
                className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Zone Info */}
            <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
              <div className="text-center mb-4">
                <div className="text-gray-300 text-sm mb-2">Se cumpără întreaga zonă</div>
                <div className="text-white text-lg font-semibold">
                  {VIP_ZONES_DATA[selectedVipZone]?.maxSeats || 0} locuri
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Preț pentru întreaga zonă:</span>
                <span className="text-2xl font-bold text-yellow-400">{VIP_ZONES_DATA[selectedVipZone]?.price || 0} Lei</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowVipModal(false)}
                className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors cursor-pointer"
              >
                Anulează
              </button>
              <button 
                onClick={handleAddVipTicket}
                disabled={vipTickets.some(ticket => ticket.zone === selectedVipZone)}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all shadow-lg disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
              >
                {vipTickets.some(ticket => ticket.zone === selectedVipZone) ? 'Deja în coș' : 'Cumpără zona'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Компонент статистики кэша для разработки */}
      <CacheStats position="bottom-right" />
    </div>
  )
}