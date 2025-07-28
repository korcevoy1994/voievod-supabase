import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    // Получаем список файлов из bucket
    const { data: files, error } = await supabase.storage
      .from('tickets')
      .list('tickets', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Ошибка получения списка файлов:', error);
      return NextResponse.json(
        { error: 'Ошибка получения списка файлов' },
        { status: 500 }
      );
    }

    // Фильтруем файлы по orderId если указан
    let filteredFiles = files || [];
    if (orderId) {
      filteredFiles = files?.filter(file => 
        file.name.includes(`ticket-${orderId}`)
      ) || [];
    }

    // Формируем ответ с публичными URL
    const filesWithUrls = filteredFiles.map(file => {
      const { data: urlData } = supabase.storage
        .from('tickets')
        .getPublicUrl(`tickets/${file.name}`);
      
      return {
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at,
        updated_at: file.updated_at,
        url: urlData.publicUrl
      };
    });

    return NextResponse.json({
      files: filesWithUrls,
      total: filteredFiles.length
    });

  } catch (error) {
    console.error('Ошибка API списка билетов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}