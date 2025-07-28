import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    // Опциональная проверка API токена для безопасности
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_API_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Вызываем функцию очистки временных пользователей
    const { data, error } = await supabase.rpc('cleanup_temporary_users');

    if (error) {
      console.error('Error cleaning up temporary users:', error);
      return NextResponse.json(
        { error: 'Failed to cleanup temporary users' },
        { status: 500 }
      );
    }

    const result = data[0] as { deleted_users_count: number };

    return NextResponse.json({
      success: true,
      deleted_users: result.deleted_users_count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    // Получаем статистику временных пользователей
    const { data: tempUsersData, error: tempUsersError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .eq('is_temporary', true);

    if (tempUsersError) {
      console.error('Error getting temp users stats:', tempUsersError);
      return NextResponse.json(
        { error: 'Failed to get statistics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      temporary_users_count: tempUsersData?.length || 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}