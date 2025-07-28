import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('\n=== MAIB Direct API Test ===');
    
    // Генерируем токен напрямую
    const tokenResponse = await fetch('https://api.maibmerchants.md/v1/generate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: process.env.MAIB_PROJECT_ID,
        projectSecret: process.env.MAIB_PROJECT_SECRET,
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Token generation failed: ${tokenResponse.status}`);
    }
    
    const tokenResult = await tokenResponse.json();
    const token = tokenResult.result.accessToken;
    console.log('Token generated successfully');
    
    // Минимальные данные согласно документации с обязательными URL
    const paymentData = {
      amount: 10.25, // Формат X.XX как в документации
      currency: 'MDL',
      clientIp: '127.0.0.1',
      language: 'ru',
      okUrl: 'https://example.com/ok',
      failUrl: 'https://example.com/fail',
      callbackUrl: 'https://example.com/callback'
    };
    
    console.log('Sending payment data:', JSON.stringify(paymentData, null, 2));
    console.log('Using token:', token.substring(0, 20) + '...');
    
    // Прямой вызов API /v1/pay
    const paymentResponse = await fetch('https://api.maibmerchants.md/v1/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(paymentData),
    });
    
    console.log('Payment response status:', paymentResponse.status);
    
    const responseText = await paymentResponse.text();
    console.log('Payment response body:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      result = { rawResponse: responseText };
    }
    
    console.log('=== Test completed ===\n');
    
    return NextResponse.json({
      success: paymentResponse.ok,
      status: paymentResponse.status,
      result,
      paymentData,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Direct test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}