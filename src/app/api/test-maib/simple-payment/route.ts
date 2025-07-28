import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('\n=== MAIB Simple Payment Test ===');
    
    // Получаем токен напрямую
    const tokenResponse = await fetch('https://api.maibmerchants.md/v1/generate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: process.env.MAIB_PROJECT_ID!,
        projectSecret: process.env.MAIB_PROJECT_SECRET!,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token generation failed: ${tokenResponse.status} ${errorText}`);
    }
    
    const tokenResult = await tokenResponse.json();
    const token = tokenResult.result?.accessToken;
    
    console.log('Token generated successfully');
    
    // Минимальный запрос для создания платежа
    const paymentData = {
      amount: 1.00, // 1 лей
      currency: 'MDL',
      clientIp: '127.0.0.1',
      language: 'ru',
      okUrl: 'https://example.com/success',
      failUrl: 'https://example.com/fail',
      callbackUrl: 'https://example.com/callback'
    };
    
    console.log('Payment request data:', JSON.stringify(paymentData, null, 2));
    
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
      result: result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Simple payment test failed:', error);
    
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