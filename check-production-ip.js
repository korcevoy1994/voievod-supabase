const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Функция для получения IP через внешний сервис
function getExternalIP(useProxy = false) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.ipify.org',
      port: 443,
      path: '/',
      method: 'GET'
    };

    if (useProxy && process.env.FIXIE_URL) {
      options.agent = new HttpsProxyAgent(process.env.FIXIE_URL);
      console.log('Using Fixie proxy:', process.env.FIXIE_URL.replace(/:\/\/.*@/, '://***@'));
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data.trim());
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Функция для тестирования MAIB API
function testMAIBAPI(useProxy = false) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      amount: 100,
      currency: 'MDL',
      clientIp: '127.0.0.1',
      description: 'Test payment',
      language: 'ro'
    });

    const options = {
      hostname: 'maib.ecommerce.md',
      port: 443,
      path: '/v1/pay',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Basic ${Buffer.from(`${process.env.MAIB_PROJECT_ID}:${process.env.MAIB_PROJECT_SECRET}`).toString('base64')}`
      }
    };

    if (useProxy && process.env.FIXIE_URL) {
      options.agent = new HttpsProxyAgent(process.env.FIXIE_URL);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          response: data,
          proxyUsed: useProxy && !!process.env.FIXIE_URL
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('Testing IP detection and MAIB API...');
  console.log('FIXIE_URL configured:', !!process.env.FIXIE_URL);
  
  try {
    // Тест 1: Прямое подключение для получения IP
    console.log('\n1. Testing direct connection IP:');
    const directIP = await getExternalIP(false);
    console.log('Direct IP:', directIP);

    // Тест 2: Подключение через Fixie прокси для получения IP
    if (process.env.FIXIE_URL) {
      console.log('\n2. Testing Fixie proxy IP:');
      try {
        const proxyIP = await getExternalIP(true);
        console.log('Proxy IP:', proxyIP);
        
        // Проверяем, является ли IP одним из статических IP Fixie
        const fixieIPs = ['54.217.142.99', '54.195.3.54'];
        if (fixieIPs.includes(proxyIP)) {
          console.log('✅ SUCCESS: Proxy is working with expected static IP!');
        } else {
          console.log('❌ WARNING: Proxy IP does not match expected Fixie static IPs');
          console.log('Expected IPs:', fixieIPs.join(', '));
        }
      } catch (error) {
        console.log('❌ Error testing proxy IP:', error.message);
      }
    } else {
      console.log('\n❌ FIXIE_URL not configured');
    }

    // Тест 3: Тестирование MAIB API
    console.log('\n3. Testing MAIB API:');
    try {
      const maibResult = await testMAIBAPI(!!process.env.FIXIE_URL);
      console.log('MAIB API test result:', {
        statusCode: maibResult.statusCode,
        proxyUsed: maibResult.proxyUsed,
        responsePreview: maibResult.response.substring(0, 200) + '...'
      });
    } catch (error) {
      console.log('❌ Error testing MAIB API:', error.message);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

main();