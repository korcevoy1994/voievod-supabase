import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createErrorResponse, createSuccessResponse, withErrorHandling, validateRequiredFields } from '@/lib/apiResponse';

// GET - получить все бронирования
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const eventId = searchParams.get('eventId');
  const status = searchParams.get('status');

  let query = supabase
    .from('bookings')
    .select(`
      *,
      seats:booking_seats(
        seat_id,
        seats(
          zone,
          row,
          number,
          price
        )
      )
    `);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return createErrorResponse(error.message, 500, 'GET /api/bookings');
  }

  return createSuccessResponse(data);
}, 'GET /api/bookings')

// POST - создать новое бронирование
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = createSupabaseServerClient();
  const body = await request.json();
  const { user_id, event_id, seat_ids, customer_info } = body;

  // Валидация обязательных полей
  const validation = validateRequiredFields(body, ['user_id', 'event_id', 'seat_ids']);
  if (!validation.isValid || !Array.isArray(seat_ids) || seat_ids.length === 0) {
    return createErrorResponse(
      'Missing required fields: user_id, event_id, seat_ids (array)',
      400
    );
  }

    // Начинаем транзакцию
    const { data: transaction, error: transactionError } = await supabase.rpc('begin_transaction');

    try {
      // Проверяем доступность мест
      const { data: seats, error: seatsError } = await supabase
        .from('seats')
        .select('id, status, price')
        .in('id', seat_ids)
        .eq('event_id', event_id);

      if (seatsError) {
        throw new Error(seatsError.message);
      }

      // Проверяем, что все места доступны
      const unavailableSeats = seats?.filter(seat => seat.status !== 'available') || [];
      if (unavailableSeats.length > 0) {
        return NextResponse.json(
          { error: 'Some seats are not available', unavailable_seats: unavailableSeats },
          { status: 400 }
        );
      }

      // Вычисляем общую стоимость
      const total_amount = seats?.reduce((sum, seat) => sum + seat.price, 0) || 0;

      // Создаем бронирование
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id,
          event_id,
          total_amount,
          status: 'pending',
          customer_info,
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 минут
        })
        .select()
        .single();

      if (bookingError) {
        throw new Error(bookingError.message);
      }

      // Связываем места с бронированием
      const bookingSeats = seat_ids.map(seat_id => ({
        booking_id: booking.id,
        seat_id
      }));

      const { error: bookingSeatsError } = await supabase
        .from('booking_seats')
        .insert(bookingSeats);

      if (bookingSeatsError) {
        throw new Error(bookingSeatsError.message);
      }

      // Обновляем статус мест на "reserved"
      const { error: updateSeatsError } = await supabase
        .from('seats')
        .update({ status: 'reserved' })
        .in('id', seat_ids);

      if (updateSeatsError) {
        throw new Error(updateSeatsError.message);
      }

      // Коммитим транзакцию
      await supabase.rpc('commit_transaction');

      return createSuccessResponse(booking, 'Booking created successfully', 201);
    } catch (error) {
      // Откатываем транзакцию
      await supabase.rpc('rollback_transaction');
      throw error;
    }
}, 'POST /api/bookings')

// PUT - обновить бронирование
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const supabase = createSupabaseServerClient();
  const body = await request.json();
  const { id, status, ...updateData } = body;

  if (!id) {
    return createErrorResponse('Missing booking ID', 400);
  }

    // Если отменяем бронирование, освобождаем места
    if (status === 'cancelled') {
      const { data: bookingSeats } = await supabase
        .from('booking_seats')
        .select('seat_id')
        .eq('booking_id', id);

      if (bookingSeats && bookingSeats.length > 0) {
        const seatIds = bookingSeats.map(bs => bs.seat_id);
        await supabase
          .from('seats')
          .update({ status: 'available' })
          .in('id', seatIds);
      }
    }

  const { data, error } = await supabase
    .from('bookings')
    .update({ status, ...updateData })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return createErrorResponse(error.message, 500, 'PUT /api/bookings');
  }

  return createSuccessResponse(data, 'Booking updated successfully');
}, 'PUT /api/bookings')

// DELETE - удалить бронирование
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return createErrorResponse('Missing booking ID', 400);
  }

    // Освобождаем места перед удалением
    const { data: bookingSeats } = await supabase
      .from('booking_seats')
      .select('seat_id')
      .eq('booking_id', id);

    if (bookingSeats && bookingSeats.length > 0) {
      const seatIds = bookingSeats.map(bs => bs.seat_id);
      await supabase
        .from('seats')
        .update({ status: 'available' })
        .in('id', seatIds);
    }

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    return createErrorResponse(error.message, 500, 'DELETE /api/bookings');
  }

  return createSuccessResponse(null, 'Booking deleted successfully');
}, 'DELETE /api/bookings')