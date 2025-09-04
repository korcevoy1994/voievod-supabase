import { NextRequest, NextResponse } from 'next/server';
import { maibClient } from '@/lib/maib-client';
import { createSupabaseServerClient } from '@/lib/supabase-server';

interface PaymentRequest {
  paymentMethod: string;
  paymentProvider?: string;
  returnUrl?: string;
  language?: string;
}

// POST - обработать платеж для заказа
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    const { orderId } = await params;
    const body: PaymentRequest = await request.json();
    const { paymentMethod, paymentProvider = 'mock' } = body;

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      );
    }

    // Получаем заказ
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

    // Обрабатываем платеж в зависимости от провайдера
    if (paymentProvider === 'maib') {
      try {
        // Получаем IP адрес клиента
        let clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                        request.headers.get('x-real-ip') ||
                        request.headers.get('cf-connecting-ip') ||
                        '192.168.1.1'; // Используем валидный IP вместо localhost
        
        // Конвертируем IPv6 localhost в IPv4
        if (clientIp === '::1' || clientIp === '127.0.0.1') {
          clientIp = '192.168.1.1'; // MAIB может не принимать localhost IP
        }
        
        // Конвертируем IPv6 localhost в IPv4
        if (clientIp === '::1' || clientIp === '127.0.0.1') {
          clientIp = '192.168.1.1'; // MAIB может не принимать localhost IP
        }
        
        console.log('Client IP for MAIB:', clientIp);
        console.log('Order total_price:', order.total_price, 'type:', typeof order.total_price);
        
        // Создаем платеж через MAIB
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const callbackUrl = `${baseUrl}/api/payments/maib/callback`;
        const successUrl = `${baseUrl}/checkout/success?orderId=${orderId}`;
        const failUrl = `${baseUrl}/checkout/fail?orderId=${orderId}`;
        
        // Убеждаемся, что amount является числом
        const amount = typeof order.total_price === 'string' ? 
          parseFloat(order.total_price) : order.total_price;
        
        const maibPayment = await maibClient.createPayment({
           amount: amount,
           currency: 'MDL',
           description: `Оплата заказа #${orderId}`,
           orderId: orderId,
           okUrl: successUrl,
           failUrl: failUrl,
           callbackUrl,
           language: body.language || 'ro',
           clientIp: clientIp
         });

         if (!maibPayment.payUrl) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Failed to create MAIB payment',
              message: 'Не удалось создать платеж. Попробуйте позже.'
            },
            { status: 500 }
          );
        }

        // Сохраняем информацию о платеже в базе данных
        const { data: payment, error: paymentError } = await supabase
          .from('order_payments')
          .insert({
            order_id: orderId,
            amount: order.total_price,
            payment_method: paymentMethod,
            payment_provider: 'maib',
            provider_payment_id: maibPayment.payId,
            status: 'pending',
            provider_data: {
              payUrl: maibPayment.payUrl,
              transactionId: maibPayment.payId,
              callbackUrl,
              successUrl,
              failUrl,
              language: body.language || 'ro'
            }
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
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            payment_method: paymentMethod,
            status: 'payment_pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (orderUpdateError) {
          console.error('Error updating order:', orderUpdateError);
        }

        return NextResponse.json({
          success: true,
          message: 'Payment created successfully',
          paymentId: payment.id,
          payUrl: maibPayment.payUrl,
          transactionId: maibPayment.payId,
          requiresRedirect: true
        });
      } catch (error) {
        console.error('MAIB payment error:', error);
        return NextResponse.json(
          { 
            success: false,
            error: 'MAIB payment failed',
            message: 'Ошибка при создании платежа. Попробуйте позже.'
          },
          { status: 500 }
        );
      }
    }

    // Для других провайдеров или mock платежей
    const paymentSuccess = Math.random() > 0.1; // 90% успешных платежей

    if (paymentSuccess) {
      // Обновляем статус заказа на 'paid'
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating order status:', updateError);
        return NextResponse.json(
          { error: 'Failed to update order status' },
          { status: 500 }
        );
      }

      // Генерируем QR код если его еще нет
      if (!updatedOrder.qr_code) {
        const { data: qrCode, error: qrError } = await supabase.rpc('generate_order_qr_code', {
          p_order_id: orderId
        });

        if (qrError) {
          console.error('Error generating QR code:', qrError);
        }
      }

      // Автоматически отправляем билеты на почту после успешной оплаты
      try {
        const emailResponse = await fetch(`http://localhost:3001/api/tickets/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId }),
        });

        if (emailResponse.ok) {
          console.log(`Tickets automatically sent via email for order ${orderId}`);
        } else {
          console.error(`Failed to send tickets via email for order ${orderId}:`, await emailResponse.text());
        }
      } catch (emailError) {
        console.error(`Error sending tickets via email for order ${orderId}:`, emailError);
      }

      return NextResponse.json({
        success: true,
        message: 'Payment processed successfully',
        order: updatedOrder,
        paymentId: `pay_${Math.random().toString(36).substr(2, 9)}`
      });
    } else {
      // Имитируем неудачный платеж
      return NextResponse.json(
        { 
          success: false,
          error: 'Payment failed',
          message: 'Платеж не прошел. Попробуйте еще раз или используйте другую карту.'
        },
        { status: 402 }
      );
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - получить статус платежа заказа
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    const { orderId } = await params;

    // Получаем заказ
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, payment_method, total_price, created_at, updated_at')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Получаем детали платежа
    const { data: payments, error: paymentsError } = await supabase
      .from('order_payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    const latestPayment = payments && payments.length > 0 ? payments[0] : null;

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      paymentMethod: order.payment_method,
      totalPrice: order.total_price,
      isPaid: order.status === 'paid',
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      // Детали платежа для отладки
      paymentDetails: latestPayment ? {
        id: latestPayment.id,
        status: latestPayment.status,
        amount: latestPayment.amount,
        provider: latestPayment.provider,
        providerPaymentId: latestPayment.provider_payment_id,
        providerData: latestPayment.provider_data,
        createdAt: latestPayment.created_at,
        updatedAt: latestPayment.updated_at,
        completedAt: latestPayment.completed_at
      } : null,
      allPayments: payments || []
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}