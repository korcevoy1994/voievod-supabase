import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const projectId = process.env.MAIB_PROJECT_ID;
    const projectSecret = process.env.MAIB_PROJECT_SECRET;
    const signatureKey = process.env.MAIB_SIGNATURE_KEY;

    if (!projectId || !projectSecret || !signatureKey) {
      return NextResponse.json(
        { error: 'Missing MAIB credentials' },
        { status: 500 }
      );
    }

    // Генерируем токен
    const tokenResponse = await fetch('https://api.maibmerchants.md/v1/generate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        projectSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      return NextResponse.json(
        { error: 'Token generation failed', details: tokenError },
        { status: tokenResponse.status }
      );
    }

    const { accessToken } = await tokenResponse.json();

    // Минимальные данные для платежа
    const paymentData = {
      amount: 100, // 1.00 MDL
      currency: 'MDL',
      clientIp: '127.0.0.1',
      description: 'Test payment',
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/maib/callback`,
      okUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/success`,
      failUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment/fail`
    };

    console.log('Minimal payment data:', JSON.stringify(paymentData, null, 2));

    // Создаем платеж
    const paymentResponse = await fetch('https://api.maibmerchants.md/v1/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(paymentData),
    });

    const paymentResult = await paymentResponse.text();
    console.log('Payment response status:', paymentResponse.status);
    console.log('Payment response:', paymentResult);

    if (!paymentResponse.ok) {
      return NextResponse.json(
        { 
          error: 'Payment creation failed', 
          status: paymentResponse.status,
          details: paymentResult 
        },
        { status: paymentResponse.status }
      );
    }

    const payment = JSON.parse(paymentResult);
    return NextResponse.json({ success: true, payment });

  } catch (error) {
    console.error('Error in minimal test:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}