'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon } from 'lucide-react'

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

interface SelectContentProps {
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
}

interface SelectValueProps {
  placeholder?: string
}

const SelectContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
} | null>(null)

export function Select({ value, onValueChange, children }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

export function SelectTrigger({ children, className = '' }: SelectTriggerProps) {
  const context = React.useContext(SelectContext)
  const ref = useRef<HTMLButtonElement>(null)
  
  if (!context) throw new Error('SelectTrigger must be used within Select')
  
  const { isOpen, setIsOpen } = context
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, setIsOpen])
  
  return (
    <button
      ref={ref}
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
      <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const context = React.useContext(SelectContext)
  
  if (!context) throw new Error('SelectValue must be used within Select')
  
  const { value } = context
  
  return (
    <span className="block truncate">
      {value || placeholder}
    </span>
  )
}

export function SelectContent({ children }: SelectContentProps) {
  const context = React.useContext(SelectContext)
  
  if (!context) throw new Error('SelectContent must be used within Select')
  
  const { isOpen } = context
  
  if (!isOpen) return null
  
  return (
    <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
      {children}
    </div>
  )
}

export function SelectItem({ value, children }: SelectItemProps) {
  const context = React.useContext(SelectContext)
  
  if (!context) throw new Error('SelectItem must be used within Select')
  
  const { value: selectedValue, onValueChange, setIsOpen } = context
  
  const handleClick = () => {
    onValueChange(value)
    setIsOpen(false)
  }
  
  return (
    <button
      type="button"
      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
        selectedValue === value ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
      }`}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}