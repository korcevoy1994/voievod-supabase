import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';

export async function GET(request: NextRequest) {
  try {
    // Проверяем IP без прокси
    const directIpResponse = await fetch('https://api.ipify.org?format=json');
    const directIp = await directIpResponse.json();

    // Проверяем IP через Fixie прокси
    let proxyIp = null;
    let proxyError = null;
    
    if (process.env.FIXIE_URL) {
      try {
        const agent = new HttpsProxyAgent(process.env.FIXIE_URL);
        
        const proxyResponse = await new Promise<any>((resolve, reject) => {
          const req = https.request('https://api.ipify.org?format=json', {
            agent,
            method: 'GET'
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            });
          });
          
          req.on('error', reject);
          req.end();
        });
        
        proxyIp = proxyResponse;
      } catch (error) {
        proxyError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return NextResponse.json({
      directIp: directIp.ip,
      proxyIp: proxyIp?.ip || null,
      proxyError,
      fixieConfigured: !!process.env.FIXIE_URL,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}