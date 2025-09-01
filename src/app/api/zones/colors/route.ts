import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createErrorResponse, createSuccessResponse, withErrorHandling } from '@/lib/apiResponse'

export const GET = withErrorHandling(async () => {
  const supabase = createSupabaseServerClient()
  // Получаем цвета всех зон
  const { data: colors, error } = await supabase
    .from('zone_colors')
    .select(`
      zone,
      color,
      name
    `)
    .order('zone')

  if (error) {
    return createErrorResponse('Failed to fetch zone colors', 500, 'GET /api/zones/colors')
  }

  // Преобразуем в формат объекта для удобства использования
  const zoneColors: Record<string, string> = {}
  colors?.forEach(item => {
    zoneColors[item.zone] = item.color
  })

  return createSuccessResponse({ 
    zoneColors,
    detailedColors: colors 
  })
}, 'GET /api/zones/colors')

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const supabase = createSupabaseServerClient()
  const { zone, color, name } = await request.json()

  if (!zone || !color) {
    return createErrorResponse('Zone and color are required', 400)
  }

  // Обновляем цвет зоны
  const { data, error } = await supabase
    .from('zone_colors')
    .upsert({
      zone,
      color,
      name: name || null
    })
    .select()

  if (error) {
    return createErrorResponse('Failed to update zone color', 500, 'PUT /api/zones/colors')
  }

  return createSuccessResponse({ success: true, data })
}, 'PUT /api/zones/colors')