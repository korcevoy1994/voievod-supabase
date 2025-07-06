import React from 'react'

const LEGEND = [
  { color: '#179240', label: '650 LEI' },
  { color: '#8525D9', label: '850 LEI' },
  { color: '#921792', label: '950 LEI' },
  { color: '#E7CB15', label: '750 LEI' },
  { color: '#EA3446', label: '1100 LEI' },
  { color: '#5BBFD6', label: '500 LEI' },
  { color: '#1B1792', label: '1500-19800 LEI' },
]

const LegendBar: React.FC = () => (
  <div
    className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 px-2 sm:px-6 py-1.5 sm:py-2 bg-[#181E29] rounded-2xl shadow-sm w-full max-w-2xl mx-auto mb-4 mt-2"
    style={{ minHeight: 40 }}
  >
    {LEGEND.map((item, i) => (
      <div key={i} className="flex flex-col items-center min-w-[54px] text-center">
        <span style={{
          display: 'inline-block',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: item.color,
          marginBottom: 2,
          border: '2px solid #232B3B',
        }} />
        <span className="text-white text-[13px] font-medium leading-tight" style={{fontFamily:'var(--font-geist-sans), Inter, Arial, sans-serif'}}>{item.label}</span>
      </div>
    ))}
  </div>
)

export default LegendBar 