import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('\n=== MAIB Exact Format Test ===');
    
    // Проверяем переменные окружения
    const projectId = process.env.MAIB_PROJECT_ID;
    const projectSecret = process.env.MAIB_PROJECT_SECRET;
    
    if (!projectId || !projectSecret) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables'
      }, { status: 500 });
    }
    
    // Генерируем токен
    console.log('Generating token...');
    const tokenResponse = await fetch('https://api.maibmerchants.md/v1/generate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: projectId,
        projectSecret: projectSecret,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token generation failed:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Token generation failed',
        details: errorText
      }, { status: 500 });
    }
    
    const tokenData = await tokenResponse.json();
    const token = tokenData.result?.accessToken;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'No token received'
      }, { status: 500 });
    }
    
    console.log('Token generated successfully');
    
    // Данные платежа точно по документации
    const paymentData = {
      "amount": 10.25,
      "currency": "MDL",
      "clientIp": "135.250.245.121",
      "language": "ru",
      "description": "Test payment exact format",
      "clientName": "Имя Фамилия",
      "email": "customer@gmail.com",
      "phone": "069123456",
      "orderId": "123",
      "delivery": 1.25,
      "items": [
        {
          "id": "10",
          "name": "Товар 1",
          "price": 2.50,
          "quantity": 2
        },
        {
          "id": "11",
          "name": "Товар 2",
          "price": 4,
          "quantity": 1
        }
      ],
      "callbackUrl": "https://example.com/callback",
      "okUrl": "https://example.com/ok",
      "failUrl": "https://example.com/fail"
    };
    
    console.log('Payment data:', JSON.stringify(paymentData, null, 2));
    
    // Создаем платеж
    console.log('Creating payment...');
    const paymentResponse = await fetch('https://api.maibmerchants.md/v1/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(paymentData),
    });
    
    console.log('Payment response status:', paymentResponse.status);
    console.log('Payment response headers:', Object.fromEntries(paymentResponse.headers.entries()));
    
    const responseText = await paymentResponse.text();
    console.log('Payment response body:', responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { rawResponse: responseText };
    }
    
    return NextResponse.json({
      success: paymentResponse.ok,
      status: paymentResponse.status,
      data: responseData,
      paymentData: paymentData
    });
    
  } catch (error) {
    console.error('Error in exact format test:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}