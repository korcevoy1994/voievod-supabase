import { NextResponse } from 'next/server';

// GET - проверка переменных окружения MAIB
export async function GET() {
  try {
    const requiredEnvVars = {
      MAIB_PROJECT_ID: process.env.MAIB_PROJECT_ID,
      MAIB_PROJECT_SECRET: process.env.MAIB_PROJECT_SECRET,
      MAIB_SIGNATURE_KEY: process.env.MAIB_SIGNATURE_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };

    const missingVars = [];
    const presentVars = [];

    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        missingVars.push(key);
      } else {
        presentVars.push({
          name: key,
          length: value.length,
          preview: key.includes('SECRET') || key.includes('KEY') 
            ? `${value.substring(0, 8)}...` 
            : value
        });
      }
    }

    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          error: 'Отсутствуют обязательные переменные окружения',
          missing: missingVars,
          present: presentVars
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Все переменные окружения настроены корректно',
      variables: presentVars,
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('Error checking environment variables:', error);
    return NextResponse.json(
      { error: 'Ошибка проверки переменных окружения' },
      { status: 500 }
    );
  }
}