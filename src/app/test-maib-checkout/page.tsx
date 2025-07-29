'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface TestTicket {
  id: string
  zone: string
  row: string
  number: string
  price: number
}

interface TestGeneralAccess {
  id: string
  name: string
  price: number
  quantity: number
}

const TestMAIBCheckoutPage: React.FC = () => {
  const router = useRouter()
  const [selectedTickets, setSelectedTickets] = useState<TestTicket[]>([])
  const [generalAccess, setGeneralAccess] = useState<TestGeneralAccess[]>([])
  const [gaQuantity, setGaQuantity] = useState(1)

  // Предустановленные тестовые билеты (соответствуют реальным ID в базе данных)
  const testTickets: TestTicket[] = [
    { id: '201-J-01', zone: '201', row: 'J', number: '01', price: 150 },
    { id: '201-J-02', zone: '201', row: 'J', number: '02', price: 150 },
    { id: '201-I-05', zone: '201', row: 'I', number: '05', price: 150 },
    { id: '201-H-10', zone: '201', row: 'H', number: '10', price: 150 },
    { id: '201-G-12', zone: '201', row: 'G', number: '12', price: 150 },
  ]

  const toggleTicket = (ticket: TestTicket) => {
    setSelectedTickets(prev => {
      const isSelected = prev.some(t => t.id === ticket.id)
      if (isSelected) {
        return prev.filter(t => t.id !== ticket.id)
      } else {
        return [...prev, ticket]
      }
    })
  }

  const addGeneralAccess = () => {
    const newGA: TestGeneralAccess = {
      id: `ga-${Date.now()}`,
      name: 'General Access',
      price: 100,
      quantity: gaQuantity
    }
    setGeneralAccess(prev => [...prev, newGA])
    setGaQuantity(1)
  }

  const removeGeneralAccess = (id: string) => {
    setGeneralAccess(prev => prev.filter(ga => ga.id !== id))
  }

  const totalPrice = selectedTickets.reduce((sum, ticket) => sum + ticket.price, 0) +
                    generalAccess.reduce((sum, ga) => sum + (ga.price * ga.quantity), 0)
  const totalTickets = selectedTickets.length + generalAccess.reduce((sum, ga) => sum + ga.quantity, 0)

  const proceedToCheckout = () => {
    if (totalTickets === 0) {
      alert('Selectează cel puțin un bilet!')
      return
    }

    // Подготавливаем данные для checkout
    const checkoutData = {
      seats: selectedTickets,
      generalAccess: generalAccess,
      totalPrice: totalPrice,
      totalTickets: totalTickets
    }

    // Сохраняем в localStorage
    localStorage.setItem('checkout_data', JSON.stringify(checkoutData))
    
    // Переходим на страницу checkout
    router.push('/checkout')
  }

  const clearAll = () => {
    setSelectedTickets([])
    setGeneralAccess([])
    localStorage.removeItem('checkout_data')
    localStorage.removeItem('voevoda_supabase_selectedSeats')
    localStorage.removeItem('voevoda_supabase_generalAccess')
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Test MAIB Checkout Flow</h1>
              <p className="text-gray-300">Selectează bilete pentru a testa integrarea MAIB</p>
            </div>
            <button
              onClick={clearAll}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Șterge tot
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Bilete cu locuri */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h2 className="text-xl font-bold text-white mb-4">Bilete cu locuri</h2>
              <div className="space-y-3">
                {testTickets.map((ticket) => {
                  const isSelected = selectedTickets.some(t => t.id === ticket.id)
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => toggleTicket(ticket)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">Zona {ticket.zone}</div>
                          <div className="text-gray-400 text-sm">Rând {ticket.row}, Loc {ticket.number}</div>
                        </div>
                        <div className="text-green-400 font-bold">{ticket.price} Lei</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* General Access */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <h2 className="text-xl font-bold text-white mb-4">General Access</h2>
              
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={gaQuantity}
                    onChange={(e) => setGaQuantity(parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-center"
                  />
                  <span className="text-gray-300">x 100 Lei</span>
                </div>
                <button
                  onClick={addGeneralAccess}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"
                >
                  Adaugă General Access
                </button>
              </div>

              <div className="space-y-2">
                {generalAccess.map((ga) => (
                  <div key={ga.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                    <div>
                      <div className="text-white">{ga.name}</div>
                      <div className="text-gray-400 text-sm">{ga.quantity} bilet{ga.quantity > 1 ? 'e' : ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 font-bold">{ga.price * ga.quantity} Lei</span>
                      <button
                        onClick={() => removeGeneralAccess(ga.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Sumar și checkout */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 h-fit"
            >
              <h2 className="text-xl font-bold text-white mb-4">Sumar</h2>
              
              <div className="space-y-3 mb-6">
                {selectedTickets.map((ticket) => (
                  <div key={ticket.id} className="flex justify-between text-sm">
                    <span className="text-gray-300">Zona {ticket.zone} - R{ticket.row}L{ticket.number}</span>
                    <span className="text-green-400">{ticket.price} Lei</span>
                  </div>
                ))}
                
                {generalAccess.map((ga) => (
                  <div key={ga.id} className="flex justify-between text-sm">
                    <span className="text-gray-300">{ga.name} x{ga.quantity}</span>
                    <span className="text-green-400">{ga.price * ga.quantity} Lei</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-600 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">Total ({totalTickets} bilet{totalTickets !== 1 ? 'e' : ''})</span>
                  <span className="text-green-400 font-bold text-xl">{totalPrice} Lei</span>
                </div>
              </div>

              <button
                onClick={proceedToCheckout}
                disabled={totalTickets === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                {totalTickets === 0 ? 'Selectează bilete' : `Continuă la plată (${totalPrice} Lei)`}
              </button>

              <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                <div className="text-blue-300 text-sm font-medium mb-1">💳 Test MAIB Flow:</div>
                <div className="text-blue-200 text-xs">
                  1. Selectează bilete<br/>
                  2. Continuă la checkout<br/>
                  3. Completează datele<br/>
                  4. Testează plata MAIB
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default TestMAIBCheckoutPage