'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Loader2, RefreshCw, LogOut, Lock, Unlock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useOptimizedZoneColors } from '@/lib/hooks/useOptimizedData'
import AdminLogin from '@/components/AdminLogin'
import { logger } from '@/lib/logger'

interface ZoneData {
  zone: string
  name: string
  color: string
  is_active: boolean
}

export default function ZonesManagementPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [zones, setZones] = useState<ZoneData[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { data: zoneColors, refetch } = useOptimizedZoneColors()

  useEffect(() => {
    // Проверяем аутентификацию
    const adminAuth = localStorage.getItem('admin_authenticated')
    if (adminAuth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  useEffect(() => {
    if (zoneColors?.detailedColors) {
      setZones(zoneColors.detailedColors)
    }
  }, [zoneColors])

  const handleLogin = () => {
    setIsAuthenticated(true)
    localStorage.setItem('admin_authenticated', 'true')
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('admin_authenticated')
    router.push('/')
  }

  const toggleZoneStatus = async (zoneId: string, currentStatus: boolean) => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/zones/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zoneId,
          isBlocked: currentStatus // инвертируем, так как isBlocked противоположен is_active
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update zone status')
      }

      // Обновляем локальное состояние
      setZones(prev => prev.map(zone => 
        zone.zone === zoneId 
          ? { ...zone, is_active: !currentStatus }
          : zone
      ))

      // Обновляем кэш
      await refetch()
      
      logger.info(`Zone ${zoneId} ${currentStatus ? 'blocked' : 'unblocked'}`)
    } catch (error) {
      logger.error('Error updating zone status:', error)
      alert('Ошибка при обновлении статуса зоны')
    } finally {
      setSaving(false)
    }
  }

  const refreshData = async () => {
    setLoading(true)
    try {
      await refetch()
    } catch (error) {
      logger.error('Error refreshing data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-3xl font-bold text-white">Управление зонами</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={refreshData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </div>

        {/* Zones Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {zones.map((zone) => (
            <motion.div
              key={zone.zone}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white/30"
                    style={{ backgroundColor: zone.color }}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Зона {zone.zone}</h3>
                    {zone.name && (
                      <p className="text-sm text-gray-300">{zone.name}</p>
                    )}
                  </div>
                </div>
                
                <div className={`p-2 rounded-lg ${
                  zone.is_active 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {zone.is_active ? (
                    <Unlock className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>
              </div>
              
              <div className="mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  zone.is_active 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {zone.is_active ? 'Активна' : 'Заблокирована'}
                </span>
              </div>
              
              <button
                onClick={() => toggleZoneStatus(zone.zone, zone.is_active)}
                disabled={saving}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  zone.is_active
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {zone.is_active ? (
                      <>
                        <Lock className="w-4 h-4" />
                        Заблокировать
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        Разблокировать
                      </>
                    )}
                  </>
                )}
              </button>
            </motion.div>
          ))}
        </div>
        
        {zones.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Зоны не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}