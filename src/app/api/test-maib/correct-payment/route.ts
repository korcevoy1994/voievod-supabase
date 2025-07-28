import { NextRequest, NextResponse } from 'next/server';
import { MaibClient } from '@/lib/maib-client';

export async function POST(request: NextRequest) {
  try {
    console.log('\n=== MAIB Correct Payment Test ===');
    
    const maibClient = new MaibClient({
      projectId: process.env.MAIB_PROJECT_ID!,
      projectSecret: process.env.MAIB_PROJECT_SECRET!,
      signatureKey: process.env.MAIB_SIGNATURE_KEY!,
    });
    
    console.log('MaibClient initialized');
    
    // Правильная структура данных согласно документации
    const paymentData = {
      amount: 10.25,
      currency: 'MDL',
      clientIp: '127.0.0.1',
      language: 'ru',
      description: 'Test payment from API',
      clientName: 'Test User',
      email: 'test@example.com',
      phone: '069123456',
      orderId: `test-${Date.now()}`,
      delivery: 0,
      items: [
        {
          id: '1',
          name: 'Test Item',
          price: 10.25,
          quantity: 1
        }
      ],
      callbackUrl: 'https://example.com/callback',
      okUrl: 'https://example.com/ok',
      failUrl: 'https://example.com/fail'
    };
    
    console.log('Payment data:', JSON.stringify(paymentData, null, 2));
    
    // Используем метод createPayment класса MaibClient
    const result = await maibClient.createPayment({
      amount: paymentData.amount * 100, // Конвертируем в копейки
      currency: paymentData.currency,
      clientIp: paymentData.clientIp,
      language: paymentData.language,
      description: paymentData.description,
      clientName: paymentData.clientName,
      email: paymentData.email,
      phone: paymentData.phone,
      orderId: paymentData.orderId,
      delivery: paymentData.delivery,
      items: paymentData.items,
      callbackUrl: paymentData.callbackUrl,
      okUrl: paymentData.okUrl,
      failUrl: paymentData.failUrl
    });
    
    console.log('Payment created successfully:', result);
    
    console.log('=== Test completed ===\n');
    
    return NextResponse.json({
      success: true,
      result,
      paymentData,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Payment test failed:', error);
    
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