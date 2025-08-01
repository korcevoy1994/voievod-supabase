require('dotenv').config({ path: '.env.local' });
const { randomUUID } = require('crypto');

async function testCashOrder() {
  try {
    console.log('Testing cash order creation...');
    
    // Тестовые данные заказа
    const orderData = {
      userId: randomUUID(),
      customerInfo: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+373 69 123 456'
      },
      seats: [],
      generalAccess: [
        {
          id: 'general-1',
          name: 'General Access',
          price: 100,
          quantity: 1
        }
      ],
      totalPrice: 100,
      totalTickets: 1,
      paymentMethod: 'cash'
    };

    console.log('Sending order data:', JSON.stringify(orderData, null, 2));

    const response = await fetch('http://localhost:3001/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': 'test-session-' + Date.now()
      },
      body: JSON.stringify(orderData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log('✅ Order created successfully:', result.orderId);
    } else {
      console.log('❌ Order creation failed');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Could not parse error response as JSON');
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testCashOrder();