import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createErrorResponse, createSuccessResponse, withErrorHandling } from '@/lib/apiResponse'
import { logger } from '@/lib/logger'

export const GET = withErrorHandling(async () => {
  const supabase = createSupabaseServerClient();
  
  // Получаем все зоны из zone_colors (это основной источник зон)
  const { data: zoneColors, error: colorsError } = await supabase
    .from('zone_colors')
    .select('zone, color, name')
    .order('zone')
  
  if (colorsError) {
    return createErrorResponse('Failed to fetch zone colors', 500, 'GET /api/zones')
  }

  // Формируем результат из всех зон в zone_colors
  const zones = (zoneColors || []).map(zoneColor => {
    return {
      zone_id: zoneColor.zone,
      id: zoneColor.zone, // для совместимости
      name: zoneColor.name || `Зона ${zoneColor.zone}`,
      color: zoneColor.color || '#8525D9'
    }
  })

  return createSuccessResponse({ zones })
}, 'GET /api/zones')