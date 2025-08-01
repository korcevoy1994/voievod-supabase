const http = require('http');

const postData = JSON.stringify({
  userId: 'test-user-123',
  customerInfo: {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
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
  paymentMethod: 'cash'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/orders',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'ngrok-skip-browser-warning': 'true'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('RESPONSE BODY:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('PARSED RESPONSE:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Failed to parse JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(postData);
req.end();