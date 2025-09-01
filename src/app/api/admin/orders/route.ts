import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

interface OrdersQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// GET - получить список заказов для админки
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    
    // Парсим параметры запроса
    const params: OrdersQueryParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      status: searchParams.get('status') || undefined,
      paymentStatus: searchParams.get('paymentStatus') || undefined,
      paymentMethod: searchParams.get('paymentMethod') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    };

    // Валидация параметров
    if (params.limit && (params.limit < 1 || params.limit > 100)) {
      return NextResponse.json(
        { error: 'Limit должен быть от 1 до 100' },
        { status: 400 }
      );
    }

    if (params.page && params.page < 1) {
      return NextResponse.json(
        { error: 'Page должен быть больше 0' },
        { status: 400 }
      );
    }

    // Строим базовый запрос
    let query = supabase
      .from('orders')
      .select(`
        id,
        customer_first_name,
        customer_last_name,
        customer_email,
        customer_phone,
        total_price,
        total_tickets,
        status,
        payment_method,
        created_at,
        updated_at,
        order_payments (
          id,
          amount,
          payment_method,
          payment_provider,
          status,
          provider_payment_id,
          provider_data,
          created_at,
          updated_at,
          completed_at
        )
      `, { count: 'exact' });

    // Применяем фильтры
    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.dateFrom) {
      query = query.gte('created_at', params.dateFrom);
    }

    if (params.dateTo) {
      query = query.lte('created_at', params.dateTo);
    }

    // Поиск по email, имени или ID заказа
    if (params.search) {
      query = query.or(`customer_email.ilike.%${params.search}%,customer_first_name.ilike.%${params.search}%,customer_last_name.ilike.%${params.search}%,id.ilike.%${params.search}%`);
    }

    // Сортировка
    query = query.order(params.sortBy!, { ascending: params.sortOrder === 'asc' });

    // Пагинация
    const offset = ((params.page || 1) - 1) * (params.limit || 20);
    query = query.range(offset, offset + (params.limit || 20) - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { error: 'Ошибка получения заказов', details: error.message },
        { status: 500 }
      );
    }

    // Фильтрация по статусу платежа если указан
    let filteredOrders = orders || [];
    if (params.paymentStatus) {
      filteredOrders = filteredOrders.filter(order => {
        const latestPayment = order.order_payments?.[0];
        return latestPayment?.status === params.paymentStatus;
      });
    }

    // Фильтрация по способу оплаты если указан
    if (params.paymentMethod) {
      filteredOrders = filteredOrders.filter(order => {
        const latestPayment = order.order_payments?.[0];
        return latestPayment?.payment_method === params.paymentMethod;
      });
    }

    // Подсчет статистики
    const stats = {
      total: count || 0,
      page: params.page || 1,
      limit: params.limit || 20,
      totalPages: Math.ceil((count || 0) / (params.limit || 20))
    };

    return NextResponse.json({
      orders: filteredOrders,
      pagination: stats,
      filters: params
    });

  } catch (error) {
    console.error('Error in admin orders API:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PATCH - обновить статус заказа
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await request.json();
    const { orderId, status, notes } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId и status обязательны' },
        { status: 400 }
      );
    }

    // Валидация статуса
    const validStatuses = ['pending', 'paid', 'cancelled', 'refunded', 'processing'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Недопустимый статус. Допустимые: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Обновляем заказ
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(notes && { admin_notes: notes })
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order:', error);
      return NextResponse.json(
        { error: 'Ошибка обновления заказа', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Error in admin orders PATCH:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}