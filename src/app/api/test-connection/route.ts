import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// GET - тест подключения к Supabase
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    
    // Проверяем подключение к базе данных
    const { data: tablesData, error: tablesError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (tablesError) {
      console.error('Supabase connection error:', tablesError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to connect to Supabase',
        error: tablesError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Проверяем существование функции create_temporary_user
    const { data: functionData, error: functionError } = await supabase
      .rpc('create_temporary_user', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_email: 'test@example.com',
        p_full_name: 'Test User',
        p_phone: null
      });

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
        tables_accessible: !tablesError,
        auth_status: authError ? 'No user session' : 'User session available'
      },
      function_test: {
        create_temporary_user_exists: !functionError,
        function_error: functionError?.message || null,
        test_result: functionData || null
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