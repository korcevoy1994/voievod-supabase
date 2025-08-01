const http = require('http');

// Тестируем создание заказа и проверяем создание билетов
const testData = JSON.stringify({
  userId: "550e8400-e29b-41d4-a716-446655440000",
  customerInfo: {
    firstName: "Тест",
    lastName: "Билетов",
    email: "test-tickets@example.com",
    phone: "+1234567890"
  },
  seats: [
    {
      id: "seat-001",
      zone: "A",
      row: "1",
      number: "1",
      price: 1000
    }
  ],
  generalAccess: [
    {
      id: "ga-001",
      name: "Общий доступ",
      quantity: 2,
      price: 500
    }
  ],
  totalPrice: 2000,
  totalTickets: 3,
  paymentMethod: "card"
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/orders',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData),
    'ngrok-skip-browser-warning': 'true'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('RESPONSE BODY:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('PARSED RESPONSE:', JSON.stringify(parsed, null, 2));
      
      if (parsed.success && parsed.orderId) {
        console.log('\n✅ Заказ создан успешно!');
        console.log('Order ID:', parsed.orderId);
        console.log('Order Number:', parsed.orderNumber);
      } else {
        console.log('\n❌ Ошибка при создании заказа');
      }
    } catch (e) {
      console.log('Error parsing JSON:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(testData);
req.end();