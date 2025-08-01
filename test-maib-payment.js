async function testMaibPayment() {
  try {
    console.log('🧪 Тестирование MAIB платежа...');
    
    // Сначала создаем заказ с наличными
    const orderData = {
      userId: '550e8400-e29b-41d4-a716-446655440001', // Новый UUID для теста
      customerInfo: {
        firstName: 'Test',
        lastName: 'MAIB',
        email: 'test.maib.new@example.com',
        phone: '+373123456789'
      },
      seats: [{
        id: '201-A-01',
        zone: '201',
        row: 'A',
        number: '01',
        price: 100
      }],
      generalAccess: [],
      totalPrice: 100,
      totalTickets: 1,
      paymentMethod: 'card' // Указываем карту
    };

    console.log('📝 Создание заказа с картой...');
    const orderResponse = await fetch('http://localhost:3001/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': 'test-session-maib'
      },
      body: JSON.stringify(orderData)
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      throw new Error(`Ошибка создания заказа: ${errorData.error}`);
    }

    const orderResult = await orderResponse.json();
    console.log('✅ Заказ создан:', orderResult.orderId);

    // Теперь пытаемся создать MAIB платеж
    console.log('💳 Создание MAIB платежа...');
    const paymentResponse = await fetch(`http://localhost:3001/api/orders/${orderResult.orderId}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': 'test-session-maib'
      },
      body: JSON.stringify({
        paymentMethod: 'card',
        paymentProvider: 'maib',
        language: 'ro'
      })
    });

    console.log('📊 Статус ответа MAIB:', paymentResponse.status);
    
    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      console.error('❌ Ошибка MAIB платежа:', errorData);
      return;
    }

    const paymentResult = await paymentResponse.json();
    console.log('✅ MAIB платеж создан:', paymentResult);
    
    if (paymentResult.payUrl) {
      console.log('🔗 URL для оплаты:', paymentResult.payUrl);
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования MAIB:', error.message);
  }
}

testMaibPayment();