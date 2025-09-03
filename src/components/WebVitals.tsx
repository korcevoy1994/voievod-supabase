'use client'

import { useEffect } from 'react'
import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals'

interface WebVitalsProps {
  debug?: boolean
}

export default function WebVitals({ debug = false }: WebVitalsProps) {
  useEffect(() => {
    // Largest Contentful Paint (LCP)
    onLCP((metric: Metric) => {
      if (debug) {
        console.log('LCP:', metric)
      }
      // Send to analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: 'LCP',
          value: Math.round(metric.value),
          custom_map: { metric_id: metric.id }
        })
      }
    })

    // Interaction to Next Paint (INP) - replaces FID in v3+
    onINP((metric: Metric) => {
      if (debug) {
        console.log('INP:', metric)
      }
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: 'INP',
          value: Math.round(metric.value),
          custom_map: { metric_id: metric.id }
        })
      }
    })

    // Cumulative Layout Shift (CLS)
    onCLS((metric: Metric) => {
      if (debug) {
        console.log('CLS:', metric)
      }
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: 'CLS',
          value: Math.round(metric.value * 1000), // CLS is usually a small decimal
          custom_map: { metric_id: metric.id }
        })
      }
    })

    // First Contentful Paint (FCP)
    onFCP((metric: Metric) => {
      if (debug) {
        console.log('FCP:', metric)
      }
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: 'FCP',
          value: Math.round(metric.value),
          custom_map: { metric_id: metric.id }
        })
      }
    })

    // Time to First Byte (TTFB)
    onTTFB((metric: Metric) => {
      if (debug) {
        console.log('TTFB:', metric)
      }
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: 'TTFB',
          value: Math.round(metric.value),
          custom_map: { metric_id: metric.id }
        })
      }
    })
  }, [])

  return null
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}