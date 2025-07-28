import { NextRequest, NextResponse } from 'next/server';
import { MaibClient } from '@/lib/maib-client';

export async function GET(request: NextRequest) {
  try {
    console.log('\n=== MAIB Create Payment Test ===');
    
    const maibClient = new MaibClient({
      projectId: process.env.MAIB_PROJECT_ID!,
      projectSecret: process.env.MAIB_PROJECT_SECRET!,
      signatureKey: process.env.MAIB_SIGNATURE_KEY!,
      isProduction: false, // Тестовый режим
    });
    
    // Получаем IP клиента из заголовков
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '127.0.0.1';
    
    const paymentData = {
      amount: 100, // 1.00 MDL
      currency: 'MDL',
      clientIp: clientIp,
      orderId: `test-payment-${Date.now()}`,
      description: 'Тестовый платеж MAIB',
      clientName: 'Test User',
      email: 'test@example.com',
      phone: '+37369123456',
      okUrl: 'https://example.com/success',
      failUrl: 'https://example.com/fail',
      callbackUrl: 'https://example.com/callback',
      language: 'ru',
    };
    
    console.log('Payment data:', JSON.stringify(paymentData, null, 2));
    
    // Добавляем логирование для отладки
    console.log('About to call MAIB API with processed data...');
    
    const result = await maibClient.createPayment(paymentData);
    
    console.log('Payment creation result:', JSON.stringify(result, null, 2));
    console.log('=== Test completed successfully ===\n');
    
    return NextResponse.json({
      success: true,
      message: 'Payment created successfully',
      data: {
        payUrl: result.payUrl,
        payId: result.payId,
        orderId: result.orderId,
        // Скрываем полную ссылку по соображениям безопасности
        payUrlPreview: result.payUrl ? result.payUrl.substring(0, 50) + '...' : null,
      },
      timestamp: new Date().toISOString(),
      clientIp: clientIp,
    });
    
  } catch (error) {
    console.error('Payment creation test failed:', error);
    
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