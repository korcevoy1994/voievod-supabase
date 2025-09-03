import { NextRequest, NextResponse } from 'next/server';
import { autoFreeSeatOnFailedPayment } from '@/lib/seat-auto-free';

/**
 * Webhook для обработки изменений статуса платежей
 * Автоматически освобождает места при неудачных платежах
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔔 Получен webhook изменения статуса платежа:', {
      orderId: body.order_id,
      paymentId: body.payment_id,
      status: body.status,
      timestamp: new Date().toISOString()
    });

    // Проверяем обязательные поля
    if (!body.order_id || !body.status) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, status' },
        { status: 400 }
      );
    }

    // Если платеж неудачный, автоматически освобождаем места
    if (body.status === 'failed') {
      console.log(`💳 Обнаружен неудачный платеж для заказа ${body.order_id}`);
      
      const result = await autoFreeSeatOnFailedPayment(body.order_id, body.status);
      
      if (result.success) {
        console.log(`✅ Автоматическое освобождение мест завершено для заказа ${body.order_id}`);
        
        return NextResponse.json({
          success: true,
          message: 'Payment status processed and seats auto-freed if needed',
          orderId: body.order_id,
          paymentStatus: body.status,
          seatFreeingResult: result
        });
      } else {
        console.error(`❌ Ошибка автоматического освобождения мест для заказа ${body.order_id}:`, result.error);
        
        return NextResponse.json({
          success: false,
          message: 'Payment status processed but seat freeing failed',
          orderId: body.order_id,
          paymentStatus: body.status,
          error: result.error
        }, { status: 500 });
      }
    }

    // Для других статусов просто логируем
    console.log(`ℹ️  Платеж для заказа ${body.order_id} имеет статус ${body.status} - действий не требуется`);
    
    return NextResponse.json({
      success: true,
      message: 'Payment status processed',
      orderId: body.order_id,
      paymentStatus: body.status
    });

  } catch (error) {
    console.error('❌ Ошибка в webhook обработки платежей:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint для тестирования webhook
 */
export async function GET() {
  return NextResponse.json({
    message: 'Payment status webhook endpoint is active',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: '/api/webhook/payment-status - Process payment status changes',
    }
  });
}