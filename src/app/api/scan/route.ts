import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Инициализация Supabase клиента
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Функция для обработки QR кодов заказов (формат ORDER:id:timestamp)
async function handleOrderQR(qrCode: string) {
  const { data, error } = await supabase.rpc('verify_order_qr_code', {
    p_qr_code: qrCode
  })

  if (error) {
    console.error('Ошибка проверки QR кода заказа:', error)
    return { valid: false, error: 'Ошибка проверки билета' }
  }

  if (!data || data.length === 0) {
    return { valid: false, error: 'QR код не найден или недействителен' }
  }

  const orderInfo = data[0]
  const isValid = orderInfo.status === 'paid'
  const isAlreadyUsed = orderInfo.status === 'used'

  if (isValid) {
    // Отмечаем заказ как использованный
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'used' })
      .eq('id', orderInfo.order_id)

    if (updateError) {
      console.error('Ошибка обновления статуса заказа:', updateError)
    }

    return {
      valid: true,
      message: 'Билет действителен',
      orderInfo: {
        orderId: orderInfo.order_id,
        customerName: orderInfo.customer_name,
        totalTickets: orderInfo.total_tickets,
        status: 'used'
      }
    }
  } else if (isAlreadyUsed) {
    return {
      valid: false,
      message: 'Билет уже использован',
      orderInfo: {
        orderId: orderInfo.order_id,
        customerName: orderInfo.customer_name,
        totalTickets: orderInfo.total_tickets,
        status: orderInfo.status
      }
    }
  } else {
    return {
      valid: false,
      message: 'Билет недействителен или заказ не оплачен'
    }
  }
}

// Функция для обработки QR кодов билетов (JSON формат)
// Функция для обработки JSON QR кодов заказов (новый формат)
async function handleOrderQRJSON(qrCode: string) {
  try {
    const qrData = JSON.parse(qrCode)
    const { order_id, order_number, timestamp, checksum } = qrData

    // Проверяем заказ в базе данных
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (error || !order) {
      return { valid: false, error: 'Заказ не найден' }
    }

    // Проверяем статус заказа
    if (order.status === 'used') {
      return {
        valid: false,
        error: 'Заказ уже использован',
        message: `Заказ ${order.short_order_number} уже был отсканирован`
      }
    }

    if (order.status !== 'paid') {
      return {
        valid: false,
        error: 'Заказ не оплачен',
        message: `Статус заказа: ${order.status}`
      }
    }

    // Отмечаем заказ как использованный
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'used' })
      .eq('id', order_id)

    if (updateError) {
      console.error('Ошибка обновления статуса заказа:', updateError)
    }

    return {
      valid: true,
      message: 'Заказ действителен',
      orderInfo: {
        orderId: order.id,
        orderNumber: order.short_order_number,
        customerName: `${order.customer_first_name} ${order.customer_last_name}`,
        totalTickets: order.total_tickets,
        status: 'used'
      }
    }
  } catch (parseError) {
    return { valid: false, error: 'Неверный формат JSON в QR коде заказа' }
  }
}

async function handleTicketQR(qrCode: string) {
  try {
    // Используем функцию validate_ticket из базы данных
    const { data: result, error } = await supabase
      .rpc('validate_ticket', { qr_data: qrCode })

    if (error) {
      console.error('Ошибка валидации билета:', error)
      return { valid: false, error: 'Ошибка проверки билета' }
    }

    if (!result) {
      return { valid: false, error: 'Билет не найден' }
    }

    // Функция validate_ticket возвращает JSON объект напрямую
    if (!result.valid) {
      return {
        valid: false,
        message: result.error || 'Билет недействителен'
      }
    }

    return {
      valid: true,
      message: 'Билет действителен',
      ticketInfo: {
        ticketNumber: result.ticket_number || result.order_number,
        customerName: result.customer_name,
        status: 'used'
      }
    }
  } catch (parseError) {
    return { valid: false, error: 'Неверный формат JSON в QR коде' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { qrCode, scannerId, entryGate } = await request.json()

    if (!qrCode) {
      return NextResponse.json(
        { valid: false, error: 'QR код не предоставлен' },
        { status: 400 }
      )
    }

    console.log('Сканирование QR кода:', qrCode)

    // Определяем формат QR кода
    let result
    if (qrCode.startsWith('ORDER:')) {
      // Старый формат заказа: ORDER:id:timestamp
      result = await handleOrderQR(qrCode)
    } else if (qrCode.startsWith('{')) {
      // JSON формат - может быть билет или заказ
      try {
        const qrData = JSON.parse(qrCode)
        if (qrData.order_id && qrData.order_number) {
          // Новый JSON формат заказа
          result = await handleOrderQRJSON(qrCode)
        } else if (qrData.ticket_id && qrData.ticket_number) {
          // JSON формат билета
          result = await handleTicketQR(qrCode)
        } else {
          return NextResponse.json({
            valid: false,
            error: 'Неизвестная структура JSON QR кода'
          })
        }
      } catch (parseError) {
        return NextResponse.json({
          valid: false,
          error: 'Неверный формат JSON в QR коде'
        })
      }
    } else {
      return NextResponse.json({
        valid: false,
        error: 'Неизвестный формат QR кода'
      })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Ошибка при обработке запроса:', error)
    return NextResponse.json(
      { valid: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// GET endpoint для проверки работоспособности
export async function GET() {
  return NextResponse.json({
    message: 'API сканера билетов активен',
    timestamp: new Date().toISOString()
  })
}