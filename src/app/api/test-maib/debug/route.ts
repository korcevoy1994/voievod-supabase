import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('\n=== MAIB Debug Test ===');
    
    // Проверяем переменные окружения
    const projectId = process.env.MAIB_PROJECT_ID;
    const projectSecret = process.env.MAIB_PROJECT_SECRET;
    const signatureKey = process.env.MAIB_SIGNATURE_KEY;
    
    console.log('Environment variables:');
    console.log('MAIB_PROJECT_ID:', projectId ? `${projectId.substring(0, 4)}...` : 'NOT SET');
    console.log('MAIB_PROJECT_SECRET:', projectSecret ? `${projectSecret.substring(0, 4)}...` : 'NOT SET');
    console.log('MAIB_SIGNATURE_KEY:', signatureKey ? `${signatureKey.substring(0, 4)}...` : 'NOT SET');
    
    if (!projectId || !projectSecret || !signatureKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          hasProjectId: !!projectId,
          hasProjectSecret: !!projectSecret,
          hasSignatureKey: !!signatureKey,
        }
      }, { status: 500 });
    }
    
    // Тестируем только генерацию токена
    console.log('Testing token generation...');
    
    const tokenResponse = await fetch('https://api.maibmerchants.md/v1/generate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: projectId,
        projectSecret: projectSecret,
      }),
    });
    
    console.log('Token response status:', tokenResponse.status);
    console.log('Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));
    
    const tokenResponseText = await tokenResponse.text();
    console.log('Token response body:', tokenResponseText);
    
    let tokenResult;
    try {
      tokenResult = JSON.parse(tokenResponseText);
    } catch (e) {
      tokenResult = { rawResponse: tokenResponseText };
    }
    
    console.log('=== Debug completed ===\n');
    
    return NextResponse.json({
      success: tokenResponse.ok,
      tokenGeneration: {
        status: tokenResponse.status,
        result: tokenResult,
      },
      environment: {
        hasProjectId: !!projectId,
        hasProjectSecret: !!projectSecret,
        hasSignatureKey: !!signatureKey,
        projectIdLength: projectId?.length || 0,
        projectSecretLength: projectSecret?.length || 0,
        signatureKeyLength: signatureKey?.length || 0,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Debug test failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}