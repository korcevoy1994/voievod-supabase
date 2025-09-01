'use client'

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'
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
import { useOptimizedEventPricing, useOptimizedZones, useOptimizedZoneColors, useOptimizedVipZones } from '@/lib/hooks/useOptimizedData'
import { getOrCreateSessionUserId } from '@/lib/userSession'
import { logger } from '@/lib/logger'
import { CacheStats } from '@/components/dev/CacheStats'

interface GeneralAccessTicket {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

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
  const [generalAccessTickets, setGeneralAccessTickets] = useState<GeneralAccessTicket[]>([])
  const [showGeneralAccessModal, setShowGeneralAccessModal] = useState(false)
  const [generalAccessQuantity, setGeneralAccessQuantity] = useState(1)
  const [vipTickets, setVipTickets] = useState<VipTicket[]>([])
  const [showVipModal, setShowVipModal] = useState(false)
  const [selectedVipZone, setSelectedVipZone] = useState<string | null>(null)
  const [vipQuantity, setVipQuantity] = useState(1)
  const seatmapRef = React.useRef<ReactZoomPanPinchRef | null>(null)

  // Загружаем выбранные места и general access билеты из localStorage при монтировании
  useEffect(() => {
    logger.dev('Загрузка данных при монтировании компонента')
    
    // Сначала проверяем, есть ли данные checkout (возврат с checkout)
    const checkoutData = localStorage.getItem('checkout_data')
    logger.dev('checkout_data найден:', !!checkoutData)
    
    if (checkoutData) {
      try {
        const data = JSON.parse(checkoutData)
        logger.dev('Восстанавливаем данные из checkout_data', data)
        
        // Восстанавливаем выбранные места из checkout данных
         const restoredSeats: Record<string, string[]> = {}
         
         data.seats?.forEach((seat: any) => {
           if (!restoredSeats[seat.zone]) {
             restoredSeats[seat.zone] = []
           }
           restoredSeats[seat.zone].push(seat.id)
         })
         setSelectedSeats(restoredSeats)
         logger.dev('Восстановлены места', restoredSeats)
         
         // Восстанавливаем general access билеты
         if (data.generalAccess) {
           setGeneralAccessTickets(data.generalAccess)
           logger.dev('Восстановлены general access билеты', data.generalAccess)
         }
        
        return // Выходим, чтобы не загружать из других источников
      } catch (error) {
        logger.error('Ошибка восстановления данных из checkout', error)
      }
    }
    
    // Если нет checkout данных, загружаем из обычного localStorage
    const savedSeats = localStorage.getItem('voevoda_supabase_selectedSeats')
    logger.dev('voevoda_supabase_selectedSeats найден:', !!savedSeats)
    
    if (savedSeats) {
      try {
        const seats = JSON.parse(savedSeats)
        logger.dev('Загружаем сохраненные места', seats)
        setSelectedSeats(seats)
      } catch (error) {
        logger.error('Ошибка загрузки сохраненных мест', error)
      }
    }
    
    const savedGeneralAccess = localStorage.getItem('voevoda_supabase_generalAccess')
    logger.dev('voevoda_supabase_generalAccess найден:', !!savedGeneralAccess)
    
    if (savedGeneralAccess) {
      try {
        const tickets = JSON.parse(savedGeneralAccess)
        logger.dev('Загружаем сохраненные general access билеты', tickets)
        setGeneralAccessTickets(tickets)
      } catch (error) {
        logger.error('Ошибка загрузки general access билетов', error)
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

  const currentGeneralAccessCount = useMemo(() => 
    generalAccessTickets.reduce((sum, ticket) => sum + ticket.quantity, 0), 
    [generalAccessTickets]
  )

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

  const handleGeneralAccessClick = useCallback(() => {
    // Определяем, это VIP зона или General Access
    // Если это VIP зона, открываем VIP модальное окно
    // Пока что открываем General Access модальное окно для всех
    setShowGeneralAccessModal(true)
  }, [])

  const handleVipZoneClick = useCallback((vipZone: string) => {
    setSelectedVipZone(vipZone)
    setShowVipModal(true)
    setVipQuantity(1)
  }, [])

  const handleAddGeneralAccess = useCallback(() => {
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
  }, [currentGeneralAccessCount, generalAccessQuantity, GENERAL_ACCESS_MAX, GENERAL_ACCESS_PRICE])

  const handleRemoveGeneralAccess = useCallback((ticketId: string) => {
    setGeneralAccessTickets(prev => prev.filter(ticket => ticket.id !== ticketId))
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
    
    if (isSelected) {
      // Убираем место из выбранных
      const newSeats = currentSeats.filter(id => id !== seatId)
      setSelectedSeats(prev => ({ ...prev, [activeZone]: newSeats }))
      logger.dev('Место убрано из выбранных', seatId)
    } else {
      // Добавляем место в выбранные
      const newSeats = [...currentSeats, seatId]
      setSelectedSeats(prev => ({ ...prev, [activeZone]: newSeats }))
      logger.dev('Место добавлено в выбранные', seatId)
    }
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
    setSelectedSeats(prev => ({ ...prev, [foundZoneId]: newSeats }))
    logger.dev('Место удалено', seatId)
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
    logger.dev('Начинаем процесс checkout')
    
    // Собираем все выбранные места
    const allSelectedSeats: string[] = []
    Object.values(selectedSeats).forEach(seats => {
      allSelectedSeats.push(...seats)
    })
    
    if (allSelectedSeats.length === 0 && generalAccessTickets.length === 0 && vipTickets.length === 0) {
      alert('Выберите места или билеты общего доступа')
      return
    }
    
    try {
      // Очищаем старые checkout_data перед созданием новых
      localStorage.removeItem('checkout_data')
      logger.dev('Очищены старые checkout_data')
      
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
          logger.error('Error fetching seat prices for checkout', error)
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
                         generalAccessTickets.reduce((sum, ticket) => sum + (ticket.price * ticket.quantity), 0) +
                         vipTickets.reduce((sum, ticket) => sum + (ticket.price * ticket.quantity), 0)
      const totalTickets = checkoutSeats.length + generalAccessTickets.reduce((sum, ticket) => sum + ticket.quantity, 0) + vipTickets.reduce((sum, ticket) => sum + ticket.quantity, 0)
      
      // Сохраняем данные для checkout в localStorage
      const checkoutData = {
        seats: checkoutSeats,
        generalAccess: generalAccessTickets,
        vipTickets: vipTickets,
        totalPrice,
        totalTickets
      }
      
      logger.dev('Сохраняем checkout_data', checkoutData)
      localStorage.setItem('checkout_data', JSON.stringify(checkoutData))
      
      // Перенаправляем на страницу checkout
      logger.dev('Переходим на страницу checkout')
      router.push('/checkout')
    } catch (error) {
      logger.error('Ошибка при подготовке к чекауту', error)
      alert('Произошла ошибка при подготовке к оплате')
    }
  }, [selectedSeats, generalAccessTickets, vipTickets, zonePrices, router])

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
                      Voievoda
                    </h1>

                  </div>

                </div>
                <div className="flex flex-col flex-1 min-h-0">
                  <LegendBar />
                  <div className="flex-1 flex items-center justify-center min-h-0">
                    <ArenaSVG 
                      onZoneClick={handleZoneClick} 
                      selectedSeats={selectedSeats} 
                      onGeneralAccessClick={handleGeneralAccessClick}
                      onVipZoneClick={handleVipZoneClick}
                      zonePrices={zonePrices}
                      generalAccessCount={currentGeneralAccessCount}
                      zoneColors={zoneColors?.zoneColors}
                      vipZonesData={vipZonesData}
                      vipTickets={vipTickets}
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
                      <SeatMapSupabase
                        ref={seatmapRef}
                        zoneId={activeZone}
                        selectedSeats={currentZoneSeats}
                        onSeatClick={handleSeatClick}
                        eventId="550e8400-e29b-41d4-a716-446655440000"
                      />
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
          <SelectedTickets
            selectedSeats={selectedSeats}
            zonePrices={zonePrices}
            onRemoveSeat={handleRemoveSeat}
            generalAccessTickets={generalAccessTickets}
            onGeneralAccessRemove={handleRemoveGeneralAccess}
            vipTickets={vipTickets}
            onVipRemove={handleRemoveVipTicket}
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
        vipTickets={vipTickets}
        onVipRemove={handleRemoveVipTicket}
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

            {/* Total */}
            <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-blue-300 font-medium">Total:</span>
                <span className="text-2xl font-bold text-blue-400">
                   {selectedVipZone ? (VIP_ZONES_DATA[selectedVipZone]?.price || 0) : 0} Lei
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