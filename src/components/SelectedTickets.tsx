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

interface SelectedTicketsProps {
  selectedSeats: Record<string, string[]>
  zonePrices: Record<string, number>
  onRemoveSeat?: (seatId: string) => void
  generalAccessTickets?: GeneralAccessTicket[]
  onGeneralAccessRemove?: (ticketId: string) => void
  vipTickets?: VipTicket[]
  onVipRemove?: (ticketId: string) => void
  onCheckout?: () => void
}

const SelectedTickets: React.FC<SelectedTicketsProps> = ({ selectedSeats, zonePrices, onRemoveSeat, generalAccessTickets = [], onGeneralAccessRemove, vipTickets = [], onVipRemove, onCheckout }) => {
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

  return (
    /* Desktop version: always visible */
    <div className="bg-gray-800/95 rounded-xl lg:rounded-t-2xl shadow-2xl border border-gray-700 text-white w-full h-full flex flex-col">
      <div className="p-3 sm:p-4 lg:p-6 flex-1 overflow-y-auto min-h-0">
        <h3 className="font-bold text-lg lg:text-xl mb-3 lg:mb-4 text-white">Bilete selectate</h3>
        {totalTickets > 0 ? (
          <div className="flex flex-col gap-2 sm:gap-3 lg:gap-4">
            {allTickets.map(({ zone, id, price, row, number }) => (
              <div key={zone + id} className="flex items-center bg-gray-700/60 rounded-lg lg:rounded-xl px-3 lg:px-4 py-2 lg:py-3 relative group shadow-lg border border-gray-600/50">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs lg:text-sm uppercase tracking-wide text-blue-300 mb-1">ZONA {zone}</div>
                  <div className="text-xs lg:text-sm text-gray-200 mb-1 truncate">Rând <span className="font-bold text-white">{row}</span>, Loc <span className="font-bold text-white">{parseInt(number, 10)}</span></div>
                  <div className="text-xs lg:text-sm font-semibold text-green-400">{price} Lei</div>
                </div>
                {onRemoveSeat && (
                  <button
                    className="ml-2 lg:ml-3 w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200 cursor-pointer border border-red-500/30 flex-shrink-0"
                    onClick={() => onRemoveSeat(id)}
                    aria-label="Șterge biletul"
                  >
                    <svg width="12" height="12" className="lg:w-4 lg:h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
            
            {generalAccessTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center bg-gray-700/60 rounded-lg lg:rounded-xl px-3 lg:px-4 py-2 lg:py-3 relative group shadow-lg border border-gray-600/50">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs lg:text-sm uppercase tracking-wide text-blue-300 mb-1">{ticket.name}</div>
                  <div className="text-xs lg:text-sm text-gray-200 mb-1 truncate">{ticket.quantity} bilet{ticket.quantity > 1 ? 'e' : ''}</div>
                  <div className="text-xs lg:text-sm font-semibold text-green-400">{ticket.price * ticket.quantity} Lei</div>
                </div>
                {onGeneralAccessRemove && (
                  <button
                    className="ml-2 lg:ml-3 w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200 cursor-pointer border border-red-500/30 flex-shrink-0"
                    onClick={() => onGeneralAccessRemove(ticket.id)}
                    aria-label="Șterge biletul"
                  >
                    <svg width="12" height="12" className="lg:w-4 lg:h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
            
            {vipTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center bg-purple-700/60 rounded-lg lg:rounded-xl px-3 lg:px-4 py-2 lg:py-3 relative group shadow-lg border border-purple-600/50">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs lg:text-sm uppercase tracking-wide text-purple-300 mb-1">{ticket.name}</div>
                  <div className="text-xs lg:text-sm text-gray-200 mb-1 truncate">Întreaga zonă</div>
                  <div className="text-xs lg:text-sm font-semibold text-green-400">{ticket.price * ticket.quantity} Lei</div>
                </div>
                {onVipRemove && (
                  <button
                    className="ml-2 lg:ml-3 w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-200 cursor-pointer border border-red-500/30 flex-shrink-0"
                    onClick={() => onVipRemove(ticket.id)}
                    aria-label="Șterge biletul"
                  >
                    <svg width="12" height="12" className="lg:w-4 lg:h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 lg:py-8">
            <p className="text-sm text-gray-400">Nici un loc selectat</p>
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4 lg:p-6 pt-0 flex-shrink-0 sticky bottom-0 bg-gray-800/95">
        {totalTickets > 0 && (
          <div className="mt-2 lg:mt-4 pt-2 lg:pt-4 border-t border-gray-600 font-bold text-base lg:text-lg text-left uppercase text-white bg-gray-700/30 rounded-lg px-3 lg:px-4 py-2 lg:py-3 mb-4">
            {totalTickets} BILETE: <span className="text-green-400">{totalPrice} Lei</span>
          </div>
        )}
        <button 
          onClick={onCheckout}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 lg:py-3 px-3 lg:px-4 rounded-lg transition-colors text-sm lg:text-base cursor-pointer" 
          disabled={totalTickets === 0}
        >
          Cumpără
        </button>
      </div>
    </div>
  )
}

export default SelectedTickets