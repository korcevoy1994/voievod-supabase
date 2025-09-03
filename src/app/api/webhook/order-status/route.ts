import { NextRequest, NextResponse } from 'next/server';
import { autoFreeSeatOnCancelledOrder } from '@/lib/seat-auto-free';

/**
 * Webhook для обработки изменений статуса заказов
 * Автоматически освобождает места при отмене заказов
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔔 Получен webhook изменения статуса заказа:', {
      orderId: body.order_id,
      status: body.status,
      previousStatus: body.previous_status,
      timestamp: new Date().toISOString()
    });

    // Проверяем обязательные поля
    if (!body.order_id || !body.status) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, status' },
        { status: 400 }
      );
    }

    // Если заказ отменен или неудачен, автоматически освобождаем места
    if (['cancelled', 'failed'].includes(body.status)) {
      console.log(`📦 Обнаружен отмененный/неудачный заказ ${body.order_id} со статусом ${body.status}`);
      
      const result = await autoFreeSeatOnCancelledOrder(body.order_id, body.status);
      
      if (result.success) {
        console.log(`✅ Автоматическое освобождение мест завершено для заказа ${body.order_id}`);
        
        return NextResponse.json({
          success: true,
          message: 'Order status processed and seats auto-freed if needed',
          orderId: body.order_id,
          orderStatus: body.status,
          seatFreeingResult: result
        });
      } else {
        console.error(`❌ Ошибка автоматического освобождения мест для заказа ${body.order_id}:`, result.error);
        
        return NextResponse.json({
          success: false,
          message: 'Order status processed but seat freeing failed',
          orderId: body.order_id,
          orderStatus: body.status,
          error: result.error
        }, { status: 500 });
      }
    }

    // Для других статусов просто логируем
    console.log(`ℹ️  Заказ ${body.order_id} имеет статус ${body.status} - действий не требуется`);
    
    return NextResponse.json({
      success: true,
      message: 'Order status processed',
      orderId: body.order_id,
      orderStatus: body.status
    });

  } catch (error) {
    console.error('❌ Ошибка в webhook обработки заказов:', error);
    
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
    message: 'Order status webhook endpoint is active',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: '/api/webhook/order-status - Process order status changes',
    }
  });
}