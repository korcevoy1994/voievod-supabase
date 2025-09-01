'use client'

import React from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Clock, Ticket } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen relative">
      {/* Background images */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
        style={{
          backgroundImage: 'url("/bg-desc-min.jpg")',
          backgroundSize: 'cover !important',
          backgroundPosition: 'center !important'
        }}
      ></div>
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat md:hidden"
        style={{
          backgroundImage: 'url("/bg-mobile-min.jpg")',
          backgroundSize: 'cover !important',
          backgroundPosition: 'center !important'
        }}
      ></div>
      
      {/* Content */}
      <div className="relative z-20 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 md:p-8">
          <nav className="flex justify-between items-center">
            <div className="flex items-center">
              <img src="/logo.png" alt="VOIEVOD" className="h-8 md:h-10 hidden" />
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col px-6 md:px-8">
          {/* Text image under navbar */}
          <div className="flex justify-center pt-8 md:pt-0">
            <img src="/text.png" alt="VOIEVOD" className="max-w-full h-auto w-96 sm:w-[28rem] md:w-[32rem] lg:w-[36rem] xl:w-[40rem] 2xl:w-[44rem]" />
          </div>
          
          {/* Title and event info - mobile: right after text.png, desktop: at bottom */}
          <div className="block md:hidden text-center text-white max-w-4xl mx-auto mt-6">
            <div className="mb-6">
              <span className="block text-3xl font-bold text-white uppercase">
                Rock operă coregrafică
              </span>
            </div>
          
            <div className="mb-8 space-y-3">
              <div className="flex items-center justify-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span className="text-lg">14 decembrie 2025</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span className="text-lg">19:00</span>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span className="text-lg">Arena Chișinau</span>
              </div>
            </div>
          </div>
          
          {/* Spacer for mobile */}
          <div className="flex-1 block md:hidden"></div>
          
          <div className="flex-1 hidden md:flex items-end justify-center pb-8 md:pb-12">
            <div className="text-center text-white max-w-4xl mx-auto">
              <div className="mb-6">
                <span className="block text-3xl md:text-4xl lg:text-5xl font-bold text-white uppercase">
                  Rock operă coregrafică
                </span>
              </div>
            
              <div className="mb-8 space-y-3">
                <div className="flex items-center justify-center space-x-8">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span className="text-lg">14 decembrie 2025</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span className="text-lg">19:00</span>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span className="text-lg">Arena Chișinau</span>
                </div>
              </div>

              <div className="mb-6 max-w-4xl mx-auto text-center">
                <p className="text-white text-lg">
                  Lupii lui Calancea • Baletul Național „Joc" • Guz • Surorile Osoianu • Orchestra Simfonică a Filarmonicii Naționale • Corul „Moldova"
                </p>
              </div>

              <Link 
                href="/tickets" 
                className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
              >
                <Ticket className="w-5 h-5" />
                <span>Cumpără bilete</span>
              </Link>
            </div>
          </div>
          
          {/* Mobile artists and ticket button - at bottom */}
          <div className="block md:hidden text-center text-white max-w-4xl mx-auto px-4 pb-8">
            <div className="mb-6">
              <p className="text-white text-lg">
                Lupii lui Calancea • Baletul Național „Joc" • Guz • Surorile Osoianu • Orchestra Simfonică a Filarmonicii Naționale • Corul „Moldova"
              </p>
            </div>

            <Link 
              href="/tickets" 
              className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
            >
              <Ticket className="w-5 h-5" />
              <span>Cumpără bilete</span>
            </Link>
          </div>
        </main>


      </div>
    </div>
  )
}