const { HttpsProxyAgent } = require('https-proxy-agent');
const https = require('https');

// Получаем переменные окружения
const fixieUrl = process.env.FIXIE_URL;
const maibProjectId = process.env.MAIB_PROJECT_ID;
const maibProjectSecret = process.env.MAIB_PROJECT_SECRET;

if (!fixieUrl) {
  console.error('❌ FIXIE_URL не установлен в переменных окружения');
  process.exit(1);
}

if (!maibProjectId || !maibProjectSecret) {
  console.error('❌ MAIB учетные данные не установлены');
  process.exit(1);
}

console.log('🔍 Тестирование MAIB API через Fixie прокси...');
console.log('📡 Прокси URL:', fixieUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

// Создаем прокси агент
const agent = new HttpsProxyAgent(fixieUrl);

// Функция для тестирования MAIB API
function testMaibApi(useProxy = false) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      projectId: maibProjectId,
      projectSecret: maibProjectSecret
    });

    const options = {
      hostname: 'maib.ecommerce.md',
      port: 443,
      path: '/v1/generate-token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      agent: useProxy ? agent : undefined
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            response: response
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            response: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(postData);
    req.end();
  });
}

async function testMaibProxy() {
  try {
    console.log('\n1️⃣ Тестирование MAIB API без прокси...');
    const directResult = await testMaibApi(false);
    console.log('🌐 Прямое подключение:');
    console.log('   Статус:', directResult.statusCode);
    console.log('   Ответ:', JSON.stringify(directResult.response, null, 2));

    console.log('\n2️⃣ Тестирование MAIB API через Fixie прокси...');
    const proxyResult = await testMaibApi(true);
    console.log('🔒 Через прокси:');
    console.log('   Статус:', proxyResult.statusCode);
    console.log('   Ответ:', JSON.stringify(proxyResult.response, null, 2));

    console.log('\n📊 Результаты:');
    if (directResult.statusCode === proxyResult.statusCode) {
      console.log('✅ Оба запроса вернули одинаковый статус код');
      
      if (directResult.statusCode === 200) {
        console.log('✅ MAIB API успешно работает через Fixie прокси!');
      } else {
        console.log('⚠️  Оба запроса вернули ошибку, но прокси передает запросы корректно');
      }
    } else {
      console.log('❌ Разные статус коды - возможна проблема с прокси');
    }

  } catch (error) {
    console.error('❌ Ошибка при тестировании MAIB API:', error.message);
    process.exit(1);
  }
}

// Запускаем тест
testMaibProxy();