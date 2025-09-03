import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';
import * as path from 'path';
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
    
    // Используем QR код из переданных данных билета
     let qrCodeDataURL = '';
     if (ticketInfo.qr_code) {
       try {
         // ticketInfo.qr_code уже содержит JSON объект с данными
         qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(ticketInfo.qr_code), {
           width: 300,
           margin: 1,
           color: {
             dark: '#000000',
             light: '#FFFFFF'
           }
         });
       } catch (error) {
         console.error('Error generating QR code from ticket data:', error);
         // Fallback - генерируем простой QR код с номером билета
         qrCodeDataURL = await QRCode.toDataURL(ticketInfo.ticket_number || `ticket-${ticketNumber}`, {
           width: 300,
           margin: 1,
           color: {
             dark: '#000000',
             light: '#FFFFFF'
           }
         });
       }
     } else {
       // Fallback если QR код отсутствует
       qrCodeDataURL = await QRCode.toDataURL(ticketInfo.ticket_number || `ticket-${ticketNumber}`, {
         width: 300,
         margin: 1,
         color: {
           dark: '#000000',
           light: '#FFFFFF'
         }
       });
     }
    
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

    // Получаем билеты из таблицы tickets вместо order_seats и order_general_access
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        ticket_number,
        qr_code,
        seat_id,
        metadata,
        order_id
      `)
      .eq('order_id', orderId)
      .order('created_at');

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json(
        { error: 'No tickets found for this order' },
        { status: 404 }
      );
    }

    // Получаем информацию о местах для билетов с seat_id
    const seatTickets = tickets.filter(t => t.seat_id);
    let seatDetails: Array<{id: string, zone: string, row: string, number: string}> = [];
    if (seatTickets.length > 0) {
      const seatIds = seatTickets.map(t => t.seat_id);
      const { data: seats } = await supabase
        .from('seats')
        .select('id, zone, row, number')
        .in('id', seatIds);
      seatDetails = seats || [];
    }

    // Если указан конкретный индекс билета, генерируем только его
    if (ticketIndex) {
      const index = parseInt(ticketIndex) - 1;
      
      if (index < 0 || index >= tickets.length) {
        return NextResponse.json(
          { error: 'Invalid ticket index' },
          { status: 400 }
        );
      }

      const ticket = tickets[index];
      let ticketInfo = null;
      let filename = '';
      
      // Определяем тип билета и получаем информацию
      if (ticket.seat_id) {
        // Билет с местом
        const seatDetail = seatDetails.find(s => s.id === ticket.seat_id);
        if (seatDetail) {
          ticketInfo = {
            type: 'seat',
            zone: seatDetail.zone,
            row: seatDetail.row,
            number: seatDetail.number,
            qr_code: ticket.qr_code,
            ticket_number: ticket.ticket_number
          };
          filename = `bilet-${index + 1}-zona-${seatDetail.zone}-rand-${seatDetail.row}-loc-${seatDetail.number}.pdf`;
        }
      } else {
        // Билет общего доступа
        const metadata = ticket.metadata || {};
        ticketInfo = {
          type: 'general',
          name: metadata.ticket_name || 'General Access',
          qr_code: ticket.qr_code,
          ticket_number: ticket.ticket_number
        };
        filename = `bilet-${index + 1}-${(metadata.ticket_name || 'general').replace(/\s+/g, '-').toLowerCase()}.pdf`;
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
    const JSZip = await import('jszip');
    const zip = new JSZip.default();
    
    let ticketCounter = 1;
    const baseTimestamp = Date.now();
    
    // Добавляем все билеты
    for (const ticket of tickets) {
      let ticketInfo = null;
      let filename = '';
      
      if (ticket.seat_id) {
        // Билет с местом
        const seatDetail = seatDetails.find(s => s.id === ticket.seat_id);
        if (seatDetail) {
          ticketInfo = {
            type: 'seat',
            zone: seatDetail.zone,
            row: seatDetail.row,
            number: seatDetail.number,
            qr_code: ticket.qr_code,
            ticket_number: ticket.ticket_number
          };
          filename = `bilet-${ticketCounter}-zona-${seatDetail.zone}-rand-${seatDetail.row}-loc-${seatDetail.number}-${baseTimestamp + ticketCounter}.pdf`;
        }
      } else {
        // Билет общего доступа
        const metadata = ticket.metadata || {};
        ticketInfo = {
          type: 'general',
          name: metadata.ticket_name || 'General Access',
          qr_code: ticket.qr_code,
          ticket_number: ticket.ticket_number
        };
        filename = `bilet-${ticketCounter}-${(metadata.ticket_name || 'general').replace(/\s+/g, '-').toLowerCase()}-${baseTimestamp + ticketCounter}.pdf`;
      }
      
      if (ticketInfo) {
         const pdfBuffer = await generateSingleTicketPDF(order, ticketInfo, ticketCounter);
         zip.file(filename, pdfBuffer);
       }
      
      ticketCounter++;
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
    // Error generating PDF
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}