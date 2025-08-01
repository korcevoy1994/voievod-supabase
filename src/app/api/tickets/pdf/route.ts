import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import path from 'path';
import { createSupabaseServerClient } from '@/lib/supabase-server';

async function generateSingleTicketPDF(
  order: OrderData,
  ticketInfo: any,
  ticketNumber: number
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
    
    // Генерируем QR код для конкретного билета
     const ticketId = `VOEV-2025-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
     const timestamp = Date.now() / 1000;
     const checksum = require('crypto').createHash('md5').update(`${order.id}${ticketId}${timestamp}`).digest('hex');
     
     const qrData = JSON.stringify({
       ticket_id: order.id,
       ticket_number: ticketId,
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
    
    // Информация о билете в зависимости от типа
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    
    if (ticketInfo.type === 'seat') {
      const seatText = `ZONA: ${ticketInfo.zone}  •  RÂNDUL: ${ticketInfo.row}  •  LOC: ${ticketInfo.number}`;
      doc.text(seatText, centerX, textY, { align: 'center' });
    } else if (ticketInfo.type === 'general') {
      doc.text(ticketInfo.name, centerX, textY, { align: 'center' });
    }
    
    // Конвертируем PDF в Buffer
    const pdfArrayBuffer = doc.output('arraybuffer');
    return Buffer.from(pdfArrayBuffer);
  } catch (error) {
    throw error;
  }
}

interface OrderData {
  id: string; // Теперь короткий 8-символьный ID
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  total_price: number;
  total_tickets: number;
  status: string;
  qr_code?: string;
  created_at: string;
}

interface OrderSeat {
  price: number;
  seats: {
    zone: string;
    row: string;
    number: string;
  };
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
    const ticketIndex = searchParams.get('ticketIndex'); // Новый параметр для указания конкретного билета

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

    // Получаем места заказа
    const { data: orderSeats } = await supabase
      .from('order_seats')
      .select('*')
      .eq('order_id', orderId);

    // Получаем информацию о местах отдельным запросом
    let seats = [];
    if (orderSeats && orderSeats.length > 0) {
      const seatIds = orderSeats.map(os => os.seat_id);
      const { data: seatDetails } = await supabase
        .from('seats')
        .select('id, zone, row, number')
        .in('id', seatIds);
      
      // Объединяем данные
      seats = orderSeats.map(orderSeat => {
        const seatDetail = seatDetails?.find(sd => sd.id === orderSeat.seat_id);
        return {
          ...orderSeat,
          seats: seatDetail ? {
            zone: seatDetail.zone,
            row: seatDetail.row,
            number: seatDetail.number
          } : null
        };
      });
    }

    // Получаем general access билеты
    const { data: generalAccess } = await supabase
      .from('order_general_access')
      .select('*')
      .eq('order_id', orderId);

    // Если указан конкретный индекс билета, генерируем только его
    if (ticketIndex) {
      const index = parseInt(ticketIndex) - 1;
      let ticketInfo = null;
      let filename = '';
      
      // Определяем, какой билет нужно сгенерировать
      if (seats && index < seats.length) {
        const seat = seats[index];
        // Получаем данные о месте из связанной таблицы
        const { zone, row, number } = seat.seats;
        ticketInfo = {
          type: 'seat',
          zone,
          row,
          number,
          price: seat.price
        };
        filename = `bilet-${index + 1}-zona-${zone}-rand-${row}-loc-${number}.pdf`;
      } else if (generalAccess) {
        const gaIndex = index - (seats?.length || 0);
        let currentIndex = 0;
        
        for (const ga of generalAccess) {
          if (gaIndex >= currentIndex && gaIndex < currentIndex + ga.quantity) {
            ticketInfo = {
              type: 'general',
              name: ga.ticket_name,
              price: ga.price
            };
            filename = `bilet-${index + 1}-${ga.ticket_name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
            break;
          }
          currentIndex += ga.quantity;
        }
      }
      
      if (!ticketInfo) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        );
      }
      
      const pdfBuffer = await generateSingleTicketPDF(order, ticketInfo, parseInt(ticketIndex));
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Если индекс не указан, генерируем ZIP архив со всеми билетами
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    let ticketCounter = 1;
    const baseTimestamp = Date.now();
    
    // Добавляем билеты для мест
    if (seats && seats.length > 0) {
      for (const seat of seats) {
        // Получаем данные о месте из связанной таблицы
        const { zone, row, number } = seat.seats;
        const ticketInfo = {
          type: 'seat',
          zone,
          row,
          number,
          price: seat.price
        };
        
        const pdfBuffer = await generateSingleTicketPDF(order, ticketInfo, ticketCounter);
        const filename = `bilet-${ticketCounter}-zona-${zone}-rand-${row}-loc-${number}-${baseTimestamp + ticketCounter}.pdf`;
        
        zip.file(filename, pdfBuffer);
        ticketCounter++;
      }
    }
    
    // Добавляем билеты общего доступа
    if (generalAccess && generalAccess.length > 0) {
      for (const ga of generalAccess) {
        for (let i = 0; i < ga.quantity; i++) {
          const ticketInfo = {
            type: 'general',
            name: ga.ticket_name,
            price: ga.price
          };
          
          const pdfBuffer = await generateSingleTicketPDF(order, ticketInfo, ticketCounter);
          const filename = `bilet-${ticketCounter}-${ga.ticket_name.replace(/\s+/g, '-').toLowerCase()}-${baseTimestamp + ticketCounter}.pdf`;
          
          zip.file(filename, pdfBuffer);
          ticketCounter++;
        }
      }
    }
    
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="bilete-${orderId}.zip"`,
      },
    });
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}