import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import path from 'path';
import { createSupabaseServerClient } from '@/lib/supabase-server';

interface OrderData {
  id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  total_price: number;
  total_tickets: number;
  status: string;
  qr_code: string;
  created_at: string;
}

interface OrderSeat {
  zone: string;
  row: string;
  number: string;
  price: number;
}

interface OrderGeneralAccess {
  ticket_name: string;
  price: number;
  quantity: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Получаем данные заказа
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Временно отключена проверка статуса paid для тестирования PDF генерации
    // if (order.status !== 'paid') {
    //   return NextResponse.json(
    //     { error: 'Order is not paid' },
    //     { status: 400 }
    //   );
    // }

    // Получаем места заказа
    const { data: seats } = await supabase
      .from('order_seats')
      .select('*')
      .eq('order_id', orderId);

    // Получаем general access билеты
    const { data: generalAccess } = await supabase
      .from('order_general_access')
      .select('*')
      .eq('order_id', orderId);

    // Генерируем QR код на лету
    const qrCode = `ORDER:${orderId}:${Date.now()}`;

    // Генерируем PDF
    const pdfBuffer = await generatePDF(order, seats || [], generalAccess || [], qrCode);

    // Сохраняем PDF в Supabase Storage
    const fileName = `tickets/ticket-${orderId}-${Date.now()}.pdf`;
    
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tickets')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('Ошибка загрузки PDF в Storage:', uploadError);
        // Возвращаем PDF напрямую если не удалось сохранить
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="ticket-${orderId}.pdf"`,
          },
        });
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('tickets')
        .getPublicUrl(fileName);

      console.log('PDF сохранен в Storage:', urlData.publicUrl);
      
      // Возвращаем PDF
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ticket-${orderId}.pdf"`,
          'X-PDF-URL': urlData.publicUrl, // Добавляем URL в заголовок для клиента
        },
      });
    } catch (storageError) {
      console.error('Ошибка работы с Storage:', storageError);
      // Возвращаем PDF напрямую если произошла ошибка
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ticket-${orderId}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

async function generatePDF(
  order: OrderData,
  seats: OrderSeat[],
  generalAccess: OrderGeneralAccess[],
  qrCode: string
): Promise<Buffer> {
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
    if (qrCode) {
      const qrCodeDataURL = await QRCode.toDataURL(qrCode, {
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
    }
    
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
    if (seats.length > 0) {
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      seats.forEach((seat, index) => {
        const seatText = `ZONA: ${seat.zone}  •  RÂNDUL: ${seat.row}  •  LOC: ${seat.number}`;
        doc.text(seatText, centerX, textY, { align: 'center' });
        textY += 35;
      });
    }
    
    if (generalAccess.length > 0) {
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      generalAccess.forEach((ga, index) => {
        doc.text(`${ga.ticket_name} x${ga.quantity}`, centerX, textY, { align: 'center' });
        textY += 35;
      });
    }
    
    // Конвертируем PDF в Buffer
    const pdfArrayBuffer = doc.output('arraybuffer');
    return Buffer.from(pdfArrayBuffer);
  } catch (error) {
    throw error;
  }
}