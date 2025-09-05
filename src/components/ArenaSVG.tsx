'use client'
import React, { useState, useRef, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ZONE_DATA_MAP } from '@/lib/zoneData'

interface ArenaSVGProps {
  onZoneClick: (zoneId: string) => void
  selectedSeats: Record<string, string[]>
  onVipZoneClick?: (vipZone: string) => void
  zonePrices?: Record<string, number>
  zoneColors?: Record<string, string>
  zoneStatus?: Record<string, boolean>
  vipZonesData?: any
  vipTickets?: Array<{ zone: string; [key: string]: any }>
  zoneStats?: Record<string, {
    total: number
    available: number
    sold: number
    unavailable: number
    blocked: number
    free: number
  }>
}

const ZONE_SEAT_DATA = ZONE_DATA_MAP as Record<string, any[]>

const ArenaSVG: React.FC<ArenaSVGProps> = ({ onZoneClick, selectedSeats, onVipZoneClick, zonePrices = {}, zoneColors = {}, zoneStatus = {}, vipZonesData, vipTickets = [], zoneStats }) => {
  const svgRef = useRef<SVGSVGElement>(null)





  // Функция для получения цвета зоны из базы данных или fallback к статическим цветам
  function getZoneColor(zoneId: string): string {
    // Проверяем, является ли это VIP зоной и куплена ли она
    if (zoneId.startsWith('vip')) {
      const isVipPurchased = vipTickets.some(ticket => ticket.zone === zoneId)
      if (isVipPurchased) {
        return '#666666' // Серый цвет для купленных VIP зон
      }
      
      // Проверяем доступность VIP зоны из API данных
      if (vipZonesData?.data?.vipZones) {
        const vipZone = vipZonesData.data.vipZones.find((zone: any) => zone.zone === zoneId)
        if (vipZone && !vipZone.isAvailable) {
          return '#444444' // Темно-серый для недоступных VIP зон
        }
      }
    }
    
    // Если есть цвет из базы данных, используем его
    if (zoneColors && zoneColors[zoneId]) {
      return zoneColors[zoneId]
    }
    
    // Fallback к статическим цветам
    const staticColors: Record<string, string> = {
      // VIP зоны
      'vip1': '#1B1792', 'vip2': '#1B1792', 'vip3': '#1B1792', 'vip4': '#1B1792',
      'vip5': '#1B1792', 'vip6': '#1B1792', 'vip7': '#1B1792', 'vip8': '#1B1792',
      'vip9': '#1B1792', 'vip10': '#1B1792', 'vip11': '#1B1792', 'vip12': '#1B1792',
      'vip13': '#1B1792', 'vip14': '#1B1792',
      // Основные зоны
      '201': '#179240', '213': '#179240',
      '202': '#8525D9', '212': '#8525D9', '210': '#8525D9',
      '203': '#921792', '204': '#921792', '211': '#921792',
      '205': '#E7CB15', '209': '#E7CB15',
      '206': '#EA3446', '207': '#EA3446', '208': '#EA3446',
      // Новые сектора
      'A': '#ff6b35', // orange for Sector A
      'B': '#4ecdc4', // teal for Sector B
      'C': '#45b7d1'  // blue for Sector C
    }
    
    return staticColors[zoneId] || '#666666' // Серый цвет по умолчанию
  }

  // Подсчет свободных мест для зоны
  function getZoneInfo(zoneId: string) {
    const stats = zoneStats?.[zoneId]
    
    // Если есть статистика из базы данных, используем её
    if (stats) {
      const isBlocked = stats.blocked === stats.total
      return { isBlocked }
    }
    
    // Fallback к старому методу подсчета для совместимости
    const data = ZONE_SEAT_DATA[zoneId]
    if (!data) {
      return { isBlocked: false }
    }
    
    // Проверяем, активна ли зона в базе данных
    const isZoneActive = zoneStatus[zoneId] !== false // по умолчанию активна, если не указано иное
    if (!isZoneActive) {
      return { isBlocked: true }
    }
    
    const blocked = data.filter(s => s.status === 'blocked').length
    const isBlocked = blocked === data.length
    
    return { isBlocked }
  }



  // Tooltip render


  // Проверка, заблокирована ли зона полностью
  function isZoneBlocked(zoneId: string): boolean {
    const { isBlocked } = getZoneInfo(zoneId)
    return isBlocked || false
  }




  return (
    <div className="w-full h-full flex items-center justify-center relative p-2">
      <svg
        ref={svgRef}
        viewBox="0 0 729 671"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-w-full max-h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxHeight: '70vh' }}
      >
        <g id="Arena" clipPath="url(#clip0_7_419)">
          {/* VIP Zones */}
          <motion.g id="vip14" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip14')}>
            <path d="M690 64H721C725.2 64 728.6 67.4 728.6 71.6V194.6C728.6 198.8 725.2 202.2 721 202.2H690C685.8 202.2 682.4 198.8 682.4 194.6V71.6C682.4 67.4 685.8 64 690 64Z" fill={getZoneColor('vip14')} />
            <text transform="translate(696 158) rotate(-90)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.40625" y="15.3182">VIP 14</tspan></text>
          </motion.g>
          <motion.g id="vip13" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip13')}>
            <path d="M690 206.2H721C725.2 206.2 728.6 209.6 728.6 213.8V302.8C728.6 307 725.2 310.4 721 310.4H690C685.8 310.4 682.4 307 682.4 302.8V213.8C682.4 209.6 685.8 206.2 690 206.2Z" fill={getZoneColor('vip13')} />
            <text transform="translate(696 283) rotate(-90)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.0546875" y="15.3182">VIP 13</tspan></text>
          </motion.g>
          <motion.g id="vip12" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip12')}>
            <path d="M690 314.5H721C725.2 314.5 728.6 317.9 728.6 322.1V465.9C728.6 470.1 725.2 473.5 721 473.5H690C685.8 473.5 682.4 470.1 682.4 465.9V322.1C682.4 317.9 685.8 314.5 690 314.5Z" fill={getZoneColor('vip12')} />
            <text transform="translate(696 418) rotate(-90)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.289062" y="15.3182">VIP 12</tspan></text>
          </motion.g>
          <motion.g id="vip11" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip11')}>
            <path d="M669.4 608.5C672.5 611.6 677.5 611.4 680.3 608.2C710.8 574.2 726.7 531.2 728.4 486.4C728.5 483.6 729 477.4 722.1 477.4H689.4C685.4 477.4 682.2 480.5 681.9 484.5C679.8 517.5 667.7 549.1 645.3 574.5C642.7 577.5 642.8 582 645.6 584.8L669.4 608.5Z" fill={getZoneColor('vip11')} />
            <text transform="translate(674 561) rotate(-63.7686)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.414062" y="15.3182">VIP 11</tspan></text>
          </motion.g>
          <motion.g id="vip10" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip10')}>
            <path d="M632.6 587.3C619.7 598.7 605.2 607.4 589.8 613.5C586.1 615 584.2 619 585.4 622.8L595.5 654C596.8 658.1 601.3 660.2 605.3 658.8C627.4 650.8 648.1 638.7 666.2 622.4C669.4 619.5 669.6 614.5 666.5 611.4L642.8 587.7C640 584.9 635.5 584.7 632.6 587.3Z" fill={getZoneColor('vip10')} />
            <text transform="translate(599.5 625.939) rotate(-29.2431)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.320312" y="15.3182">VIP 10</tspan></text>
          </motion.g>
          <motion.g id="vip9" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip9')}>
            <path d="M590.1 655.4L580.5 624.5C579.3 620.7 575.4 618.4 571.5 619.4C561 622.1 550.2 624.2 539.3 624.2C532.5 624.2 531.1 628.1 531.1 633.7V661.5C531.1 669.5 534.8 670.7 539.8 670.5C555 669.7 570 668.4 584.6 664.9C588.9 664 591.4 659.6 590.1 655.4Z" fill={getZoneColor('vip9')} />
            <text transform="translate(537.045 639.484) rotate(-6.61963)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.460938" y="15.3182">VIP 9</tspan></text>
          </motion.g>
          <motion.g id="vip8" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip8')}>
            <path d="M519.5 624.3L417.6 624.5C413.4 624.5 410.1 627.9 410.1 632V663.2C410.1 667.4 413.5 670.8 417.7 670.7C432.3 670.6 498.7 670.5 519.6 670.5C523.8 670.5 527.1 667.1 527.1 663V631.9C527.1 627.7 523.7 624.3 519.5 624.3Z" fill={getZoneColor('vip8')} />
            <text transform="translate(447 638)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.453125" y="15.3182">VIP 8</tspan></text>
          </motion.g>
          <motion.g id="vip7" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip7')}>
            <path d="M209.1 624.3L311.5 624.5C315.7 624.5 319 627.9 319 632V663.2C319 667.4 315.6 670.8 311.4 670.7C296.8 670.6 229.8 670.5 209 670.5C204.8 670.5 201.5 667.1 201.5 663V631.9C201.5 627.7 204.9 624.3 209.1 624.3Z" fill={getZoneColor('vip7')} />
            <text transform="translate(240 638)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.484375" y="15.3182">VIP 7</tspan></text>
          </motion.g>
          <motion.g id="vip6" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip6')}>
            <path d="M138.5 655.4L148.1 624.5C149.3 620.7 153.2 618.4 157.1 619.4C167.6 622.1 178.4 624.2 189.3 624.2C196.1 624.2 197.4 628.1 197.4 633.7V661.5C197.4 669.5 193.7 670.7 188.8 670.5C173.6 669.7 158.6 668.4 144 664.9C139.8 664 137.2 659.6 138.5 655.4Z" fill={getZoneColor('vip6')} />
            <text transform="translate(151.095 634.879) rotate(5.9376)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.460938" y="15.3182">VIP 6</tspan></text>
          </motion.g>
          <motion.g id="vip5" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip5')}>
            <path d="M96.1 587.3C109 598.7 123.5 607.4 138.9 613.5C142.6 615 144.5 619 143.3 622.8L133.1 654C131.8 658.1 127.3 660.2 123.3 658.8C101.2 650.8 80.5 638.7 62.4 622.4C59.2 619.5 59 614.5 62.1 611.4L85.8 587.7C88.6 584.9 93.1 584.7 96.1 587.3Z" fill={getZoneColor('vip5')} />
            <text transform="translate(90.4777 605.506) rotate(30.402)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.0859375" y="15.3182">VIP 5</tspan></text>
          </motion.g>
          <motion.g id="vip4" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip4')}>
            <path d="M59.2 608.5C56.1 611.6 51.1 611.4 48.3 608.2C17.8 574.2 1.79997 531.2 0.199975 486.4C0.0999747 483.6 -0.400025 477.4 6.49997 477.4H39.2C43.2 477.4 46.4 480.5 46.7 484.5C48.8 517.5 60.9 549.1 83.3 574.5C85.9 577.5 85.7 582 83 584.8L59.2 608.5Z" fill={getZoneColor('vip4')} />
            <text transform="translate(38.298 519.756) rotate(69.8549)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.320312" y="15.3182">VIP 4</tspan></text>
          </motion.g>
          <motion.g id="vip3" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip3')}>
            <path d="M7.6 335.4H38.6C42.8 335.4 46.2 338.8 46.2 343V465.6C46.2 469.8 42.8 473.2 38.6 473.2H7.6C3.4 473.2 0 469.8 0 465.6V343C0 338.8 3.4 335.4 7.6 335.4Z" fill={getZoneColor('vip3')} />
            <text transform="translate(14 426) rotate(-90)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.46875" y="15.3182">VIP 3</tspan></text>
          </motion.g>
          <motion.g id="vip2" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip2')}>
            <path d="M7.6 196H38.6C42.8 196 46.2 199.4 46.2 203.6V323.7C46.2 327.9 42.8 331.3 38.6 331.3H7.6C3.4 331.3 0 327.9 0 323.7V203.6C0 199.4 3.4 196 7.6 196Z" fill={getZoneColor('vip2')} />
            <text transform="translate(14 284) rotate(-90)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.203125" y="15.3182">VIP 2</tspan></text>
          </motion.g>
          <motion.g id="vip1" className="cursor-pointer" whileHover={{ opacity: 0.8 }} onClick={() => onVipZoneClick && onVipZoneClick('vip1')}>
            <path d="M7.6 64H38.6C42.8 64 46.2 67.4 46.2 71.6V184.4C46.2 188.6 42.8 192 38.6 192H7.6C3.4 192 0 188.6 0 184.4V71.6C0 67.4 3.4 64 7.6 64Z" fill={getZoneColor('vip1')} />
            <text transform="translate(14 147) rotate(-90)" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 16, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="0.328125" y="15.3182">VIP 1</tspan></text>
          </motion.g>

          {/* Main Zones */}
          <motion.g id="2c51d686-c95b-46ab-ba12-df8ff2c14f3e" className={isZoneBlocked('213') ? 'cursor-not-allowed' : 'cursor-pointer'}
            animate={{ filter: 'none', opacity: isZoneBlocked('213') ? 0.5 : 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => !isZoneBlocked('213') && onZoneClick('213')}
          >
            <path d="M581.7 64H671.2C675.1 64 678.3 67.2 678.3 71.1V160.6C678.3 164.5 675.1 167.7 671.2 167.7H581.7C577.8 167.7 574.6 164.5 574.6 160.6V71.1C574.6 67.2 577.8 64 581.7 64Z" fill={getZoneColor('213')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="605" y="124.227">213</tspan></text>
          </motion.g>
          <motion.g id="212" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('212')}
          >
            <path d="M581.7 171.7H671.2C675.1 171.7 678.3 174.9 678.3 178.8V268.3C678.3 272.2 675.1 275.4 671.2 275.4H581.7C577.8 275.4 574.6 272.2 574.6 268.3V178.8C574.6 174.9 577.8 171.7 581.7 171.7Z" fill={getZoneColor('212')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="605" y="232.227">212</tspan></text>
          </motion.g>
          <motion.g id="211" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('211')}
          >
            <path d="M581.7 279.5H671.2C675.1 279.5 678.3 282.7 678.3 286.6V376.1C678.3 380 675.1 383.2 671.2 383.2H581.7C577.8 383.2 574.6 380 574.6 376.1V286.6C574.6 282.6 577.8 279.5 581.7 279.5Z" fill={getZoneColor('211')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="607" y="340.227">211</tspan></text>
          </motion.g>
          <motion.g id="210" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('210')}
          >
            <path d="M664.5 516.9C668.7 518.2 673 515.7 674.1 511.5C676.9 500.2 678.4 488.4 678.4 476.2V394.8C678.4 390.6 675 387.2 670.8 387.2H582.4C578.2 387.2 574.8 390.6 574.8 394.8V476.2C574.8 478.4 574.6 480.5 574.3 482.6C573.8 486.2 576.1 489.7 579.6 490.8L664.5 516.9Z" fill={getZoneColor('210')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="604" y="452.227">210</tspan></text>
          </motion.g>
          <motion.g id="209" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('209')}
          >
            <path d="M568.1 496.5C564.6 502 560 506.6 554.5 510.1C551.6 511.9 550.3 515.5 551.4 518.8L579.2 603.9C580.6 608.1 585.3 610.3 589.4 608.5C623.9 593.6 651.6 565.8 666.5 531.3C668.3 527.2 666.1 522.5 661.9 521.1L576.8 493.4C573.5 492.3 569.9 493.6 568.1 496.5Z" fill={getZoneColor('209')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="585" y="560.227">209</tspan></text>
          </motion.g>
          <motion.g id="208" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('208')}
          >
            <path d="M548.6 521.5C547.5 517.9 543.9 515.8 540.3 516.4C538.1 516.7 535.9 516.9 533.7 516.9H451.8C447.6 516.9 444.2 520.3 444.2 524.5V612.9C444.2 617.1 447.6 620.5 451.8 620.5H533.7C546.1 620.5 558.1 619 569.6 616.1C573.8 615.1 576.3 610.7 575 606.5L548.6 521.5Z" fill={getZoneColor('208')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="481" y="577.227">208</tspan></text>
          </motion.g>
          <motion.g id="207" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('207')}
          >
            <path d="M296.1 516.6H432.5C436.7 516.6 440.1 520 440.1 524.2V613.2C440.1 617.4 436.7 620.8 432.5 620.8H296.1C291.9 620.8 288.5 617.4 288.5 613.2V524.2C288.5 520 291.9 516.6 296.1 516.6Z" fill={getZoneColor('207')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="341" y="577.227">207</tspan></text>
          </motion.g>
          <motion.g id="206" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('206')}
          >
            <path d="M180.1 521.5C181.2 517.9 184.8 515.8 188.5 516.4C190.7 516.7 192.9 516.9 195.1 516.9H277C281.2 516.9 284.6 520.3 284.6 524.5V612.9C284.6 617.1 281.2 620.5 277 620.5H195.1C182.7 620.5 170.7 619 159.2 616.1C155 615.1 152.5 610.7 153.8 606.5L180.1 521.5Z" fill={getZoneColor('206')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="202" y="577.227">206</tspan></text>
          </motion.g>
          <motion.g id="205" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('205')}
          >
            <path d="M160.6 496.5C164.1 502 168.7 506.6 174.2 510.1C177.1 511.9 178.4 515.5 177.3 518.8L149.4 603.9C148 608.1 143.3 610.3 139.2 608.5C104.6 593.6 77 565.8 62.1 531.3C60.3 527.2 62.5 522.5 66.7 521.1L151.8 493.4C155.1 492.3 158.7 493.6 160.6 496.5Z" fill={getZoneColor('205')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="96" y="560.227">205</tspan></text>
          </motion.g>
          <motion.g id="204" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('204')}
          >
            <path d="M64.1 516.9C59.9 518.2 55.6 515.7 54.5 511.5C51.7 500.2 50.2 488.4 50.2 476.2V394.8C50.2 390.6 53.6 387.2 57.8 387.2H146.2C150.4 387.2 153.8 390.6 153.8 394.8V476.2C153.8 478.4 154 480.5 154.3 482.6C154.8 486.2 152.5 489.7 149 490.8L64.1 516.9Z" fill={getZoneColor('204')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="78" y="451.227">204</tspan></text>
          </motion.g>
          <motion.g id="203" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('203')}
          >
            <path d="M57.4 279.5H146.9C150.8 279.5 154 282.7 154 286.6V376.1C154 380 150.8 383.2 146.9 383.2H57.4C53.5 383.2 50.3 380 50.3 376.1V286.6C50.3 282.7 53.5 279.5 57.4 279.5Z" fill={getZoneColor('203')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="78" y="340.227">203</tspan></text>
          </motion.g>
          <motion.g id="201" className={isZoneBlocked('201') ? 'cursor-not-allowed' : 'cursor-pointer'}
            animate={{ filter: 'none', opacity: isZoneBlocked('201') ? 0.5 : 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => !isZoneBlocked('201') && onZoneClick('201')}
          >
            <path d="M57.4 64H146.9C150.8 64 154 67.2 154 71.1V160.6C154 164.5 150.8 167.7 146.9 167.7H57.4C53.5 167.7 50.3 164.5 50.3 160.6V71.1C50.3 67.2 53.5 64 57.4 64Z" fill={getZoneColor('201')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="80" y="124.227">201</tspan></text>
          </motion.g>
          <motion.g id="202" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('202')}
          >
            <path d="M57.4 171.7H146.9C150.8 171.7 154 174.9 154 178.8V268.3C154 272.2 150.8 275.4 146.9 275.4H57.4C53.5 275.4 50.3 272.2 50.3 268.3V178.8C50.3 174.9 53.5 171.7 57.4 171.7Z" fill={getZoneColor('202')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 24, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="79" y="232.227">202</tspan></text>
          </motion.g>

          {/* Новые сектора A, B, C */}
          <motion.g id="Sector-A" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('A')}
          >
            <path d="M164 268.255V400.491C164 420.761 190.682 428.171 201.135 410.805L281.782 276.822C286.358 269.22 285.379 259.513 279.377 252.978L225.601 194.429C215.867 183.831 198.461 186.673 192.603 199.817L165.732 260.114C164.59 262.676 164 265.45 164 268.255Z" fill={getZoneColor('A')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 20, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="175.072" y="282.273">SECTOR</tspan><tspan x="208.52" y="306.273">A</tspan></text>
          </motion.g>
          <motion.g id="Sector-B" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('B')}
          >
            <path d="M428.469 305C435.375 305 441.792 308.562 445.444 314.423L547.006 477.423C555.307 490.745 545.728 508 530.031 508H205.03C189.561 508 179.948 491.19 187.793 477.858L283.7 314.858C287.293 308.75 293.851 305 300.937 305H428.469Z" fill={getZoneColor('B')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 20, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="326.072" y="401.273">SECTOR</tspan><tspan x="360.389" y="425.273">B</tspan></text>
          </motion.g>
          <motion.g id="Sector-C" className="cursor-pointer"
            animate={{ filter: 'none', opacity: 1 }}
            transition={{ type: 'tween', duration: 0.18 }}
            onClick={() => onZoneClick('C')}
          >
            <path d="M565.5 268.255V400.491C565.5 420.761 538.818 428.171 528.365 410.805L447.718 276.822C443.142 269.22 444.121 259.513 450.123 252.978L503.899 194.429C513.633 183.831 531.039 186.673 536.897 199.817L563.768 260.114C564.91 262.676 565.5 265.45 565.5 268.255Z" fill={getZoneColor('C')} />
            <text fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 20, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="471.072" y="282.273">SECTOR</tspan><tspan x="504.48" y="306.273">C</tspan></text>
          </motion.g>

          {/* Статические элементы - обновленный дизайн сцены */}
          <g id="Scena">
            <g id="Vector_29">
              <path d="M356.929 92.0711C360.834 88.1659 367.166 88.1659 371.071 92.0711L458.045 179.045C461.95 182.95 461.95 189.282 458.045 193.187L371.071 280.161C367.166 284.067 360.834 284.067 356.929 280.161L269.955 193.187C266.05 189.282 266.05 182.95 269.955 179.045L356.929 92.0711Z" fill="black"/>
              <path d="M201.932 7.07111C205.838 3.16586 212.169 3.16586 216.074 7.0711L349.434 140.431C353.34 144.336 353.34 150.668 349.434 154.573L329.187 174.82C325.282 178.725 318.951 178.725 315.045 174.82L181.685 41.4601C177.78 37.5549 177.78 31.2232 181.685 27.318L201.932 7.07111Z" fill="black"/>
              <path d="M519.599 7.07111C515.694 3.16586 509.362 3.16586 505.457 7.0711L376.071 136.457C372.166 140.362 372.166 146.694 376.071 150.599L396.318 170.846C400.223 174.751 406.555 174.751 410.46 170.846L539.846 41.4601C543.751 37.5549 543.751 31.2232 539.846 27.318L519.599 7.07111Z" fill="black"/>
              <path d="M565 10C565 4.47719 560.523 3.37909e-05 555 3.33081e-05L174 0C168.477 -4.82822e-07 164 4.47715 164 10L164 54C164 59.5229 168.477 64 174 64L555 64.0001C560.523 64.0001 565 59.5229 565 54.0001V10Z" fill="black"/>
            </g>
            <text id="scena" fill="white" style={{ whiteSpace: 'pre', fontFamily: 'var(--font-geist-sans)', fontSize: 18, fontWeight: 'bold', pointerEvents: 'none' }}><tspan x="335.474" y="189.545">SCENA</tspan></text>
          </g>
          <path d="M398.4 624L330.5 624.2C326.3 624.2 323 627.6 323 631.7V662.9C323 667.1 326.4 670.5 330.6 670.4C345.2 670.3 377.6 670.2 398.5 670.2C402.7 670.2 406 666.8 406 662.7V631.6C406 627.4 402.6 624 398.4 624Z" fill="#3B3B3B" />
        </g>
        <defs>
          <clipPath id="clip0_7_419">
            <rect width="728.6" height="670.8" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </div>
  )
}

export default memo(ArenaSVG)