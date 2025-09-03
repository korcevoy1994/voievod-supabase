import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { orderId, paymentId, action } = await request.json();
    
    console.log('Auto-free seats triggered:', { orderId, paymentId, action });
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    // Получаем информацию о заказе
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Получаем места заказа
    const { data: orderSeats, error: orderSeatsError } = await supabase
      .from('order_seats')
      .select('seat_id, price')
      .eq('order_id', orderId);
    
    // Получаем платежи заказа
    const { data: orderPayments, error: orderPaymentsError } = await supabase
      .from('order_payments')
      .select('*')
      .eq('order_id', orderId);
    
    if (orderPaymentsError) {
      console.error('Error fetching payments:', orderPaymentsError);
      return NextResponse.json({ error: 'Error fetching payments' }, { status: 500 });
    }
    
    // Получаем информацию о местах
     let seats: any[] = [];
    if (orderSeats && orderSeats.length > 0) {
      const seatIds = orderSeats.map(os => os.seat_id);
      const { data: seatsData, error: seatsError } = await supabase
        .from('seats')
        .select('id, zone, row, number, status')
        .in('id', seatIds);
      
      if (!seatsError && seatsData) {
        seats = seatsData;
      }
    }
    
    // Формируем объект заказа с данными
    const orderWithData = {
      ...order,
      order_seats: orderSeats?.map(os => ({
        ...os,
        seats: seats.find(s => s.id === os.seat_id)
      })) || [],
      order_payments: orderPayments || []
    };

    // Проверяем статус платежей
    const hasFailedPayments = orderPayments?.some(p => p.status === 'failed') || false;
    const hasSuccessfulPayments = orderPayments?.some(p => p.status === 'paid') || false;
    
    console.log('Payment status check:', {
      hasFailedPayments,
      hasSuccessfulPayments,
      orderStatus: orderWithData.status
    });
    
    // Проверяем, можно ли освободить места
    const canFreeSeats = orderWithData.status === 'cancelled' || orderWithData.status === 'failed' || 
                        (hasFailedPayments && !hasSuccessfulPayments);
    
    if (!canFreeSeats) {
      return NextResponse.json({
        success: false,
        message: 'Места нельзя освободить: заказ не отменен и есть успешные платежи',
        order: {
          id: orderWithData.id,
          status: orderWithData.status,
          hasFailedPayments,
          hasSuccessfulPayments
        }
      });
    }
    
    if (orderSeatsError) {
      console.error('Error fetching order seats:', orderSeatsError);
      return NextResponse.json({ error: 'Error fetching order seats' }, { status: 500 });
    }
    
    if (!orderSeats || orderSeats.length === 0) {
      return NextResponse.json({ message: 'No seats found for order' });
    }
    
    const seatIds = orderSeats.map(os => os.seat_id);
    
    // Освобождаем места
    const { data: updatedSeats, error: updateError } = await supabase
      .from('seats')
      .update({ 
        status: 'available',
        updated_at: new Date().toISOString()
      })
      .in('id', seatIds)
      .eq('status', 'sold')
      .select('id, zone, row, number');
    
    if (updateError) {
      console.error('Error updating seats:', updateError);
      return NextResponse.json({ error: 'Error updating seats' }, { status: 500 });
    }
    
    console.log('Seats freed:', updatedSeats);
    
    return NextResponse.json({
      message: 'Seats freed successfully',
      freedSeats: updatedSeats?.length || 0,
      seats: updatedSeats,
      orderId,
      orderStatus: order.status
    });
    
  } catch (error) {
    console.error('Error in auto-free-seats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint для проверки статуса
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }
    
    // Получаем информацию о заказе
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.error('Order fetch error:', orderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Получаем места заказа
    const { data: orderSeats, error: orderSeatsError } = await supabase
      .from('order_seats')
      .select('seat_id, price')
      .eq('order_id', orderId);
    
    // Получаем платежи заказа
    const { data: orderPayments, error: orderPaymentsError } = await supabase
      .from('order_payments')
      .select('id, status, amount, created_at')
      .eq('order_id', orderId);
    
    // Получаем информацию о местах
    let seats: any[] = [];
    if (orderSeats && orderSeats.length > 0) {
      const seatIds = orderSeats.map(os => os.seat_id);
      const { data: seatsData, error: seatsError } = await supabase
        .from('seats')
        .select('id, zone, row, number, status')
        .in('id', seatIds);
      
      if (!seatsError && seatsData) {
        seats = seatsData;
      }
    }
    
    // Формируем объект заказа с данными
    const orderWithData = {
      ...order,
      order_seats: orderSeats?.map(os => ({
        ...os,
        seats: seats.find(s => s.id === os.seat_id)
      })) || [],
      order_payments: orderPayments || []
    };

    // Проверяем статус платежей
    const hasFailedPayments = orderPayments?.some(p => p.status === 'failed') || false;
    const hasSuccessfulPayments = orderPayments?.some(p => p.status === 'paid') || false;
    
    return NextResponse.json({
      order: orderWithData,
      canFreeSeats: orderWithData.status === 'cancelled' || orderWithData.status === 'failed' || hasFailedPayments,
      hasFailedPayments,
      hasSuccessfulPayments,
      seatsToFree: orderWithData.order_seats?.filter((os: any) => os.seats?.status === 'sold').length || 0
    });
    
  } catch (error) {
    console.error('Error in auto-free-seats GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}