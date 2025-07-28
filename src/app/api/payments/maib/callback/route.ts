import { NextRequest, NextResponse } from 'next/server';
import { maibClient } from '@/lib/maib-client';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// POST - обработка callback уведомлений от MAIB
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    const signature = request.headers.get('x-maib-signature') || '';

    // Проверяем подпись callback
    if (!maibClient.verifyCallback(body, signature)) {
      console.error('Invalid MAIB callback signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const {
      transactionId,
      status,
      amount,
      currency,
      orderId,
      paymentDate,
      errorCode,
      errorMessage
    } = body;

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Находим платеж в нашей базе данных
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('provider_payment_id', transactionId)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found for transaction:', transactionId);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Маппинг статусов MAIB на наши статусы
    let newStatus = payment.status;
    switch (status) {
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
        console.log(`Unknown MAIB status: ${status}`);
        newStatus = 'pending';
    }

    // Обновляем платеж
    const updateData: any = {
      status: newStatus,
      provider_data: {
        ...payment.provider_data,
        status,
        amount,
        currency,
        orderId,
        paymentDate,
        errorCode,
        errorMessage,
        callbackReceived: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    // Обновляем статус заказа в зависимости от статуса платежа
    if (orderId) {
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
        .eq('id', orderId);

      if (orderUpdateError) {
        console.error('Error updating order status:', orderUpdateError);
      }

      // Если платеж успешен, генерируем QR код если его еще нет
      if (newStatus === 'completed') {
        const { data: order } = await supabase
          .from('orders')
          .select('qr_code')
          .eq('id', orderId)
          .single();

        if (order && !order.qr_code) {
          const { error: qrError } = await supabase.rpc('generate_order_qr_code', {
            p_order_id: orderId
          });

          if (qrError) {
            console.error('Error generating QR code:', qrError);
          }
        }
      }
    }

    // Логируем успешную обработку callback
    console.log(`MAIB callback processed successfully:`, {
      transactionId,
      status: newStatus,
      orderId,
      amount
    });

    return NextResponse.json({
      success: true,
      message: 'Callback processed successfully'
    });
  } catch (error) {
    console.error('Error processing MAIB callback:', error);
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