import { NextRequest, NextResponse } from 'next/server';
import { maibClient } from '@/lib/maib-client';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// POST - создать MAIB платеж
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    const { orderId, amount, currency = 'MDL', description } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, amount' },
        { status: 400 }
      );
    }

    // Получаем информацию о заказе
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: 'Order is not in pending status' },
        { status: 400 }
      );
    }

    // Создаем платеж через MAIB API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Получаем IP адрес клиента
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';
    
    const paymentData = {
      amount: parseFloat(amount.toFixed(2)), // MAIB принимает сумму в формате X.XX (лей)
      currency,
      clientIp,
      orderId,
      description: description || `Оплата заказа №${orderId}`,
      okUrl: `${baseUrl}/payment/success?orderId=${orderId}`,
      failUrl: `${baseUrl}/payment/failed?orderId=${orderId}`,
      callbackUrl: `${baseUrl}/api/payments/maib/callback`,
    };

    const paymentResponse = await maibClient.createPayment(paymentData);

    // Сохраняем информацию о платеже в базе данных
    const { data: payment, error: paymentError } = await supabase
      .from('order_payments')
      .insert({
        order_id: orderId,
        amount: amount,
        payment_method: 'card',
        payment_provider: 'maib',
        status: 'pending',
        provider_payment_id: paymentResponse.payId,
        provider_data: {
          payUrl: paymentResponse.payUrl,
          payId: paymentResponse.payId,
          orderId: orderId,
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error saving payment:', paymentError);
      return NextResponse.json(
        { error: 'Failed to save payment information' },
        { status: 500 }
      );
    }

    // Обновляем заказ с информацией о платеже
    await supabase
      .from('orders')
      .update({
        payment_method: 'maib',
        maib_transaction_id: paymentResponse.payId,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      payUrl: paymentResponse.payUrl,
      transactionId: paymentResponse.payId,
    });
  } catch (error) {
    console.error('MAIB payment creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create MAIB payment' },
      { status: 500 }
    );
  }
}

// GET - получить статус MAIB платежа
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Получаем информацию о платеже от MAIB
    const paymentInfo = await maibClient.getPaymentInfo(transactionId);

    // Обновляем статус в нашей базе данных
    const { data: payment, error: paymentError } = await supabase
      .from('order_payments')
      .select('*')
      .eq('provider_payment_id', transactionId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found in database' },
        { status: 404 }
      );
    }

    // Маппинг статусов MAIB на наши статусы
    let status = payment.status;
    switch (paymentInfo.status) {
      case 'COMPLETED':
      case 'SUCCESS':
        status = 'completed';
        break;
      case 'FAILED':
      case 'DECLINED':
        status = 'failed';
        break;
      case 'CANCELLED':
        status = 'cancelled';
        break;
      case 'PENDING':
      case 'PROCESSING':
        status = 'pending';
        break;
    }

    // Обновляем статус если он изменился
    if (status !== payment.status) {
      await supabase
        .from('order_payments')
        .update({
          status,
          provider_data: {
            ...payment.provider_data,
            ...paymentInfo,
          },
          updated_at: new Date().toISOString(),
          ...(status === 'completed' && { completed_at: new Date().toISOString() })
        })
        .eq('id', payment.id);

      // Если платеж завершен успешно, обновляем заказ
      if (status === 'completed') {
        await supabase
          .from('orders')
          .update({
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.order_id);
      }
    }

    return NextResponse.json({
      transactionId,
      status,
      amount: paymentInfo.amount,
      currency: paymentInfo.currency,
      orderId: paymentInfo.orderId,
      paymentDate: paymentInfo.paymentDate,
    });
  } catch (error) {
    console.error('Error getting MAIB payment status:', error);
    return NextResponse.json(
      { error: 'Failed to get payment status' },
      { status: 500 }
    );
  }
}