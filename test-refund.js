/**
 * Тестовый скрипт для проверки функционала возвратов
 */

const BASE_URL = 'http://localhost:3001';

// Функция для выполнения HTTP запросов
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    console.error('Request failed:', error);
    return {
      ok: false,
      error: error.message
    };
  }
}

// Тест 1: Получение списка заказов
async function testGetOrders() {
  console.log('\n🧪 Тест 1: Получение списка заказов');
  
  const result = await makeRequest(`${BASE_URL}/api/admin/orders?page=1&limit=5`);
  
  if (result.ok) {
    console.log('✅ Заказы получены успешно');
    console.log(`📊 Найдено заказов: ${result.data.orders.length}`);
    
    // Найдем оплаченный заказ для тестирования возврата
    const paidOrder = result.data.orders.find(order => order.status === 'paid');
    
    if (paidOrder) {
      console.log(`💳 Найден оплаченный заказ для тестирования: ${paidOrder.id}`);
      return paidOrder;
    } else {
      console.log('⚠️  Оплаченных заказов не найдено');
      // Покажем первый заказ для информации
      if (result.data.orders.length > 0) {
        console.log(`📋 Первый заказ: ${result.data.orders[0].id} (статус: ${result.data.orders[0].status})`);
        return result.data.orders[0];
      }
    }
  } else {
    console.log('❌ Ошибка получения заказов:', result.data?.error || result.error);
  }
  
  return null;
}

// Тест 2: Попытка возврата (тестовый режим)
async function testRefund(order) {
  if (!order) {
    console.log('\n⚠️  Тест возврата пропущен - нет подходящего заказа');
    return;
  }
  
  console.log('\n🧪 Тест 2: Тестирование API возврата');
  console.log(`🎯 Тестируем возврат для заказа: ${order.id}`);
  
  // Если заказ не оплачен, покажем что произойдет
  if (order.status !== 'paid') {
    console.log(`⚠️  Заказ имеет статус '${order.status}', а не 'paid'`);
    console.log('📝 Попробуем выполнить возврат для демонстрации обработки ошибок...');
  }
  
  const result = await makeRequest(`${BASE_URL}/api/admin/refunds`, {
    method: 'POST',
    body: JSON.stringify({
      orderId: order.id,
      reason: 'Тестовый возврат через API'
    })
  });
  
  if (result.ok) {
    console.log('✅ Возврат обработан успешно!');
    console.log('📊 Результат:', JSON.stringify(result.data, null, 2));
  } else {
    console.log('❌ Ошибка возврата:', result.data?.error || result.error);
    console.log('📊 Детали ошибки:', JSON.stringify(result.data, null, 2));
  }
}

// Тест 3: Получение списка возвратов
async function testGetRefunds() {
  console.log('\n🧪 Тест 3: Получение списка возвратов');
  
  const result = await makeRequest(`${BASE_URL}/api/admin/refunds?page=1&limit=10`);
  
  if (result.ok) {
    console.log('✅ Список возвратов получен успешно');
    console.log(`📊 Найдено возвратов: ${result.data.refunds.length}`);
    
    if (result.data.refunds.length > 0) {
      console.log('📋 Последние возвраты:');
      result.data.refunds.slice(0, 3).forEach((refund, index) => {
        console.log(`  ${index + 1}. Заказ: ${refund.order_id}, Сумма: ${refund.amount}, Статус: ${refund.status}`);
      });
    }
  } else {
    console.log('❌ Ошибка получения возвратов:', result.data?.error || result.error);
  }
}

// Тест 4: Проверка MAIB клиента
async function testMaibConnection() {
  console.log('\n🧪 Тест 4: Проверка подключения к MAIB');
  
  // Проверим переменные окружения
  const requiredEnvVars = ['MAIB_PROJECT_ID', 'MAIB_PROJECT_SECRET', 'MAIB_SIGNATURE_KEY'];
  const missingVars = [];
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.log('⚠️  Отсутствуют переменные окружения MAIB:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('💡 Возвраты через MAIB могут не работать без этих переменных');
  } else {
    console.log('✅ Все необходимые переменные окружения MAIB настроены');
  }
}

// Основная функция тестирования
async function runTests() {
  console.log('🚀 Запуск тестов функционала возвратов');
  console.log('=' .repeat(50));
  
  // Проверка MAIB
  await testMaibConnection();
  
  // Получение заказов
  const testOrder = await testGetOrders();
  
  // Тестирование возврата
  await testRefund(testOrder);
  
  // Получение возвратов
  await testGetRefunds();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Тестирование завершено');
  console.log('\n💡 Для полного тестирования:');
  console.log('   1. Убедитесь что есть оплаченные заказы в системе');
  console.log('   2. Настройте переменные окружения MAIB');
  console.log('   3. Проверьте функционал через веб-интерфейс админки');
}

// Запуск тестов
if (typeof window === 'undefined') {
  // Node.js environment
  const { fetch } = require('undici');
  global.fetch = fetch;
  runTests().catch(console.error);
} else {
  // Browser environment
  runTests().catch(console.error);
}