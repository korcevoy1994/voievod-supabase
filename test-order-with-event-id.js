const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testOrderCreation() {
  console.log('Testing order creation with event_id...')
  
  try {
    // Создаем тестовый заказ
    const testOrder = {
      userId: 'test-user-123',
      customerInfo: {
        firstName: 'Тест',
        lastName: 'Пользователь',
        email: 'test@example.com',
        phone: '+373 69 123 456'
      },
      seats: [
        {
          id: 'test-seat-1',
          zone: '201',
          row: 'K',
          number: '14',
          price: 500
        }
      ],
      generalAccess: [
        {
          id: 'test-ga-1',
          name: 'General Access',
          price: 300,
          quantity: 2
        }
      ],
      totalPrice: 1300,
      totalTickets: 3,
      paymentMethod: 'card'
    }
    
    // Отправляем POST запрос к API
    const response = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testOrder)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✓ Order created successfully:', result.orderId)
      
      // Проверяем, что записи созданы с event_id
      const { data: orderSeats } = await supabase
        .from('order_seats')
        .select('*')
        .eq('order_id', result.orderId)
      
      const { data: orderGA } = await supabase
        .from('order_general_access')
        .select('*')
        .eq('order_id', result.orderId)
      
      const { data: orderPayments } = await supabase
        .from('order_payments')
        .select('*')
        .eq('order_id', result.orderId)
      
      console.log('\n=== ORDER VERIFICATION ===')
      console.log('Order seats with event_id:', orderSeats?.map(s => ({ 
        seat_id: s.seat_id, 
        event_id: s.event_id 
      })))
      console.log('Order GA with event_id:', orderGA?.map(ga => ({ 
        ticket_name: ga.ticket_name, 
        event_id: ga.event_id 
      })))
      console.log('Order payments with event_id:', orderPayments?.map(p => ({ 
        amount: p.amount, 
        event_id: p.event_id 
      })))
      
      // Проверяем билеты
      const { data: tickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('order_id', result.orderId)
      
      console.log('Tickets with event_id:', tickets?.map(t => ({ 
        ticket_number: t.ticket_number, 
        event_id: t.event_id,
        ticket_type: t.ticket_type
      })))
      
    } else {
      console.error('✗ Order creation failed:', result)
    }
    
  } catch (error) {
    console.error('Error testing order creation:', error)
  }
}

testOrderCreation()