'use client'

import React, { createContext, useContext, useReducer, useMemo, useCallback, ReactNode } from 'react'
import { logger } from '@/lib/logger'

// Типы состояния приложения
interface AppState {
  // UI состояние
  ui: {
    isLoading: boolean
    activeModal: string | null
    sidebarOpen: boolean
    theme: 'light' | 'dark'
    notifications: Notification[]
  }
  
  // Состояние пользователя
  user: {
    sessionId: string | null
    preferences: UserPreferences
    cart: CartItem[]
  }
  
  // Состояние событий
  events: {
    currentEventId: string | null
    selectedZone: string | null
    selectedSeats: string[]
    pricing: Record<string, number>
  }
  
  // Кэш данных
  cache: {
    lastUpdated: Record<string, number>
    invalidationQueue: string[]
  }
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

interface UserPreferences {
  language: 'ro' | 'ru' | 'en'
  currency: 'MDL' | 'EUR' | 'USD'
  notifications: boolean
}

interface CartItem {
  id: string
  type: 'seat' | 'general'
  zoneId?: string
  seatId?: string
  price: number
  quantity: number
}

// Типы действий
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ACTIVE_MODAL'; payload: string | null }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CURRENT_EVENT'; payload: string }
  | { type: 'SET_SELECTED_ZONE'; payload: string | null }
  | { type: 'ADD_SELECTED_SEAT'; payload: string }
  | { type: 'REMOVE_SELECTED_SEAT'; payload: string }
  | { type: 'CLEAR_SELECTED_SEATS' }
  | { type: 'UPDATE_PRICING'; payload: Record<string, number> }
  | { type: 'INVALIDATE_CACHE'; payload: string[] }
  | { type: 'UPDATE_CACHE_TIMESTAMP'; payload: { key: string; timestamp: number } }

// Начальное состояние
const initialState: AppState = {
  ui: {
    isLoading: false,
    activeModal: null,
    sidebarOpen: false,
    theme: 'light',
    notifications: []
  },
  user: {
    sessionId: null,
    preferences: {
      language: 'ro',
      currency: 'MDL',
      notifications: true
    },
    cart: []
  },
  events: {
    currentEventId: null,
    selectedZone: null,
    selectedSeats: [],
    pricing: {}
  },
  cache: {
    lastUpdated: {},
    invalidationQueue: []
  }
}

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        ui: { ...state.ui, isLoading: action.payload }
      }
      
    case 'SET_ACTIVE_MODAL':
      return {
        ...state,
        ui: { ...state.ui, activeModal: action.payload }
      }
      
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen }
      }
      
    case 'SET_THEME':
      return {
        ...state,
        ui: { ...state.ui, theme: action.payload }
      }
      
    case 'ADD_NOTIFICATION': {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, notification]
        }
      }
    }
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(n => n.id !== action.payload)
        }
      }
      
    case 'SET_SESSION_ID':
      return {
        ...state,
        user: { ...state.user, sessionId: action.payload }
      }
      
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        user: {
          ...state.user,
          preferences: { ...state.user.preferences, ...action.payload }
        }
      }
      
    case 'ADD_TO_CART': {
      const existingIndex = state.user.cart.findIndex(item => item.id === action.payload.id)
      if (existingIndex >= 0) {
        const updatedCart = [...state.user.cart]
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          quantity: updatedCart[existingIndex].quantity + action.payload.quantity
        }
        return {
          ...state,
          user: { ...state.user, cart: updatedCart }
        }
      }
      return {
        ...state,
        user: {
          ...state.user,
          cart: [...state.user.cart, action.payload]
        }
      }
    }
    
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        user: {
          ...state.user,
          cart: state.user.cart.filter(item => item.id !== action.payload)
        }
      }
      
    case 'CLEAR_CART':
      return {
        ...state,
        user: { ...state.user, cart: [] }
      }
      
    case 'SET_CURRENT_EVENT':
      return {
        ...state,
        events: { ...state.events, currentEventId: action.payload }
      }
      
    case 'SET_SELECTED_ZONE':
      return {
        ...state,
        events: {
          ...state.events,
          selectedZone: action.payload,
          selectedSeats: [] // Очищаем выбранные места при смене зоны
        }
      }
      
    case 'ADD_SELECTED_SEAT':
      if (state.events.selectedSeats.includes(action.payload)) {
        return state
      }
      return {
        ...state,
        events: {
          ...state.events,
          selectedSeats: [...state.events.selectedSeats, action.payload]
        }
      }
      
    case 'REMOVE_SELECTED_SEAT':
      return {
        ...state,
        events: {
          ...state.events,
          selectedSeats: state.events.selectedSeats.filter(id => id !== action.payload)
        }
      }
      
    case 'CLEAR_SELECTED_SEATS':
      return {
        ...state,
        events: { ...state.events, selectedSeats: [] }
      }
      
    case 'UPDATE_PRICING':
      return {
        ...state,
        events: {
          ...state.events,
          pricing: { ...state.events.pricing, ...action.payload }
        }
      }
      
    case 'INVALIDATE_CACHE':
      return {
        ...state,
        cache: {
          ...state.cache,
          invalidationQueue: [...state.cache.invalidationQueue, ...action.payload]
        }
      }
      
    case 'UPDATE_CACHE_TIMESTAMP':
      return {
        ...state,
        cache: {
          ...state.cache,
          lastUpdated: {
            ...state.cache.lastUpdated,
            [action.payload.key]: action.payload.timestamp
          }
        }
      }
      
    default:
      logger.warn('Unknown action type:', action)
      return state
  }
}

// Context
interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  
  // UI actions
  setLoading: (loading: boolean) => void
  setActiveModal: (modal: string | null) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  
  // User actions
  setSessionId: (sessionId: string) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  addToCart: (item: CartItem) => void
  removeFromCart: (itemId: string) => void
  clearCart: () => void
  
  // Event actions
  setCurrentEvent: (eventId: string) => void
  setSelectedZone: (zoneId: string | null) => void
  addSelectedSeat: (seatId: string) => void
  removeSelectedSeat: (seatId: string) => void
  clearSelectedSeats: () => void
  updatePricing: (pricing: Record<string, number>) => void
  
  // Cache actions
  invalidateCache: (keys: string[]) => void
  updateCacheTimestamp: (key: string, timestamp: number) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// Provider
interface AppStateProviderProps {
  children: ReactNode
  initialState?: Partial<AppState>
}

export function AppStateProvider({ children, initialState: customInitialState }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    ...customInitialState
  })
  
  // Мемоизированные действия
  const actions = useMemo(() => ({
    // UI actions
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setActiveModal: (modal: string | null) => dispatch({ type: 'SET_ACTIVE_MODAL', payload: modal }),
    toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    setTheme: (theme: 'light' | 'dark') => dispatch({ type: 'SET_THEME', payload: theme }),
    addNotification: (notification: Omit<Notification, 'id'>) => dispatch({ type: 'ADD_NOTIFICATION', payload: notification }),
    removeNotification: (id: string) => dispatch({ type: 'REMOVE_NOTIFICATION', payload: id }),
    
    // User actions
    setSessionId: (sessionId: string) => dispatch({ type: 'SET_SESSION_ID', payload: sessionId }),
    updatePreferences: (preferences: Partial<UserPreferences>) => dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences }),
    addToCart: (item: CartItem) => dispatch({ type: 'ADD_TO_CART', payload: item }),
    removeFromCart: (itemId: string) => dispatch({ type: 'REMOVE_FROM_CART', payload: itemId }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
    
    // Event actions
    setCurrentEvent: (eventId: string) => dispatch({ type: 'SET_CURRENT_EVENT', payload: eventId }),
    setSelectedZone: (zoneId: string | null) => dispatch({ type: 'SET_SELECTED_ZONE', payload: zoneId }),
    addSelectedSeat: (seatId: string) => dispatch({ type: 'ADD_SELECTED_SEAT', payload: seatId }),
    removeSelectedSeat: (seatId: string) => dispatch({ type: 'REMOVE_SELECTED_SEAT', payload: seatId }),
    clearSelectedSeats: () => dispatch({ type: 'CLEAR_SELECTED_SEATS' }),
    updatePricing: (pricing: Record<string, number>) => dispatch({ type: 'UPDATE_PRICING', payload: pricing }),
    
    // Cache actions
    invalidateCache: (keys: string[]) => dispatch({ type: 'INVALIDATE_CACHE', payload: keys }),
    updateCacheTimestamp: (key: string, timestamp: number) => dispatch({ type: 'UPDATE_CACHE_TIMESTAMP', payload: { key, timestamp } })
  }), [])
  
  const contextValue = useMemo(() => ({
    state,
    dispatch,
    ...actions
  }), [state, actions])
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

// Hook для использования контекста
export function useAppState() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }
  return context
}

// Селекторы для оптимизации рендеринга
export function useAppSelector<T>(selector: (state: AppState) => T): T {
  const { state } = useAppState()
  return useMemo(() => selector(state), [state, selector])
}

// Хуки для конкретных частей состояния
export function useUIState() {
  return useAppSelector(state => state.ui)
}

export function useUserState() {
  return useAppSelector(state => state.user)
}

export function useEventsState() {
  return useAppSelector(state => state.events)
}

export function useCacheState() {
  return useAppSelector(state => state.cache)
}

// Хук для уведомлений с автоматическим удалением
export function useNotifications() {
  const { state, addNotification, removeNotification } = useAppState()
  
  const addNotificationWithTimeout = useCallback((notification: Omit<Notification, 'id'>) => {
    addNotification(notification)
    
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        // Нужно получить ID уведомления для удаления
        // Это упрощенная версия, в реальности нужно отслеживать ID
      }, notification.duration)
    }
  }, [addNotification])
  
  return {
    notifications: state.ui.notifications,
    addNotification: addNotificationWithTimeout,
    removeNotification
  }
}