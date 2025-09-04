import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import Script from 'next/script'
import './globals.css'
import WebVitals from '@/components/WebVitals'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Voievod - Rock operă coregrafică | Bilete online',
  description: 'Cumpără bilete pentru spectacolul Voievod - Rock operă coregrafică cu Lupii lui Calancea, Baletul Național "Joc", Guz și Surorile Osoianu. 14 Decembrie 2025, Arena Chisinau.',
  keywords: 'Voievod, rock operă, bilete, Arena Chisinau, Lupii lui Calancea, Baletul Național Joc, Guz, Surorile Osoianu, spectacol, Moldova',
  authors: [{ name: 'Voievod Production' }],
  creator: 'Voievod Production',
  publisher: 'Voievod Production',
  manifest: '/manifest.json',
  robots: 'index, follow',
  alternates: {
    canonical: 'https://voievodul.md'
  },
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    url: 'https://voievod.md',
    siteName: 'Voievod',
    title: 'Voievod - Rock operă coregrafică | Bilete online',
    description: 'Cumpără bilete pentru spectacolul Voievod - Rock operă coregrafică cu Lupii lui Calancea, Baletul Național "Joc", Guz și Surorile Osoianu. 14 Decembrie 2025, Arena Chisinau.',
    images: [
      {
        url: '/bg-desc-min.jpg',
        width: 1200,
        height: 630,
        alt: 'Voievod - Rock operă coregrafică'
      },
      {
        url: '/text.png',
        width: 800,
        height: 400,
        alt: 'Voievod Logo'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    site: '@voievod_md',
    creator: '@voievod_md',
    title: 'Voievod - Rock operă coregrafică | Bilete online',
    description: 'Cumpără bilete pentru spectacolul Voievod - Rock operă coregrafică. 14 Decembrie 2025, Arena Chisinau.',
    images: ['/bg-desc-min.jpg']
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico'
  },
  other: {
    'event:start_time': '2025-12-14T19:00:00+02:00',
    'event:end_time': '2025-12-14T22:00:00+02:00',
    'event:location': 'Arena Chisinau, Moldova',
    'event:price_range': '200-1500 MDL'
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#dc2626'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX');
          `}
        </Script>
        
        {/* Structured Data */}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Event",
              "name": "Voievod - Rock operă coregrafică",
              "description": "Spectacol de rock operă coregrafică cu Lupii lui Calancea, Baletul Național Joc, Guz și Surorile Osoianu",
              "startDate": "2025-12-14T19:00:00+02:00",
              "endDate": "2025-12-14T22:00:00+02:00",
              "eventStatus": "https://schema.org/EventScheduled",
              "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
              "location": {
                "@type": "Place",
                "name": "Arena Chisinau",
                "address": {
                  "@type": "PostalAddress",
                  "addressLocality": "Chișinău",
                  "addressCountry": "MD"
                }
              },
              "image": [
                "https://voievod.md/bg-desc-min.jpg",
                "https://voievod.md/text.png"
              ],
              "organizer": {
                "@type": "Organization",
                "name": "Voievod Production",
                "url": "https://voievod.md"
              },
              "offers": {
                "@type": "Offer",
                "url": "https://voievod.md",
                "priceCurrency": "MDL",
                "price": "200",
                "priceValidUntil": "2025-12-14",
                "availability": "https://schema.org/InStock",
                "validFrom": "2024-01-01"
              },
              "performer": [
                {
                  "@type": "MusicGroup",
                  "name": "Lupii lui Calancea"
                },
                {
                  "@type": "TheaterGroup",
                  "name": "Baletul Național Joc"
                },
                {
                  "@type": "Person",
                  "name": "Guz"
                },
                {
                  "@type": "MusicGroup",
                  "name": "Surorile Osoianu"
                }
              ]
            })
          }}
        />
      </head>
      <body className={inter.className}>
        <WebVitals />
        {children}
        
        {/* Footer */}
        <footer className="bg-black p-6 md:p-8 text-white">
          <div className="max-w-7xl mx-auto">
            {/* Main footer content */}
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 mb-6">
              {/* Logo */}
              <div className="flex items-center">
                <img src="/logo.png" alt="Voievod" className="h-8 md:h-10" />
              </div>
              
              {/* Links */}
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm">
                <Link href="/terms" className="text-white hover:text-gray-300 transition-colors">
                  Terms and conditions
                </Link>
                <Link href="/privacy" className="text-white hover:text-gray-300 transition-colors">
                  Privacy Policy
                </Link>
              </div>
              
              {/* Payment logo */}
              <div className="flex items-center">
                <img src="/visa-maib.webp" alt="Visa MAIB" className="h-6 md:h-8" />
              </div>
            </div>
            
            {/* Legal information */}
            <div className="border-t border-gray-700 pt-4 text-center text-sm text-gray-300">
              <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-6">
                <span>+373 796 60 101</span>
                <span className="hidden md:inline">•</span>
                <span>„ARTA SI CULTURA EVENIMENTULUI" A.O</span>
                <span className="hidden md:inline">•</span>
                <span>str. Petricani 17</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
