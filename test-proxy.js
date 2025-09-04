const { HttpsProxyAgent } = require('https-proxy-agent');
const https = require('https');
const http = require('http');

// Получаем FIXIE_URL из переменных окружения
const fixieUrl = process.env.FIXIE_URL;

if (!fixieUrl) {
  console.error('❌ FIXIE_URL не установлен в переменных окружения');
  process.exit(1);
}

console.log('🔍 Тестирование Fixie прокси...');
console.log('📡 Прокси URL:', fixieUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

// Создаем прокси агент
const agent = new HttpsProxyAgent(fixieUrl);

// Функция для получения IP адреса через HTTPS
function getIpAddressHttps(useProxy = false) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.ipify.org',
      port: 443,
      path: '/',
      method: 'GET',
      agent: useProxy ? agent : undefined
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      // Проверяем статус ответа
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data.trim());
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Функция для получения IP адреса через HTTP
function getIpAddressHttp(useProxy = false) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.ipify.org',
      port: 80,
      path: '/',
      method: 'GET',
      agent: useProxy ? agent : undefined
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      // Проверяем статус ответа
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data.trim());
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function testProxy() {
  try {
    console.log('\n1️⃣ Получение IP без прокси (HTTPS)...');
    const directIpHttps = await getIpAddressHttps(false);
    console.log('🌐 Прямой IP (HTTPS):', directIpHttps);

    console.log('\n2️⃣ Получение IP через Fixie прокси (HTTPS)...');
    try {
      const proxyIpHttps = await getIpAddressHttps(true);
      console.log('🔒 IP через прокси (HTTPS):', proxyIpHttps);
      
      console.log('\n📊 Результаты HTTPS:');
      if (directIpHttps !== proxyIpHttps) {
        console.log('✅ Прокси работает через HTTPS! IP адреса отличаются.');
        console.log('✅ Статический IP от Fixie:', proxyIpHttps);
        
        // Проверяем, соответствует ли IP одному из предоставленных Fixie
        const expectedIps = ['54.217.142.99', '54.195.3.54'];
        if (expectedIps.includes(proxyIpHttps)) {
          console.log('✅ IP соответствует одному из статических IP Fixie');
        } else {
          console.log('⚠️  IP не соответствует ожидаемым статическим IP Fixie');
          console.log('   Ожидаемые IP:', expectedIps.join(', '));
        }
      } else {
        console.log('❌ Прокси не работает через HTTPS! IP адреса одинаковые.');
      }
    } catch (httpsError) {
      console.log('❌ Ошибка HTTPS прокси:', httpsError.message);
      
      console.log('\n3️⃣ Пробуем HTTP...');
      try {
        const directIpHttp = await getIpAddressHttp(false);
        console.log('🌐 Прямой IP (HTTP):', directIpHttp);
        
        const proxyIpHttp = await getIpAddressHttp(true);
        console.log('🔒 IP через прокси (HTTP):', proxyIpHttp);
        
        console.log('\n📊 Результаты HTTP:');
        if (directIpHttp !== proxyIpHttp) {
          console.log('✅ Прокси работает через HTTP! IP адреса отличаются.');
          console.log('✅ Статический IP от Fixie:', proxyIpHttp);
          
          // Проверяем, соответствует ли IP одному из предоставленных Fixie
          const expectedIps = ['54.217.142.99', '54.195.3.54'];
          if (expectedIps.includes(proxyIpHttp)) {
            console.log('✅ IP соответствует одному из статических IP Fixie');
          } else {
            console.log('⚠️  IP не соответствует ожидаемым статическим IP Fixie');
            console.log('   Ожидаемые IP:', expectedIps.join(', '));
          }
        } else {
          console.log('❌ Прокси не работает через HTTP! IP адреса одинаковые.');
        }
      } catch (httpError) {
        console.log('❌ Ошибка HTTP прокси:', httpError.message);
      }
    }

  } catch (error) {
    console.error('❌ Общая ошибка при тестировании прокси:', error.message);
    process.exit(1);
  }
}

// Запускаем тест
testProxy();