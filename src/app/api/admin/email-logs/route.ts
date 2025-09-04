import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    
    // Параметры для пагинации и фильтрации
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const orderId = searchParams.get('orderId')
    const status = searchParams.get('status')
    const email = searchParams.get('email')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    
    const offset = (page - 1) * limit
    
    // Строим запрос с фильтрами
    let query = supabase
      .from('email_logs')
      .select(`
        id,
        order_id,
        recipient_email,
        email_type,
        status,
        error_message,
        smtp_response,
        sent_at,
        created_at,
        updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
    
    // Применяем фильтры
    if (orderId) {
      query = query.eq('order_id', orderId)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    if (email) {
      query = query.ilike('recipient_email', `%${email}%`)
    }
    
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }
    
    // Применяем пагинацию
    query = query.range(offset, offset + limit - 1)
    
    const { data: emailLogs, error, count } = await query
    
    if (error) {
      console.error('❌ Ошибка получения логов email:', error)
      return NextResponse.json(
        { error: 'Failed to fetch email logs' },
        { status: 500 }
      )
    }
    
    // Подсчитываем статистику
    const { data: stats } = await supabase
      .from('email_logs')
      .select('status')
    
    const statistics = {
      total: count || 0,
      sent: stats?.filter(log => log.status === 'sent').length || 0,
      failed: stats?.filter(log => log.status === 'failed').length || 0,
      pending: stats?.filter(log => log.status === 'pending').length || 0
    }
    
    return NextResponse.json({
      success: true,
      data: emailLogs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      statistics
    })
    
  } catch (error) {
    console.error('❌ Ошибка API email-logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint для повторной отправки email
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }
    
    // Вызываем API отправки email
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/tickets/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId })
    })
    
    if (emailResponse.ok) {
      const result = await emailResponse.json()
      return NextResponse.json({
        success: true,
        message: 'Email resent successfully',
        data: result
      })
    } else {
      const errorData = await emailResponse.json().catch(() => ({}))
      return NextResponse.json(
        { 
          error: 'Failed to resend email',
          details: errorData.error || 'Unknown error'
        },
        { status: emailResponse.status }
      )
    }
    
  } catch (error) {
    console.error('❌ Ошибка повторной отправки email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}