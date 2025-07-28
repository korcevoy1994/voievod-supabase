import { NextResponse } from 'next/server';
import { maibClient } from '@/lib/maib-client';

// POST - тест создания платежа MAIB
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Получаем IP адрес клиента
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';
    
    // Данные по умолчанию для тестирования
    const testPaymentData = {
      amount: body.amount || 100, // 1 лей в банах
      currency: body.currency || 'MDL',
      clientIp,
      orderId: body.orderId || `test-${Date.now()}`,
      description: body.description || 'Тестовый платеж MAIB',
      okUrl: body.okUrl || `${process.env.NEXT_PUBLIC_APP_URL}/test-maib?status=success`,
      failUrl: body.failUrl || `${process.env.NEXT_PUBLIC_APP_URL}/test-maib?status=fail`,
      callbackUrl: body.callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/maib/callback`,
      language: body.language || 'ru'
    };

    console.log('Attempting to create MAIB payment with data:', {
      ...testPaymentData,
      amount: `${testPaymentData.amount} bani (${testPaymentData.amount / 100} ${testPaymentData.currency})`
    });

    // Создаем платеж через MAIB клиент
    const paymentResult = await maibClient.createPayment(testPaymentData);

    return NextResponse.json({
      success: true,
      message: 'Платеж успешно создан',
      payment: {
        transactionId: paymentResult.payId,
        payUrl: paymentResult.payUrl,
        orderId: testPaymentData.orderId,
        amount: testPaymentData.amount,
        currency: testPaymentData.currency,
        description: testPaymentData.description
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating MAIB payment:', error);
    
    // Анализируем тип ошибки
    let errorMessage = 'Неизвестная ошибка при создании платежа';
    let statusCode = 500;
    
    if (error.message.includes('token') || error.message.includes('401') || error.message.includes('403')) {
      errorMessage = 'Ошибка аутентификации MAIB. Проверьте PROJECT_ID и PROJECT_SECRET';
      statusCode = 401;
    } else if (error.message.includes('400')) {
      errorMessage = 'Неверные данные платежа. Проверьте параметры запроса';
      statusCode = 400;
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      errorMessage = 'Ошибка сети при обращении к MAIB API';
      statusCode = 503;
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
  }
}

// GET - получение информации о тестовом платеже
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    
    if (!transactionId) {
      return NextResponse.json(
        { error: 'Не указан transactionId' },
        { status: 400 }
      );
    }
    
    // Получаем информацию о платеже
    const paymentInfo = await maibClient.getPaymentInfo(transactionId);
    
    return NextResponse.json({
      success: true,
      payment: paymentInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting payment info:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка получения информации о платеже',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}