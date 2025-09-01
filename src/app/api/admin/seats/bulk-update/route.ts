import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createErrorResponse, createSuccessResponse, withErrorHandling } from '@/lib/apiResponse';

// POST - массовое обновление статуса мест
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = createSupabaseServerClient();
  const body = await request.json();
  const { zones, status, event_id } = body;

  // Валидация входных данных
  if (!zones || !Array.isArray(zones) || zones.length === 0) {
    return createErrorResponse('Zones array is required', 400);
  }

  if (!status) {
    return createErrorResponse('Status is required', 400);
  }

  // Проверяем валидность статуса
  const validStatuses = ['available', 'unavailable', 'selected', 'reserved', 'sold', 'blocked'];
  if (!validStatuses.includes(status)) {
    return createErrorResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
  }

  try {
    // Если указан event_id, обновляем места для конкретного события
    let query = supabase
      .from('seats')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .in('zone', zones);

    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    const { data, error, count } = await query.select('id, zone, row, number, status');

    if (error) {
      return createErrorResponse(error.message, 500, 'POST /api/admin/seats/bulk-update');
    }

    return createSuccessResponse({
      updated_seats: data,
      count: count || data?.length || 0,
      zones,
      status
    }, `Successfully updated ${count || data?.length || 0} seats to status '${status}'`);

  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'POST /api/admin/seats/bulk-update'
    );
  }
}, 'POST /api/admin/seats/bulk-update');

// GET - получить информацию о местах в зонах
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const zones = searchParams.get('zones')?.split(',') || [];
  const event_id = searchParams.get('event_id');
  const status = searchParams.get('status');

  if (zones.length === 0) {
    return createErrorResponse('Zones parameter is required', 400);
  }

  try {
    let query = supabase
      .from('seats')
      .select('id, zone, row, number, status, price, updated_at')
      .in('zone', zones)
      .order('zone')
      .order('row')
      .order('number');

    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return createErrorResponse(error.message, 500, 'GET /api/admin/seats/bulk-update');
    }

    // Группируем по зонам и статусам для статистики
    const stats = data?.reduce((acc, seat) => {
      if (!acc[seat.zone]) {
        acc[seat.zone] = {};
      }
      if (!acc[seat.zone][seat.status]) {
        acc[seat.zone][seat.status] = 0;
      }
      acc[seat.zone][seat.status]++;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    return createSuccessResponse({
      seats: data,
      total_count: data?.length || 0,
      zones,
      stats
    });

  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'GET /api/admin/seats/bulk-update'
    );
  }
}, 'GET /api/admin/seats/bulk-update');