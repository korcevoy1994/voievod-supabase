import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - тест подключения к Supabase
export async function GET(request: NextRequest) {
  try {
    // Простая проверка подключения к Supabase
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (error) {
      console.error('Supabase connection error:', error);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to connect to Supabase',
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Проверяем аутентификацию
    const { data: authData, error: authError } = await supabase.auth.getUser();

    return NextResponse.json({
      status: 'success',
      message: 'Successfully connected to Supabase',
      connection: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        project_ref: process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0],
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        timestamp: new Date().toISOString()
      },
      database: {
        connected: true,
        tables_accessible: !error,
        auth_status: authError ? 'No user session' : 'User session available'
      }
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}