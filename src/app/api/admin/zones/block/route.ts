import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { zone, isBlocked } = await request.json();

    if (!zone) {
      return NextResponse.json(
        { error: 'Zone is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Обновляем поле is_active в таблице zone_colors
    const { data, error } = await supabase
      .from('zone_colors')
      .update({ is_active: !isBlocked })
      .eq('zone', zone)
      .select();

    if (error) {
      console.error('Error updating zone block status:', error);
      return NextResponse.json(
        { error: 'Failed to update zone block status' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      zone,
      isBlocked: !data[0].is_active,
      message: `Zone ${zone} ${isBlocked ? 'blocked' : 'unblocked'} successfully`
    });

  } catch (error) {
    console.error('Error in zone block API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    // Получаем все зоны с их статусом блокировки
    const { data, error } = await supabase
      .from('zone_colors')
      .select('zone, is_active, name, color')
      .order('zone');

    if (error) {
      console.error('Error fetching zones:', error);
      return NextResponse.json(
        { error: 'Failed to fetch zones' },
        { status: 500 }
      );
    }

    const zones = data.map((zone: any) => ({
      zone: zone.zone,
      name: zone.name,
      color: zone.color,
      isBlocked: !zone.is_active
    }));

    return NextResponse.json({ zones });

  } catch (error) {
    console.error('Error in zones API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}