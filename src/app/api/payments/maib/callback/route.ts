import { NextRequest, NextResponse } from 'next/server';
import { maibClient } from '@/lib/maib-client';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

// POST - обработка callback уведомлений от MAIB
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    

    
    // Согласно документации MAIB, подпись приходит в теле запроса
    const signature = body.signature || request.headers.get('x-maib-signature') || '';
    
    if (!signature) {
      logger.error('No signature provided in MAIB callback');
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Проверяем подпись callback
    if (!maibClient.verifyCallback(body, signature)) {
      logger.error('Invalid MAIB callback signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Согласно документации MAIB, данные приходят в объекте 'result'
    const resultData = body.result || body;
    const {
      payId: transactionId,
      status,
      amount,
      currency,
      orderId,
      statusCode,
      statusMessage,
      rrn,
      approval,
      cardNumber,
      threeDs
    } = resultData;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Находим платеж в нашей базе данных
    const { data: payment, error: paymentError } = await supabase
      .from('order_payments')
      .select('*')
      .eq('provider_payment_id', transactionId)
      .single();

    if (paymentError || !payment) {
      logger.error('Payment not found for transaction', { transactionId });
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Маппинг статусов MAIB на наши статусы
    let newStatus = payment.status;
    switch (status) {
      case 'OK':
      case 'COMPLETED':
      case 'SUCCESS':
      case 'APPROVED':
        newStatus = 'completed';
        break;
      case 'FAILED':
      case 'DECLINED':
      case 'ERROR':
        newStatus = 'failed';
        break;
      case 'CANCELLED':
      case 'CANCELED':
        newStatus = 'cancelled';
        break;
      case 'PENDING':
      case 'PROCESSING':
      case 'WAITING':
        newStatus = 'pending';
        break;
      default:
        logger.warn(`Unknown MAIB status: ${status}`);
        newStatus = 'pending';
    }

    // Обновляем платеж
    const updateData: any = {
      status: newStatus,
      provider_data: {
        ...payment.provider_data,
        status,
        statusCode,
        statusMessage,
        amount,
        currency,
        orderId,
        rrn,
        approval,
        cardNumber,
        threeDs,
        callbackReceived: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('order_payments')
      .update(updateData)
      .eq('id', payment.id);

    if (updateError) {
      logger.error('Error updating payment', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    // Обновляем статус заказа в зависимости от статуса платежа
    if (payment.order_id) {
      let orderStatus = 'pending';
      
      switch (newStatus) {
        case 'completed':
          orderStatus = 'paid';
          break;
        case 'failed':
        case 'cancelled':
          orderStatus = 'cancelled';
          break;
      }

      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          status: orderStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.order_id);

      if (orderUpdateError) {
        logger.error('Error updating order status', orderUpdateError);
      }

      // Обновляем статус мест в зависимости от статуса платежа
      if (newStatus === 'completed') {
        // Если платеж успешен, помечаем места как проданные
        const { data: orderSeats } = await supabase
          .from('order_seats')
          .select('seat_id')
          .eq('order_id', payment.order_id);

        if (orderSeats && orderSeats.length > 0) {
          const seatIds = orderSeats.map(os => os.seat_id);
          await supabase
            .from('seats')
            .update({ status: 'sold' })
            .in('id', seatIds);
        }

        // Генерируем QR код если его еще нет
        const { data: order } = await supabase
          .from('orders')
          .select('qr_code')
          .eq('id', payment.order_id)
          .single();

        if (order && !order.qr_code) {
          const { error: qrError } = await supabase.rpc('generate_order_qr_code', {
            p_order_id: payment.order_id
          });

          if (qrError) {
            logger.error('Error generating QR code', qrError);
          }
        }
      } else if (newStatus === 'failed' || newStatus === 'cancelled') {
        // Если платеж неудачен, освобождаем места
        const { data: orderSeats } = await supabase
          .from('order_seats')
          .select('seat_id')
          .eq('order_id', payment.order_id);

        if (orderSeats && orderSeats.length > 0) {
          const seatIds = orderSeats.map(os => os.seat_id);
          await supabase
            .from('seats')
            .update({ status: 'available' })
            .in('id', seatIds);
          
          logger.info(`Released ${seatIds.length} seats for failed payment`, {
            orderId: payment.order_id,
            paymentId: payment.id,
            seatIds
          });
        }
      }
    }

    // Логируем успешную обработку callback


    return NextResponse.json({
      success: true,
      message: 'Callback processed successfully'
    });
  } catch (error) {
    logger.error('Error processing MAIB callback', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - для проверки доступности endpoint
export async function GET() {
  return NextResponse.json({
    message: 'MAIB callback endpoint is active',
    timestamp: new Date().toISOString()
  });
}