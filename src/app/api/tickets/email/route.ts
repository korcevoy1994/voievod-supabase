import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import path from 'path'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface Order {
  id: string; // Теперь короткий 8-символьный ID
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone?: string;
  total_price: number;
  total_tickets: number;
  payment_method: string;
  status: string;
  created_at: string;
  order_seats: Array<{
    seat_id: string;
    price: number;
    seats: {
      zone: string;
      row: string;
      number: string;
    };
  }>;
  order_general_access: Array<{
    id: string; // Теперь короткий 8-символьный ID
    ticket_name: string;
    price: number;
    quantity: number;
  }>;
}

// Функция генерации PDF для одного билета
const generateSingleTicketPDF = async (order: Order, ticketInfo: any, ticketIndex: number): Promise<Buffer> => {
  try {
    // Создаем PDF с размерами билета (666.75x1200px в пунктах)
    // 1 пункт = 1/72 дюйма, поэтому конвертируем пиксели в пункты
    const widthPt = (666.75 * 72) / 96; // ~500pt
    const heightPt = (1200 * 72) / 96; // ~900pt
    
    const doc = new jsPDF({
       orientation: 'portrait',
       unit: 'pt',
       format: [widthPt, heightPt],
       compress: true
     });
    
    // Загружаем фоновое изображение билета из папки public
     const ticketImagePath = path.join(process.cwd(), 'public', 'ticket.jpg');
     
     try {
       const fs = await import('fs');
       const ticketImageBuffer = fs.readFileSync(ticketImagePath);
       const ticketImageBase64 = ticketImageBuffer.toString('base64');
       
       // Добавляем фоновое изображение с компрессией
        doc.addImage(
          `data:image/jpeg;base64,${ticketImageBase64}`,
          'JPEG',
          0, 0,
          widthPt, heightPt,
          undefined, // alias
          'MEDIUM' // compression
        );
     } catch (bgError) {
       console.warn('Не удалось загрузить фоновое изображение, используем белый фон:', bgError);
       // Если не удалось загрузить фон, рисуем белый прямоугольник
       doc.setFillColor(255, 255, 255);
       doc.rect(0, 0, widthPt, heightPt, 'F');
     }
    
    // Генерируем уникальный QR код для каждого билета в JSON формате
     const ticketNumber = `VOEV-2025-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
     const timestamp = Date.now() / 1000;
     const checksum = require('crypto').createHash('md5').update(`${order.id}${ticketNumber}${timestamp}`).digest('hex');
     
     const qrData = JSON.stringify({
       ticket_id: order.id,
       ticket_number: ticketNumber,
       timestamp: timestamp,
       checksum: checksum
     });
     const qrCodeDataURL = await QRCode.toDataURL(qrData, {
       width: 300,
       margin: 1,
       color: {
         dark: '#000000',
         light: '#FFFFFF'
       }
     });
    
    // Координаты QR кода: центрирован по x, y 635.5, размер 230x230px
     const qrSize = (230 * 72) / 96;
     const qrX = (widthPt - qrSize) / 2; // Центрируем по горизонтали
     const qrY = 472;
    
    doc.addImage(qrCodeDataURL, 'PNG', qrX, qrY, qrSize, qrSize);
    
    // Область для информации о билете: x 0 y 955.15, размер 666.75x244.85px
    const infoX = 0;
    const infoY = (955.15 * 72) / 96;
    const infoWidth = (666.75 * 72) / 96;
    const infoHeight = (244.85 * 72) / 96;
    
    // Настройка шрифта для информации о билете
    doc.setTextColor(255, 255, 255);
    
    const centerX = infoX + (infoWidth / 2);
    let textY = infoY + (infoHeight / 2) - 10; // Центрируем по вертикали
    
    // Добавляем информацию о конкретном билете
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    
    if (ticketInfo.type === 'seat') {
      const seatText = `ZONA: ${ticketInfo.zone}  •  RÂNDUL: ${ticketInfo.row}  •  LOC: ${ticketInfo.number}`;
      doc.text(seatText, centerX, textY, { align: 'center' });
    } else if (ticketInfo.type === 'general') {
      doc.text(ticketInfo.name, centerX, textY, { align: 'center' });
    }
    
    // Возвращаем PDF как Buffer
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
  } catch (error) {
    throw error;
  }
}

// Функция генерации всех PDF билетов для заказа
const generateAllTicketPDFs = async (order: Order): Promise<Array<{buffer: Buffer, filename: string}>> => {
  console.log('🎫 Начинаем генерацию PDF билетов для заказа:', order.id)
  console.log('📊 Данные заказа:', {
    seats: order.order_seats?.length || 0,
    generalAccess: order.order_general_access?.length || 0,
    totalTickets: order.total_tickets
  })
  
  const tickets = [];
  let ticketIndex = 1;
  const baseTimestamp = Date.now();
  
  // Генерируем PDF для каждого места
  if (order.order_seats && order.order_seats.length > 0) {
    console.log('🪑 Генерируем PDF для мест:', order.order_seats.length)
    for (const seat of order.order_seats) {
      const ticketInfo = {
        type: 'seat',
        zone: seat.seats.zone,
        row: seat.seats.row,
        number: seat.seats.number,
        price: seat.price
      };
      
      const pdfBuffer = await generateSingleTicketPDF(order, ticketInfo, ticketIndex);
      // Добавляем небольшую задержку для уникальности timestamp
      const uniqueTimestamp = baseTimestamp + ticketIndex;
      tickets.push({
        buffer: pdfBuffer,
        filename: `bilet-${ticketIndex}-zona-${seat.seats.zone}-rand-${seat.seats.row}-loc-${seat.seats.number}-${uniqueTimestamp}.pdf`
      });
      ticketIndex++;
    }
  }
  
  // Генерируем PDF для каждого билета общего доступа
  if (order.order_general_access && order.order_general_access.length > 0) {
    console.log('🎟️ Генерируем PDF для general access билетов:', order.order_general_access.length)
    for (const ga of order.order_general_access) {
      // Генерируем отдельный PDF для каждого билета в количестве
      for (let i = 0; i < ga.quantity; i++) {
        const ticketInfo = {
          type: 'general',
          name: ga.ticket_name,
          price: ga.price
        };
        
        const pdfBuffer = await generateSingleTicketPDF(order, ticketInfo, ticketIndex);
        // Добавляем небольшую задержку для уникальности timestamp
        const uniqueTimestamp = baseTimestamp + ticketIndex;
        tickets.push({
          buffer: pdfBuffer,
          filename: `bilet-${ticketIndex}-${ga.ticket_name.replace(/\s+/g, '-').toLowerCase()}-${uniqueTimestamp}.pdf`
        });
        ticketIndex++;
      }
    }
  }
  
  console.log('✅ Генерация PDF завершена. Всего билетов:', tickets.length)
  console.log('📄 Размеры файлов:', tickets.map(t => `${t.filename}: ${t.buffer.length} bytes`))
  
  return tickets;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { orderId } = await request.json()
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }
    
    console.log('📧 Отправка PDF билета по email для заказа:', orderId)
    
    // Получаем данные заказа
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('❌ Ошибка получения заказа:', orderError)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Получаем места заказа отдельно
    console.log('🔍 Запрашиваем места для заказа:', orderId)
    const { data: orderSeats, error: seatsError } = await supabase
      .from('order_seats')
      .select('*')
      .eq('order_id', orderId)
    
    console.log('🪑 Результат запроса мест:', { data: orderSeats, error: seatsError })
    
    // Если есть места, получаем информацию о местах отдельно
    if (orderSeats && orderSeats.length > 0) {
      for (const orderSeat of orderSeats) {
        console.log('🔍 Ищем информацию о месте:', orderSeat.seat_id)
        const { data: seatInfo, error: seatError } = await supabase
          .from('seats')
          .select('zone, row, number')
          .eq('id', orderSeat.seat_id)
          .single()
        
        console.log('🪑 Информация о месте:', { data: seatInfo, error: seatError })
        
        if (seatInfo) {
          orderSeat.seats = seatInfo
        } else {
          // Если не найдено по ID, попробуем парсить из seat_id
          const seatParts = orderSeat.seat_id.split('-')
          if (seatParts.length === 3) {
            orderSeat.seats = {
              zone: seatParts[0],
              row: seatParts[1],
              number: seatParts[2]
            }
            console.log('🔧 Парсим seat_id:', orderSeat.seats)
          }
        }
      }
    }

    // Получаем general access билеты отдельно
    console.log('🔍 Запрашиваем general access для заказа:', orderId)
    const { data: orderGeneralAccess, error: gaError } = await supabase
      .from('order_general_access')
      .select('*')
      .eq('order_id', orderId)
    
    console.log('🎟️ Результат запроса general access:', { data: orderGeneralAccess, error: gaError })

    // Добавляем данные к объекту заказа
    order.order_seats = orderSeats || []
    order.order_general_access = orderGeneralAccess || []
    
    console.log('🔍 Данные заказа перед генерацией PDF:')
    console.log('📋 Order ID:', order.id)
    console.log('🪑 Order seats:', order.order_seats)
    console.log('🎟️ Order general access:', order.order_general_access)
    console.log('📊 Total tickets:', order.total_tickets)
    
    // Генерируем все PDF билеты
    console.log('🚀 Вызываем generateAllTicketPDFs...')
    const ticketPDFs = await generateAllTicketPDFs(order)
    console.log('✅ generateAllTicketPDFs завершена, результат:', ticketPDFs.length, 'билетов')
    
    // Настройка транспорта для отправки email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // Дополнительные настройки для улучшения доставляемости
      tls: {
        rejectUnauthorized: false
      },
      debug: true, // Включаем отладку
      logger: true // Включаем логирование
    })
    
    // Проверяем соединение с SMTP сервером
    try {
      await transporter.verify()
      console.log('✅ SMTP соединение установлено успешно')
    } catch (verifyError) {
      console.error('❌ Ошибка SMTP соединения:', verifyError)
      throw new Error('SMTP server connection failed')
    }
    
    // Создаем вложения для каждого билета
    const attachments = ticketPDFs.map(ticket => ({
      filename: ticket.filename,
      content: ticket.buffer,
      contentType: 'application/pdf'
    }))
    
    // Отправляем email с PDF вложениями
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: order.customer_email,
      subject: `Biletele tale VOEVODA - Comanda #${orderId.slice(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937; text-align: center;">VOEVODA</h1>
          <h2 style="color: #374151;">Mulțumim pentru cumpărare!</h2>
          
          <p>Bună ${order.customer_first_name},</p>
          
          <p>Biletele tale pentru evenimentul VOEVODA sunt atașate la acest email. Fiecare bilet este într-un fișier PDF separat.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Detalii comandă:</h3>
            <p><strong>Numărul comenzii:</strong> ${orderId}</p>
            <p><strong>Data evenimentului:</strong> 15 Februarie 2025, 19:00</p>
            <p><strong>Locația:</strong> Sala Polivalentă, Chișinău</p>
            <p><strong>Total bilete:</strong> ${order.total_tickets}</p>
            <p><strong>Total plătit:</strong> ${order.total_price} Lei</p>
            <p><strong>Fișiere atașate:</strong> ${ticketPDFs.length} bilete PDF</p>
          </div>
          
          <p><strong>Instrucțiuni importante:</strong></p>
          <ul>
            <li>Fiecare bilet este într-un fișier PDF separat</li>
            <li>Prezintă fiecare bilet PDF la intrare (pe telefon sau printat)</li>
            <li>QR codul de pe fiecare bilet va fi scanat la intrare</li>
            <li>Păstrează acest email pentru referințe viitoare</li>
          </ul>
          
          <p>Ne vedem la eveniment!</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Echipa ${process.env.EMAIL_FROM_NAME}<br>
            Pentru întrebări: ${process.env.EMAIL_SUPPORT}
          </p>
        </div>
      `,
      attachments: attachments
    }
    
    console.log('📧 Отправка email на адрес:', order.customer_email)
    console.log('📎 Количество вложений:', attachments.length)
    console.log('📄 Размеры PDF файлов:', attachments.map(a => `${a.filename}: ${a.content.length} bytes`))
    
    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ Email отправлен успешно!')
    console.log('📧 Message ID:', info.messageId)
    console.log('📧 Response:', info.response)
    console.log('📧 Envelope:', info.envelope)
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info))
    
    // Дополнительная информация для отладки
    if (info.accepted && info.accepted.length > 0) {
      console.log('✅ Email принят сервером для:', info.accepted)
    }
    if (info.rejected && info.rejected.length > 0) {
      console.log('❌ Email отклонен для:', info.rejected)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    })
    
  } catch (error) {
    console.error('❌ Ошибка отправки email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}