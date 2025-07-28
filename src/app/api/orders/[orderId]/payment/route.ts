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
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = createSupabaseServerClient();
    const { orderId } = params;
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
        // Создаем платеж через MAIB
        const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/maib/callback`;
        const returnUrl = body.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}/success`;
        
        const maibPayment = await maibClient.createPayment({
           amount: order.total_price,
           currency: 'MDL',
           description: `Оплата заказа #${orderId}`,
           orderId: orderId,
           okUrl: returnUrl,
           failUrl: returnUrl,
           callbackUrl,
           language: body.language || 'ro'
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
          .from('payments')
          .insert({
            order_id: orderId,
            amount: order.total_price,
            currency: 'MDL',
            provider: 'maib',
            provider_payment_id: maibPayment.transactionId,
            status: 'pending',
            provider_data: {
              payUrl: maibPayment.payUrl,
              transactionId: maibPayment.transactionId,
              callbackUrl,
              returnUrl,
              language: body.language || 'ro'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
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
          transactionId: maibPayment.transactionId,
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
  { params }: { params: { orderId: string } }
) {
  try {
    const supabase = createSupabaseServerClient();
    const { orderId } = params;

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

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      paymentMethod: order.payment_method,
      totalPrice: order.total_price,
      isPaid: order.status === 'paid',
      createdAt: order.created_at,
      updatedAt: order.updated_at
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}