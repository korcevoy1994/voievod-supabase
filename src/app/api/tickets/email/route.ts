import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Order {
  id: string;
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
    zone: string;
    row: string;
    number: string;
    price: number;
  }>;
  order_general_access: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

// Функция генерации PDF с новым дизайном
const generatePDF = async (order: Order): Promise<Buffer> => {
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
    
    // Генерируем QR код
     const qrData = `ORDER:${order.id}:${Date.now()}`;
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
    
    // Информация о местах
    if (order.order_seats && order.order_seats.length > 0) {
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      order.order_seats.forEach((seat, index) => {
        const seatText = `ZONA: ${seat.zone}  •  RÂNDUL: ${seat.row}  •  LOC: ${seat.number}`;
        doc.text(seatText, centerX, textY, { align: 'center' });
        textY += 35;
      });
    }
    
    if (order.order_general_access && order.order_general_access.length > 0) {
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      order.order_general_access.forEach((ga, index) => {
        doc.text(`${ga.name} x${ga.quantity}`, centerX, textY, { align: 'center' });
        textY += 35;
      });
    }
    
    // Возвращаем PDF как Buffer
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);
  } catch (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
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
      .select(`
        *,
        order_seats(*),
        order_general_access(*)
      `)
      .eq('id', orderId)
      .single()
    
    if (orderError || !order) {
      console.error('❌ Ошибка получения заказа:', orderError)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    // Генерируем PDF
    const pdfBuffer = await generatePDF(order)
    
    // Настройка транспорта для отправки email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
    
    // Отправляем email с PDF вложением
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: order.customer_email,
      subject: `Biletele tale VOEVODA - Comanda #${orderId.slice(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937; text-align: center;">VOEVODA</h1>
          <h2 style="color: #374151;">Mulțumim pentru cumpărare!</h2>
          
          <p>Bună ${order.customer_first_name},</p>
          
          <p>Biletele tale pentru evenimentul VOEVODA sunt atașate la acest email.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Detalii comandă:</h3>
            <p><strong>Numărul comenzii:</strong> ${orderId}</p>
            <p><strong>Data evenimentului:</strong> 15 Februarie 2025, 19:00</p>
            <p><strong>Locația:</strong> Sala Polivalentă, Chișinău</p>
            <p><strong>Total bilete:</strong> ${order.total_tickets}</p>
            <p><strong>Total plătit:</strong> ${order.total_price} Lei</p>
          </div>
          
          <p><strong>Instrucțiuni importante:</strong></p>
          <ul>
            <li>Prezintă biletul PDF la intrare (pe telefon sau printat)</li>
            <li>QR codul de pe bilet va fi scanat la intrare</li>
            <li>Păstrează acest email pentru referințe viitoare</li>
          </ul>
          
          <p>Ne vedem la eveniment!</p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Echipa ${process.env.EMAIL_FROM_NAME}<br>
            Pentru întrebări: ${process.env.EMAIL_SUPPORT}
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `ticket-${orderId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }
    
    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ Email отправлен успешно:', info.messageId)
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info))
    
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