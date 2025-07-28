import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('\n=== MAIB IPv4 Test ===');
    
    // Проверяем переменные окружения
    const projectId = process.env.MAIB_PROJECT_ID;
    const projectSecret = process.env.MAIB_PROJECT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
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
    
    // Принудительно используем IPv4 адрес
    let clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1';
    
    // Если получили IPv6, заменяем на IPv4
    if (clientIp === '::1' || clientIp.includes(':')) {
      clientIp = '127.0.0.1';
    }
    
    // Данные платежа с минимальным набором полей
    const paymentData = {
      "amount": 10.25,
      "currency": "MDL",
      "clientIp": clientIp,
      "language": "ru",
      "description": "Test payment IPv4",
      "orderId": `test-${Date.now()}`,
      "callbackUrl": `${baseUrl}/api/payments/maib/callback`,
      "okUrl": `${baseUrl}/checkout/success`,
      "failUrl": `${baseUrl}/checkout/failed`
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
      paymentData: paymentData,
      detectedClientIp: clientIp
    });
    
  } catch (error) {
    console.error('Error in IPv4 test:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}