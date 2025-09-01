import React, { useState, useEffect } from 'react'

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

interface SeatWithPrice {
  id: string;
  zone: string;
  row: string;
  number: string;
  price: number;
}

interface MobileSelectedTicketsProps {
  selectedSeats: Record<string, string[]>
  zonePrices: Record<string, number>
  onRemoveSeat?: (seatId: string) => void
  generalAccessTickets?: GeneralAccessTicket[]
  onGeneralAccessRemove?: (ticketId: string) => void
  vipTickets?: VipTicket[]
  onVipRemove?: (ticketId: string) => void
  onCheckout?: () => void
}

const MobileSelectedTickets: React.FC<MobileSelectedTicketsProps> = ({ selectedSeats, zonePrices, onRemoveSeat, generalAccessTickets = [], onGeneralAccessRemove, vipTickets = [], onVipRemove, onCheckout }) => {
  const [seatsWithPrices, setSeatsWithPrices] = useState<SeatWithPrice[]>([])
  const [loading, setLoading] = useState(false)

  // Загружаем данные о местах с реальными ценами
  useEffect(() => {
    async function fetchSeatPrices() {
      setLoading(true)
      const allSeats: SeatWithPrice[] = []
      
      try {
        for (const [zoneId, seatIds] of Object.entries(selectedSeats)) {
          if (seatIds.length === 0) continue
          
          // Получаем данные о местах зоны
          const response = await fetch(`/api/zones/${zoneId}/seats`)
          if (!response.ok) continue
          
          const data = await response.json()
          const zoneSeats = data.seats || []
          
          // Находим выбранные места и добавляем их с реальными ценами
          seatIds.forEach(seatId => {
            const seatData = zoneSeats.find((seat: any) => seat.id === seatId)
            if (seatData) {
              allSeats.push({
                id: seatId,
                zone: zoneId,
                row: seatData.row,
                number: seatData.number,
                price: seatData.price || 0
              })
            }
          })
        }
        
        setSeatsWithPrices(allSeats)
      } catch (error) {
        console.error('Error fetching seat prices:', error)
        // Fallback к старой логике с zonePrices
        const fallbackSeats = Object.entries(selectedSeats).flatMap(([zoneId, seatIds]) => {
          const zonePrice = zonePrices[zoneId] || 0
          return seatIds.map(seatId => {
            // Не можем парсить ID, так как это теперь TEXT ID из базы
            // Используем пустые значения для row/number в fallback режиме
            return {
              id: seatId,
              zone: zoneId,
              row: '',
              number: '',
              price: zonePrice
            }
          })
        })
        setSeatsWithPrices(fallbackSeats)
      } finally {
        setLoading(false)
      }
    }

    fetchSeatPrices()
  }, [selectedSeats, zonePrices])

  const allTickets = seatsWithPrices

  const totalPrice = allTickets.reduce((sum, ticket) => sum + ticket.price, 0) + 
                     generalAccessTickets.reduce((sum, ticket) => sum + (ticket.price * ticket.quantity), 0) +
                     vipTickets.reduce((sum, ticket) => sum + (ticket.price * ticket.quantity), 0)
  const totalTickets = allTickets.length + generalAccessTickets.reduce((sum, ticket) => sum + ticket.quantity, 0) + vipTickets.reduce((sum, ticket) => sum + ticket.quantity, 0)

  if (totalTickets === 0) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 block lg:hidden" style={{pointerEvents: 'auto'}}>
      <div className="bg-gray-800/95 rounded-t-xl sm:rounded-t-2xl shadow-2xl border border-gray-700 text-white w-full">
        <div className="p-3 sm:p-4">
          {totalTickets > 0 ? (
                          <>
                <div className="font-bold uppercase text-base sm:text-[18px] leading-tight mb-2 sm:mb-3 text-white" style={{fontFamily: 'Inter, var(--font-geist-sans), Arial, sans-serif'}}>
                  {totalTickets} BILETE: {totalPrice} LEI
                </div>
              <div className="flex flex-row gap-1.5 sm:gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {allTickets.map(({ zone, id, price, row, number }) => (
                  <div key={zone + id} className="flex flex-col min-w-[120px] sm:min-w-[140px] bg-gray-700/80 rounded-lg shadow px-1.5 sm:px-2 py-1 sm:py-1.5 mr-1 relative border border-gray-600/60 flex-shrink-0">
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <span className="bg-blue-900 text-blue-200 text-[10px] sm:text-[11px] font-extrabold uppercase rounded px-1 sm:px-1.5 py-0.5" style={{fontFamily: 'Inter, var(--font-geist-sans), Arial, sans-serif'}}>
                        ZONA {zone}
                      </span>
                      {onRemoveSeat && (
                        <button
                          className="ml-1 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200 cursor-pointer border border-red-500/30 shrink-0"
                          onClick={() => onRemoveSeat(id)}
                          aria-label="Șterge biletul"
                        >
                          <svg width="10" height="10" className="sm:w-3 sm:h-3" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-row items-center gap-0.5 sm:gap-1">
                      <span className="text-white text-[10px] sm:text-[11px] font-black uppercase truncate" style={{fontFamily: 'Inter, var(--font-geist-sans), Arial, sans-serif'}}>
                        Rând: {row}, Loc: {parseInt(number, 10)}
                      </span>
                    </div>
                    <div className="text-green-400 font-bold text-[11px] sm:text-[13px] mt-0.5">{price} Lei</div>
                  </div>
                ))}
                
                {generalAccessTickets.map((ticket) => (
                  <div key={ticket.id} className="flex flex-col min-w-[120px] sm:min-w-[140px] bg-gray-700/80 rounded-lg shadow px-1.5 sm:px-2 py-1 sm:py-1.5 mr-1 relative border border-gray-600/60 flex-shrink-0">
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <span className="bg-blue-900 text-blue-200 text-[10px] sm:text-[11px] font-extrabold uppercase rounded px-1 sm:px-1.5 py-0.5" style={{fontFamily: 'Inter, var(--font-geist-sans), Arial, sans-serif'}}>
                        {ticket.name}
                      </span>
                      {onGeneralAccessRemove && (
                        <button
                          className="ml-1 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200 cursor-pointer border border-red-500/30 shrink-0"
                          onClick={() => onGeneralAccessRemove(ticket.id)}
                          aria-label="Șterge biletul"
                        >
                          <svg width="10" height="10" className="sm:w-3 sm:h-3" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-row items-center gap-0.5 sm:gap-1">
                      <span className="text-white text-[10px] sm:text-[11px] font-black uppercase truncate" style={{fontFamily: 'Inter, var(--font-geist-sans), Arial, sans-serif'}}>
                        {ticket.quantity} bilet{ticket.quantity > 1 ? 'e' : ''}
                      </span>
                    </div>
                    <div className="text-green-400 font-bold text-[11px] sm:text-[13px] mt-0.5">{ticket.price * ticket.quantity} Lei</div>
                  </div>
                ))}
                
                {vipTickets.map((ticket) => (
                  <div key={ticket.id} className="flex flex-col min-w-[120px] sm:min-w-[140px] bg-purple-700/80 rounded-lg shadow px-1.5 sm:px-2 py-1 sm:py-1.5 mr-1 relative border border-purple-600/60 flex-shrink-0">
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <span className="bg-purple-900 text-purple-200 text-[10px] sm:text-[11px] font-extrabold uppercase rounded px-1 sm:px-1.5 py-0.5" style={{fontFamily: 'Inter, var(--font-geist-sans), Arial, sans-serif'}}>
                        {ticket.name}
                      </span>
                      {onVipRemove && (
                        <button
                          className="ml-1 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200 cursor-pointer border border-red-500/30 shrink-0"
                          onClick={() => onVipRemove(ticket.id)}
                          aria-label="Șterge biletul"
                        >
                          <svg width="10" height="10" className="sm:w-3 sm:h-3" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-row items-center gap-0.5 sm:gap-1">
                      <span className="text-white text-[10px] sm:text-[11px] font-black uppercase truncate" style={{fontFamily: 'Inter, var(--font-geist-sans), Arial, sans-serif'}}>
                        Întreaga zonă
                      </span>
                    </div>
                    <div className="text-green-400 font-bold text-[11px] sm:text-[13px] mt-0.5">{ticket.price * ticket.quantity} Lei</div>
                  </div>
                ))}
              </div>
              <button 
                onClick={onCheckout}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg transition-colors mt-2 sm:mt-3 text-sm sm:text-base cursor-pointer"
                disabled={totalTickets === 0}
              >
                Cumpără
              </button>
            </>
          ) : (
            <>
              <div className="font-bold uppercase text-base sm:text-[18px] leading-tight mb-2 sm:mb-3 text-white" style={{fontFamily: 'Inter, var(--font-geist-sans), Arial, sans-serif'}}>
                BILETE SELECTATE
              </div>
              <div className="text-center py-3 sm:py-4">
                <p className="text-sm text-gray-400">Nici un loc selectat</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default MobileSelectedTickets