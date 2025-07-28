import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { qrCode } = await request.json();

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code is required' },
        { status: 400 }
      );
    }

    // Проверяем QR код через функцию в базе данных
    const { data, error } = await supabase.rpc('verify_qr_code', {
      p_qr_code: qrCode
    });

    if (error) {
      console.error('Error verifying QR code:', error);
      return NextResponse.json(
        { error: 'Failed to verify QR code' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { 
          valid: false, 
          message: 'QR код не найден или недействителен' 
        },
        { status: 404 }
      );
    }

    const ticketInfo = data[0];

    return NextResponse.json({
      valid: ticketInfo.is_valid,
      ticket: {
        orderId: ticketInfo.order_id,
        customerName: ticketInfo.customer_name,
        eventTitle: ticketInfo.event_title,
        totalTickets: ticketInfo.total_tickets,
        status: ticketInfo.status
      },
      message: ticketInfo.is_valid 
        ? 'Билет действителен' 
        : 'Билет недействителен или заказ не оплачен'
    });
  } catch (error) {
    console.error('Error in ticket verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint для получения информации о билете по QR коду
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const qrCode = searchParams.get('qrCode');

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code is required' },
        { status: 400 }
      );
    }

    // Получаем информацию о заказе по QR коду
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        customer_first_name,
        customer_last_name,
        customer_email,
        total_price,
        total_tickets,
        status,
        created_at,
        order_seats(
          zone,
          row,
          number,
          price
        ),
        order_general_access(
          ticket_name,
          price,
          quantity
        )
      `)
      .eq('qr_code', qrCode)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order: {
        id: order.id,
        customerName: `${order.customer_first_name} ${order.customer_last_name}`,
        customerEmail: order.customer_email,
        totalPrice: order.total_price,
        totalTickets: order.total_tickets,
        status: order.status,
        createdAt: order.created_at,
        seats: order.order_seats,
        generalAccess: order.order_general_access
      }
    });
  } catch (error) {
    console.error('Error getting ticket info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}