import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// GET - получить информацию о платежах
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let query = supabase
      .from('payments')
      .select(`
        *,
        bookings(
          id,
          user_id,
          event_id,
          total_amount,
          status
        )
      `);

    if (bookingId) {
      query = query.eq('booking_id', bookingId);
    }

    if (userId) {
      query = query.eq('bookings.user_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - создать платеж
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    const { booking_id, payment_method, payment_provider = 'stripe' } = body;

    if (!booking_id || !payment_method) {
      return NextResponse.json(
        { error: 'Missing required fields: booking_id, payment_method' },
        { status: 400 }
      );
    }

    // Получаем информацию о бронировании
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Проверяем, что бронирование в статусе pending
    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Booking is not in pending status' },
        { status: 400 }
      );
    }

    // Проверяем, что бронирование не истекло
    if (new Date(booking.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Booking has expired' },
        { status: 400 }
      );
    }

    // Создаем платеж
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id,
        amount: booking.total_amount,
        payment_method,
        payment_provider,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    // Здесь должна быть интеграция с платежным провайдером (Stripe, PayPal и т.д.)
    // Для демонстрации создаем mock payment intent
    const paymentIntent = {
      id: `pi_${Math.random().toString(36).substr(2, 9)}`,
      client_secret: `pi_${Math.random().toString(36).substr(2, 9)}_secret_${Math.random().toString(36).substr(2, 9)}`,
      amount: booking.total_amount * 100, // в копейках для Stripe
      currency: 'mdl',
      status: 'requires_payment_method'
    };

    // Обновляем платеж с данными от провайдера
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        provider_payment_id: paymentIntent.id,
        provider_data: paymentIntent
      })
      .eq('id', payment.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      payment: updatedPayment,
      payment_intent: paymentIntent
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - обновить статус платежа
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    const { id, status, provider_payment_id, provider_data } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      );
    }

    // Получаем текущий платеж
    const { data: currentPayment, error: currentPaymentError } = await supabase
      .from('payments')
      .select('*, bookings(*)')
      .eq('id', id)
      .single();

    if (currentPaymentError || !currentPayment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Обновляем платеж
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (provider_payment_id) {
      updateData.provider_payment_id = provider_payment_id;
    }

    if (provider_data) {
      updateData.provider_data = provider_data;
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    // Если платеж успешен, обновляем статус бронирования и мест
    if (status === 'completed') {
      // Обновляем бронирование
      await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', currentPayment.booking_id);

      // Обновляем места на "sold"
      const { data: bookingSeats } = await supabase
        .from('booking_seats')
        .select('seat_id')
        .eq('booking_id', currentPayment.booking_id);

      if (bookingSeats && bookingSeats.length > 0) {
        const seatIds = bookingSeats.map(bs => bs.seat_id);
        await supabase
          .from('seats')
          .update({ status: 'sold' })
          .in('id', seatIds);
      }
    }

    // Если платеж отклонен, освобождаем места
    if (status === 'failed' || status === 'cancelled') {
      // Обновляем бронирование
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', currentPayment.booking_id);

      // Освобождаем места
      const { data: bookingSeats } = await supabase
        .from('booking_seats')
        .select('seat_id')
        .eq('booking_id', currentPayment.booking_id);

      if (bookingSeats && bookingSeats.length > 0) {
        const seatIds = bookingSeats.map(bs => bs.seat_id);
        await supabase
          .from('seats')
          .update({ status: 'available' })
          .in('id', seatIds);
      }
    }

    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST webhook для обработки уведомлений от платежных провайдеров
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    const { provider, event_type, payment_id, status, data } = body;

    // Здесь должна быть проверка подписи webhook от провайдера
    // Для демонстрации пропускаем проверку

    if (!provider || !event_type || !payment_id) {
      return NextResponse.json(
        { error: 'Invalid webhook data' },
        { status: 400 }
      );
    }

    // Находим платеж по provider_payment_id
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('provider_payment_id', payment_id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Обрабатываем различные типы событий
    let newStatus = payment.status;
    switch (event_type) {
      case 'payment_intent.succeeded':
      case 'charge.succeeded':
        newStatus = 'completed';
        break;
      case 'payment_intent.payment_failed':
      case 'charge.failed':
        newStatus = 'failed';
        break;
      case 'payment_intent.canceled':
        newStatus = 'cancelled';
        break;
      default:
        // Неизвестный тип события, просто логируем
        // Unknown webhook event
        return NextResponse.json({ message: 'Event received' });
    }

    // Обновляем платеж через PUT метод
    const updateResponse = await PUT(new NextRequest(request.url, {
      method: 'PUT',
      body: JSON.stringify({
        id: payment.id,
        status: newStatus,
        provider_data: data
      })
    }));

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}