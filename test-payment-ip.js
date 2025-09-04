const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Тестируем создание платежа с логированием IP
async function testPaymentCreation() {
  console.log('Testing payment creation with IP logging...');
  
  const paymentData = {
    amount: 100,
    currency: 'MDL',
    clientIp: '127.0.0.1',
    orderId: `test-${Date.now()}`,
    description: 'Test payment for IP verification',
    okUrl: 'https://example.com/success',
    failUrl: 'https://example.com/fail'
  };

  try {
    const response = await fetch('https://voievod-supabase-nfndhuql5-korcevoyui-gmailcoms-projects.vercel.app/api/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    const result = await response.text();
    console.log('Payment API Response Status:', response.status);
    console.log('Payment API Response:', result.substring(0, 500));
    
    if (response.status === 200) {
      try {
        const jsonResult = JSON.parse(result);
        console.log('Payment created successfully:', jsonResult);
      } catch (e) {
        console.log('Response is not JSON');
      }
    }
  } catch (error) {
    console.error('Error testing payment:', error.message);
  }
}

testPaymentCreation();