import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Настройка SMTP транспорта
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface Order {
  id: string
  customer_first_name: string
  customer_last_name: string
  customer_email: string
  total_price: number
  total_tickets: number
  status: string
  created_at: string
}

export async function POST(request: NextRequest) {
  try {
    // Получаем все оплаченные заказы
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        customer_first_name,
        customer_last_name,
        customer_email,
        total_price,
        total_tickets,
        status,
        created_at
      `)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Ошибка получения заказов:', error)
      return NextResponse.json(
        { error: 'Ошибка получения заказов' },
        { status: 500 }
      )
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: 'Нет оплаченных заказов для отправки' },
        { status: 404 }
      )
    }

    let sentCount = 0
    const errors: string[] = []

    // Отправляем email каждому пользователю, используя существующий API
    for (const order of orders) {
      try {
        // Используем существующий API endpoint для отправки билетов
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/tickets/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderId: order.id })
        })

        if (!emailResponse.ok) {
          throw new Error(`HTTP ${emailResponse.status}`)
        }

        sentCount++

        // Логируем отправку
        await supabase.from('email_logs').insert({
          order_id: order.id,
          email: order.customer_email,
          type: 'bulk_tickets',
          status: 'sent',
          sent_at: new Date().toISOString()
        })

      } catch (emailError) {
        console.error(`Ошибка отправки email для заказа ${order.id}:`, emailError)
        errors.push(`Заказ ${order.id}: ${emailError instanceof Error ? emailError.message : 'Неизвестная ошибка'}`)
        
        // Логируем ошибку
        await supabase.from('email_logs').insert({
          order_id: order.id,
          email: order.customer_email,
          type: 'bulk_tickets',
          status: 'failed',
          error: emailError instanceof Error ? emailError.message : 'Неизвестная ошибка',
          sent_at: new Date().toISOString()
        })
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: orders.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Отправлено ${sentCount} из ${orders.length} писем${errors.length > 0 ? ` (${errors.length} ошибок)` : ''}`
    })

  } catch (error) {
    console.error('Ошибка массовой отправки email:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}