const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testOrderPaymentsStructure() {
  try {
    console.log('🔍 Тестирование структуры order_payments...');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Отсутствуют переменные окружения Supabase');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Попробуем создать запись с минимальными данными
    console.log('📝 Создание тестовой записи с минимальными данными...');
    
    const minimalData = {
      order_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 100,
      payment_method: 'card',
      payment_provider: 'maib',
      status: 'pending'
    };
    
    const { data: minimal, error: minimalError } = await supabase
      .from('order_payments')
      .insert(minimalData)
      .select()
      .single();
    
    if (minimalError) {
      console.error('❌ Ошибка создания минимальной записи:', minimalError);
    } else {
      console.log('✅ Минимальная запись создана успешно');
      console.log('📋 Доступные колонки:');
      Object.keys(minimal).forEach(col => {
        console.log(`  - ${col}: ${typeof minimal[col]} = ${minimal[col]}`);
      });
      
      // Удаляем тестовую запись
      await supabase
        .from('order_payments')
        .delete()
        .eq('id', minimal.id);
      console.log('🗑️ Тестовая запись удалена');
    }
    
    // Теперь попробуем создать запись с дополнительными полями
    console.log('\n📝 Создание записи с дополнительными полями...');
    
    const fullData = {
      order_id: '550e8400-e29b-41d4-a716-446655440000',
      event_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 100,
      payment_method: 'card',
      payment_provider: 'maib',
      provider_payment_id: 'test-payment-id',
      status: 'pending',
      provider_data: {
        payUrl: 'https://test.com',
        transactionId: 'test-tx-id'
      }
    };
    
    const { data: full, error: fullError } = await supabase
      .from('order_payments')
      .insert(fullData)
      .select()
      .single();
    
    if (fullError) {
      console.error('❌ Ошибка создания полной записи:', fullError);
      
      // Попробуем по одному полю
      console.log('\n🔍 Проверка полей по отдельности...');
      
      const fieldsToTest = [
        { name: 'event_id', value: '550e8400-e29b-41d4-a716-446655440000' },
        { name: 'provider_payment_id', value: 'test-payment-id' },
        { name: 'provider_data', value: { test: 'data' } }
      ];
      
      for (const field of fieldsToTest) {
        const testData = {
          ...minimalData,
          [field.name]: field.value
        };
        
        const { data: testResult, error: testError } = await supabase
          .from('order_payments')
          .insert(testData)
          .select()
          .single();
        
        if (testError) {
          console.log(`❌ ${field.name}: ${testError.message}`);
        } else {
          console.log(`✅ ${field.name}: поддерживается`);
          // Удаляем тестовую запись
          await supabase
            .from('order_payments')
            .delete()
            .eq('id', testResult.id);
        }
      }
    } else {
      console.log('✅ Полная запись создана успешно');
      console.log('📋 Все доступные колонки:');
      Object.keys(full).forEach(col => {
        console.log(`  - ${col}: ${typeof full[col]} = ${JSON.stringify(full[col])}`);
      });
      
      // Удаляем тестовую запись
      await supabase
        .from('order_payments')
        .delete()
        .eq('id', full.id);
      console.log('🗑️ Тестовая запись удалена');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testOrderPaymentsStructure();