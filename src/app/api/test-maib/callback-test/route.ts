import { NextRequest, NextResponse } from 'next/server';

// Тестовый endpoint для проверки доступности callback URL
export async function POST(request: NextRequest) {
  try {
    console.log('\n=== MAIB Callback Test ===');
    
    // Логируем все заголовки
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Request headers:', headers);
    
    // Получаем IP адрес отправителя
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     request.headers.get('cf-connecting-ip') || 
                     'unknown';
    
    console.log('Client IP:', clientIp);
    
    // Проверяем, является ли IP адрес MAIB
    const maibIPs = ['91.250.245.70', '91.250.245.71'];
    const isFromMAIB = maibIPs.includes(clientIp);
    
    console.log('Is request from MAIB IP?', isFromMAIB);
    
    // Читаем тело запроса
    const body = await request.json().catch(() => null);
    console.log('Request body:', body);
    
    // Возвращаем успешный ответ (HTTP 200 OK)
    return NextResponse.json({
      success: true,
      message: 'Callback test endpoint is working',
      clientIp,
      isFromMAIB,
      timestamp: new Date().toISOString(),
      headers: {
        'user-agent': headers['user-agent'],
        'content-type': headers['content-type'],
        'x-forwarded-for': headers['x-forwarded-for'],
        'x-real-ip': headers['x-real-ip']
      }
    });
  } catch (error) {
    console.error('Callback test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint для проверки доступности
export async function GET() {
  return NextResponse.json({
    message: 'MAIB callback test endpoint is active',
    timestamp: new Date().toISOString(),
    expectedIPs: ['91.250.245.70', '91.250.245.71']
  });
}