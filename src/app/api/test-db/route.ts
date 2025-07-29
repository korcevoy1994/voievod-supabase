import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    // Проверяем существование таблиц через прямые запросы
    const tableChecks = []
    
    // Проверяем таблицу orders
    const { data: ordersTest, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .limit(1)
    
    tableChecks.push({
      table: 'orders',
      exists: !ordersError,
      error: ordersError?.message
    })
    
    // Проверяем таблицу order_seats
    const { data: seatsTest, error: seatsError } = await supabase
      .from('order_seats')
      .select('id')
      .limit(1)
    
    tableChecks.push({
      table: 'order_seats',
      exists: !seatsError,
      error: seatsError?.message
    })
    
    // Проверяем таблицу order_general_access
    const { data: gaTest, error: gaError } = await supabase
      .from('order_general_access')
      .select('id')
      .limit(1)
    
    tableChecks.push({
      table: 'order_general_access',
      exists: !gaError,
      error: gaError?.message
    })
    
    // Проверяем, есть ли критические ошибки
    const missingTables = tableChecks.filter(check => !check.exists)
    if (missingTables.length > 0) {
      console.error('Missing tables:', missingTables)
    }
    
    // Пробуем создать тестовый заказ
    const testOrderData = {
      user_id: 'test-user-123',
      customer_email: 'test@example.com',
      customer_first_name: 'Test',
      customer_last_name: 'User',
      customer_phone: '+373 69 123 456',
      total_price: 100,
      total_tickets: 1,
      payment_method: 'card',
      status: 'pending'
    }
    
    const { data: testOrder, error: orderError } = await supabase
      .from('orders')
      .insert(testOrderData)
      .select()
      .single()
    
    let orderResult = null
    if (orderError) {
      console.error('Error creating test order:', orderError)
      orderResult = { error: orderError.message, code: orderError.code }
    } else {
      orderResult = { success: true, orderId: testOrder.id }
      
      // Удаляем тестовый заказ
      await supabase
        .from('orders')
        .delete()
        .eq('id', testOrder.id)
    }
    
    return NextResponse.json({
      success: true,
      tableChecks,
      missingTables: missingTables.length,
      testOrderResult: orderResult
    })
    
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { error: 'Database test failed', details: error },
      { status: 500 }
    )
  }
}