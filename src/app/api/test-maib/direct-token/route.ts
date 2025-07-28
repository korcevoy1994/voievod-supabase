import { NextResponse } from 'next/server';

// GET - прямой тест генерации токена MAIB
export async function GET() {
  try {
    // Проверяем наличие необходимых переменных окружения
    if (!process.env.MAIB_PROJECT_ID || !process.env.MAIB_PROJECT_SECRET) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные переменные окружения MAIB' },
        { status: 400 }
      );
    }

    // Прямой запрос к MAIB API для генерации токена
    const response = await fetch('https://api.maibmerchants.md/v1/generate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: process.env.MAIB_PROJECT_ID,
        projectSecret: process.env.MAIB_PROJECT_SECRET,
      }),
    });

    console.log('MAIB Response Status:', response.status);
    console.log('MAIB Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const responseText = await response.text();
        console.log('MAIB Error Response:', responseText);
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || responseText;
          } catch {
            errorMessage = responseText;
          }
        }
      } catch {
        // Используем statusText если не можем прочитать ответ
      }
      
      return NextResponse.json(
        {
          error: 'Ошибка генерации токена',
          status: response.status,
          details: errorMessage,
          projectId: process.env.MAIB_PROJECT_ID,
          timestamp: new Date().toISOString()
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('MAIB Success Response:', result);
    
    const accessToken = result.result?.accessToken || result.accessToken || result.token;
    
    return NextResponse.json({
      message: 'Токен успешно сгенерирован',
      token: accessToken ? 'Token received (hidden for security)' : 'No token in response',
      hasToken: !!accessToken,
      projectId: process.env.MAIB_PROJECT_ID,
      timestamp: new Date().toISOString(),
      responseKeys: Object.keys(result),
      tokenLocation: accessToken ? (result.result?.accessToken ? 'result.accessToken' : result.accessToken ? 'accessToken' : 'token') : 'not found'
    });
    
  } catch (error: any) {
    console.error('Error testing direct token generation:', error);
    return NextResponse.json(
      {
        error: 'Ошибка тестирования прямой генерации токена',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}