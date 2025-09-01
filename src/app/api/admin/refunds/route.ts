import { NextRequest, NextResponse } from 'next/server';
import { maibClient } from '@/lib/maib-client';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

// POST - создание возврата платежа
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    
    const { orderId, paymentId, amount, reason, refundAmount } = body;
    
    if (!orderId && !paymentId) {
      return NextResponse.json(
        { error: 'Order ID or Payment ID is required' },
        { status: 400 }
      );
    }
    
    // Находим платеж
    let query = supabase
      .from('order_payments')
      .select(`
        *,
        orders!inner(
          id,
          status,
          total_price,
          user_id,
          event_id
        )
      `);
    
    if (paymentId) {
      query = query.eq('id', paymentId);
    } else {
      query = query.eq('order_id', orderId);
    }
    
    const { data: payments, error: paymentError } = await query;
    
    if (paymentError || !payments || payments.length === 0) {
      logger.error('Payment not found', { orderId, paymentId, error: paymentError });
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    const payment = payments[0];
    
    // Проверяем, что платеж можно вернуть
    if (payment.status !== 'completed') {
      return NextResponse.json(
        { error: 'Only completed payments can be refunded' },
        { status: 400 }
      );
    }
    
    // Проверяем, не был ли уже сделан возврат
    const { data: existingRefund } = await supabase
      .from('order_payments')
      .select('id')
      .eq('order_id', payment.order_id)
      .eq('payment_method', 'refund')
      .single();
    
    if (existingRefund) {
      return NextResponse.json(
        { error: 'Refund already exists for this order' },
        { status: 400 }
      );
    }
    
    // Определяем сумму возврата
    const finalRefundAmount = refundAmount || amount || payment.amount;

    if (finalRefundAmount > payment.amount) {
      return NextResponse.json(
        { error: 'Refund amount cannot exceed original payment amount' },
        { status: 400 }
      );
    }
    
    // Выполняем возврат через MAIB
    let maibRefundSuccess = false;
    let maibError = null;
    
    if (payment.provider_payment_id && payment.payment_provider === 'maib') {
      try {
        maibRefundSuccess = await maibClient.refundPayment(
          payment.provider_payment_id,
          finalRefundAmount
        );
      } catch (error: any) {
        maibError = error.message;
        logger.error('MAIB refund failed', {
          transactionId: payment.provider_payment_id,
          amount: finalRefundAmount,
          error: error.message
        });
      }
    }
    
    // Создаем запись о возврате в базе данных
    const refundData: any = {
      order_id: payment.order_id,
      amount: -Math.abs(finalRefundAmount), // Отрицательная сумма для возврата
      payment_method: 'refund',
      payment_provider: payment.payment_provider,
      status: maibRefundSuccess ? 'completed' : 'failed',
      provider_payment_id: payment.provider_payment_id,
      provider_data: {
        original_payment_id: payment.id,
        refund_reason: reason || 'Admin refund',
        maib_refund_success: maibRefundSuccess,
        maib_error: maibError,
        refund_date: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (maibRefundSuccess) {
      refundData.completed_at = new Date().toISOString();
    }
    
    const { data: refund, error: refundError } = await supabase
      .from('order_payments')
      .insert(refundData)
      .select()
      .single();
    
    if (refundError) {
      logger.error('Error creating refund record', refundError);
      return NextResponse.json(
        { error: 'Failed to create refund record' },
        { status: 500 }
      );
    }
    
    // Обновляем статус заказа
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.order_id);
    
    if (orderUpdateError) {
      logger.error('Error updating order status', orderUpdateError);
    }
    
    // Обновляем статус билетов
    const { error: ticketsUpdateError } = await supabase
      .from('tickets')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('order_id', payment.order_id);
    
    if (ticketsUpdateError) {
      logger.error('Error updating tickets status', ticketsUpdateError);
    }
    
    // Освобождаем места через связь с билетами
    const { data: orderTickets } = await supabase
      .from('tickets')
      .select('seat_id')
      .eq('order_id', payment.order_id)
      .not('seat_id', 'is', null);
    
    if (orderTickets && orderTickets.length > 0) {
      const seatIds = orderTickets.map(ticket => ticket.seat_id);
      const { error: seatsUpdateError } = await supabase
        .from('seats')
        .update({
          status: 'available',
          reserved_by: null,
          expires_at: null,
          updated_at: new Date().toISOString()
        })
        .in('id', seatIds);
      
      if (seatsUpdateError) {
         logger.error('Error updating seats status', seatsUpdateError);
       }
     }
    
    logger.info('Refund processed successfully', {
      orderId: payment.order_id,
      paymentId: payment.id,
      refundId: refund.id,
      amount: finalRefundAmount,
      maibSuccess: maibRefundSuccess
    });
    
    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: finalRefundAmount,
        status: refund.status,
        maib_success: maibRefundSuccess,
        maib_error: maibError
      },
      message: maibRefundSuccess 
        ? 'Refund processed successfully'
        : 'Refund record created, but MAIB refund failed'
    });
    
  } catch (error) {
    logger.error('Error processing refund', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - получение списка возвратов
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('order_payments')
      .select(`
        *,
        orders!inner(
          id,
          status,
          total_price,
          user_id,
          event_id
        )
      `)
      .eq('payment_method', 'refund')
      .order('created_at', { ascending: false });
    
    if (orderId) {
      query = query.eq('order_id', orderId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: refunds, error: refundsError } = await query
      .range(offset, offset + limit - 1);
    
    if (refundsError) {
      logger.error('Error fetching refunds', refundsError);
      return NextResponse.json(
        { error: 'Failed to fetch refunds' },
        { status: 500 }
      );
    }
    
    // Получаем общее количество возвратов
    const { count, error: countError } = await supabase
      .from('order_payments')
      .select('*', { count: 'exact', head: true })
      .eq('payment_method', 'refund');
    
    if (countError) {
      logger.error('Error counting refunds', countError);
    }
    
    return NextResponse.json({
      refunds: refunds || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error) {
    logger.error('Error fetching refunds', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}