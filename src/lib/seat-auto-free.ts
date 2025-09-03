import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Автоматически освобождает места при неудачных платежах
 * @param orderId ID заказа
 * @param paymentStatus Статус платежа
 */
export async function autoFreeSeatOnFailedPayment(orderId: string, paymentStatus: string) {
  try {
    // Проверяем, является ли платеж неудачным
    if (paymentStatus !== 'failed') {
      return { success: true, message: 'Payment not failed, no action needed' };
    }

    // Проверяю заказ для автоматического освобождения мест

    // Получаем информацию о заказе
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      // Ошибка получения заказа
      return { success: false, error: 'Order not found' };
    }

    // Получаем все платежи для заказа
    const { data: payments, error: paymentsError } = await supabase
      .from('order_payments')
      .select('id, status')
      .eq('order_id', orderId);

    if (paymentsError) {
      // Ошибка получения платежей
      return { success: false, error: 'Failed to fetch payments' };
    }

    // Проверяем статус платежей
    const hasFailedPayments = payments?.some(p => p.status === 'failed') || false;
    const hasSuccessfulPayments = payments?.some(p => p.status === 'paid') || false;

    // Определяем, нужно ли освобождать места
    const shouldFreeSeats = (
      order.status === 'cancelled' || 
      order.status === 'failed' ||
      (hasFailedPayments && !hasSuccessfulPayments)
    );

    if (!shouldFreeSeats) {
      // Места не освобождаются: заказ активен или есть успешные платежи
      return { 
        success: true, 
        message: 'Seats not freed - order has successful payments or is active',
        orderStatus: order.status,
        hasFailedPayments,
        hasSuccessfulPayments
      };
    }

    // Получаем места заказа
    const { data: orderSeats, error: orderSeatsError } = await supabase
      .from('order_seats')
      .select('seat_id')
      .eq('order_id', orderId);

    if (orderSeatsError || !orderSeats || orderSeats.length === 0) {
      // Нет мест для освобождения
      return { success: true, message: 'No seats to free' };
    }

    const seatIds = orderSeats.map(os => os.seat_id);

    // Освобождаем места (меняем статус с 'sold' на 'available')
    const { data: updatedSeats, error: updateError } = await supabase
      .from('seats')
      .update({ status: 'available' })
      .in('id', seatIds)
      .eq('status', 'sold')
      .select('id, zone, row, number');

    if (updateError) {
      // Ошибка освобождения мест
      return { success: false, error: 'Failed to free seats' };
    }

    const freedSeatsCount = updatedSeats?.length || 0;
    
    if (freedSeatsCount > 0) {
      // Освобождено мест
      updatedSeats?.forEach(seat => {
        // Освобождено место
      });
    } else {
      // Все места уже были доступны
    }

    return {
      success: true,
      message: 'Seats freed successfully',
      freedSeatsCount,
      freedSeats: updatedSeats
    };

  } catch (error) {
    // Критическая ошибка в autoFreeSeatOnFailedPayment
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Автоматически освобождает места при отмене заказа
 * @param orderId ID заказа
 * @param orderStatus Новый статус заказа
 */
export async function autoFreeSeatOnCancelledOrder(orderId: string, orderStatus: string) {
  try {
    // Проверяем, является ли заказ отмененным или неудачным
    if (!['cancelled', 'failed'].includes(orderStatus)) {
      return { success: true, message: 'Order not cancelled/failed, no action needed' };
    }

    // Проверяю отмененный заказ для освобождения мест

    // Получаем места заказа
    const { data: orderSeats, error: orderSeatsError } = await supabase
      .from('order_seats')
      .select('seat_id')
      .eq('order_id', orderId);

    if (orderSeatsError || !orderSeats || orderSeats.length === 0) {
      // Нет мест для освобождения
      return { success: true, message: 'No seats to free' };
    }

    const seatIds = orderSeats.map(os => os.seat_id);

    // Освобождаем места
    const { data: updatedSeats, error: updateError } = await supabase
      .from('seats')
      .update({ status: 'available' })
      .in('id', seatIds)
      .eq('status', 'sold')
      .select('id, zone, row, number');

    if (updateError) {
      // Ошибка освобождения мест
      return { success: false, error: 'Failed to free seats' };
    }

    const freedSeatsCount = updatedSeats?.length || 0;
    
    if (freedSeatsCount > 0) {
      // Освобождено мест для отмененного заказа
      updatedSeats?.forEach(seat => {
        // Освобождено место
      });
    } else {
      // Все места уже были доступны
    }

    return {
      success: true,
      message: 'Seats freed successfully for cancelled order',
      freedSeatsCount,
      freedSeats: updatedSeats
    };

  } catch (error) {
    // Критическая ошибка в autoFreeSeatOnCancelledOrder
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Проверяет и освобождает все места с неудачными платежами
 */
export async function checkAndFreeAllFailedPaymentSeats() {
  try {
    // Поиск всех заказов с неудачными платежами

    // Находим все неудачные платежи
    const { data: failedPayments, error: paymentsError } = await supabase
      .from('order_payments')
      .select('order_id')
      .eq('status', 'failed');

    if (paymentsError) {
      // Ошибка получения неудачных платежей
      return { success: false, error: 'Failed to fetch failed payments' };
    }

    if (!failedPayments || failedPayments.length === 0) {
      // Неудачных платежей не найдено
      return { success: true, message: 'No failed payments found' };
    }

    const uniqueOrderIds = [...new Set(failedPayments.map(p => p.order_id))];
    // Найдено заказов с неудачными платежами

    let totalFreedSeats = 0;
    const results = [];

    // Обрабатываем каждый заказ
    for (const orderId of uniqueOrderIds) {
      const result = await autoFreeSeatOnFailedPayment(orderId, 'failed');
      results.push({ orderId, ...result });
      
      if (result.success && result.freedSeatsCount) {
        totalFreedSeats += result.freedSeatsCount;
      }
    }

    // Обработка завершена. Всего освобождено мест

    return {
      success: true,
      message: 'Bulk seat freeing completed',
      totalFreedSeats,
      processedOrders: results.length,
      results
    };

  } catch (error) {
    // Критическая ошибка в checkAndFreeAllFailedPaymentSeats
    return { success: false, error: 'Internal error' };
  }
}