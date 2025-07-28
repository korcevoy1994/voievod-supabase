import { NextResponse } from 'next/server';
import { maibClient } from '@/lib/maib-client';

// GET - тест генерации токена MAIB
export async function GET() {
  try {
    // Проверяем наличие необходимых переменных окружения
    if (!process.env.MAIB_PROJECT_ID || !process.env.MAIB_PROJECT_SECRET || !process.env.MAIB_SIGNATURE_KEY) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные переменные окружения MAIB' },
        { status: 400 }
      );
    }

    // Пытаемся сгенерировать токен через приватный метод
    // Поскольку generateToken приватный, мы создадим тестовый запрос
    const testData = {
      amount: 100,
      currency: 'MDL',
      clientIp: '127.0.0.1', // Тестовый IP
      orderId: 'test-token-generation',
      description: 'Тест генерации токена',
      okUrl: 'http://localhost:3000/test-success',
      failUrl: 'http://localhost:3000/test-fail',
      callbackUrl: 'http://localhost:3000/api/test-callback',
      language: 'ru'
    };

    // Попытка создать платеж (это проверит генерацию токена)
    try {
      await maibClient.createPayment(testData);
      
      return NextResponse.json({
        message: 'Токен успешно сгенерирован',
        token: 'Token generated successfully (hidden for security)',
        timestamp: new Date().toISOString(),
        projectId: process.env.MAIB_PROJECT_ID
      });
    } catch (error: any) {
      // Если ошибка связана с токеном, это означает проблему с аутентификацией
      if (error.message.includes('token') || error.message.includes('401') || error.message.includes('403')) {
        return NextResponse.json(
          {
            error: 'Ошибка генерации или валидации токена',
            details: error.message,
            suggestion: 'Проверьте правильность MAIB_PROJECT_ID, MAIB_PROJECT_SECRET и MAIB_SIGNATURE_KEY'
          },
          { status: 401 }
        );
      }
      
      // Если ошибка не связана с токеном, значит токен сгенерировался успешно
      // но есть другие проблемы (например, с данными платежа)
      if (error.message.includes('Payment creation failed')) {
        return NextResponse.json({
          message: 'Токен успешно сгенерирован, но есть проблемы с созданием платежа',
          token: 'Token generated successfully',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error('Error testing token generation:', error);
    return NextResponse.json(
      {
        error: 'Ошибка тестирования генерации токена',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}