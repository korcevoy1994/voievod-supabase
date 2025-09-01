'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
  fallback?: string
  onLoad?: () => void
  onError?: () => void
  threshold?: number
  rootMargin?: string
}

export function LazyImage({
  src,
  alt,
  className = '',
  placeholder,
  fallback,
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = '50px'
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Intersection Observer для ленивой загрузки
  useEffect(() => {
    if (!imgRef.current) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observerRef.current?.disconnect()
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    observerRef.current.observe(imgRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  const imageSrc = hasError && fallback ? fallback : src
  const shouldShowImage = isInView || isLoaded

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      {!isLoaded && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
          {typeof placeholder === 'string' ? (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          ) : (
            placeholder
          )}
        </div>
      )}
      
      {/* Основное изображение */}
      {shouldShowImage && (
        <img
          src={imageSrc}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
    </div>
  )
}

// Компонент для ленивой загрузки SVG
interface LazySVGProps {
  src: string
  className?: string
  placeholder?: React.ReactNode
  onLoad?: (svgContent: string) => void
  onError?: () => void
  threshold?: number
  rootMargin?: string
}

export function LazySVG({
  src,
  className = '',
  placeholder,
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = '50px'
}: LazySVGProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [isInView, setIsInView] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Intersection Observer
  useEffect(() => {
    if (!containerRef.current) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observerRef.current?.disconnect()
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    observerRef.current.observe(containerRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  // Загрузка SVG когда элемент в зоне видимости
  useEffect(() => {
    if (!isInView || svgContent || isLoading || hasError) return

    setIsLoading(true)
    
    fetch(src)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.text()
      })
      .then(content => {
        setSvgContent(content)
        onLoad?.(content)
      })
      .catch(() => {
        setHasError(true)
        onError?.()
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isInView, src, svgContent, isLoading, hasError, onLoad, onError])

  return (
    <div ref={containerRef} className={className}>
      {/* Placeholder во время загрузки */}
      {(isLoading || (!svgContent && !hasError)) && placeholder && (
        <div className="flex items-center justify-center bg-gray-200 animate-pulse">
          {placeholder}
        </div>
      )}
      
      {/* SVG контент */}
      {svgContent && (
        <div
          dangerouslySetInnerHTML={{ __html: svgContent }}
          className="transition-opacity duration-300"
        />
      )}
      
      {/* Сообщение об ошибке */}
      {hasError && (
        <div className="flex items-center justify-center bg-gray-100 text-gray-500 text-sm p-4">
          Ошибка загрузки SVG
        </div>
      )}
    </div>
  )
}

// Хук для предзагрузки изображений
export function useImagePreloader(urls: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    const preloadImage = (url: string) => {
      return new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => {
          setLoadedImages(prev => new Set(prev).add(url))
          resolve()
        }
        img.onerror = () => {
          setFailedImages(prev => new Set(prev).add(url))
          resolve()
        }
        img.src = url
      })
    }

    Promise.all(urls.map(preloadImage))
  }, [urls])

  return {
    loadedImages,
    failedImages,
    isLoaded: (url: string) => loadedImages.has(url),
    hasFailed: (url: string) => failedImages.has(url)
  }
}