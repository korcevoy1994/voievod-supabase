import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Test callback received:', {
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
      body: JSON.stringify(body, null, 2),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test callback received successfully',
      timestamp: new Date().toISOString(),
      receivedData: body
    });
  } catch (error) {
    console.error('Test callback error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process test callback',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test callback endpoint is active',
    timestamp: new Date().toISOString(),
    ngrokUrl: process.env.NEXT_PUBLIC_APP_URL
  });
}