'use client';

import { useState } from 'react';

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
}

export default function TestMaibPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testAmount, setTestAmount] = useState('100');
  const [testOrderId, setTestOrderId] = useState('');

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  // Тест 1: Проверка переменных окружения
  const testEnvironmentVariables = async () => {
    addResult({
      test: 'Переменные окружения',
      status: 'pending',
      message: 'Проверка переменных окружения MAIB...'
    });

    try {
      const response = await fetch('/api/test-maib/env');
      const data = await response.json();
      
      if (response.ok) {
        addResult({
          test: 'Переменные окружения',
          status: 'success',
          message: 'Все переменные окружения настроены корректно',
          details: data
        });
      } else {
        addResult({
          test: 'Переменные окружения',
          status: 'error',
          message: data.error || 'Ошибка проверки переменных окружения',
          details: data
        });
      }
    } catch (error) {
      addResult({
        test: 'Переменные окружения',
        status: 'error',
        message: 'Ошибка подключения к API',
        details: error
      });
    }
  };

  // Тест 2: Проверка генерации токена
  const testTokenGeneration = async () => {
    addResult({
      test: 'Генерация токена',
      status: 'pending',
      message: 'Проверка генерации токена доступа MAIB...'
    });

    try {
      const response = await fetch('/api/test-maib/token');
      const data = await response.json();
      
      if (response.ok) {
        addResult({
          test: 'Генерация токена',
          status: 'success',
          message: 'Токен успешно сгенерирован',
          details: { tokenLength: data.token?.length || 0 }
        });
      } else {
        addResult({
          test: 'Генерация токена',
          status: 'error',
          message: data.error || 'Ошибка генерации токена',
          details: data
        });
      }
    } catch (error) {
      addResult({
        test: 'Генерация токена',
        status: 'error',
        message: 'Ошибка подключения к API',
        details: error
      });
    }
  };

  // Тест 3: Создание тестового платежа
  const testPaymentCreation = async () => {
    if (!testAmount || !testOrderId) {
      addResult({
        test: 'Создание платежа',
        status: 'error',
        message: 'Укажите сумму и ID заказа для тестирования'
      });
      return;
    }

    addResult({
      test: 'Создание платежа',
      status: 'pending',
      message: 'Создание тестового платежа...'
    });

    try {
      const response = await fetch('/api/test-maib/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(testAmount),
          orderId: testOrderId,
          description: `Тестовый платеж для заказа ${testOrderId}`
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        addResult({
          test: 'Создание платежа',
          status: 'success',
          message: 'Тестовый платеж успешно создан',
          details: data
        });
      } else {
        addResult({
          test: 'Создание платежа',
          status: 'error',
          message: data.error || 'Ошибка создания платежа',
          details: data
        });
      }
    } catch (error) {
      addResult({
        test: 'Создание платежа',
        status: 'error',
        message: 'Ошибка подключения к API',
        details: error
      });
    }
  };

  // Запуск всех тестов
  const runAllTests = async () => {
    setIsLoading(true);
    clearResults();
    
    await testEnvironmentVariables();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testTokenGeneration();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (testAmount && testOrderId) {
      await testPaymentCreation();
    }
    
    setIsLoading(false);
  };

  const generateTestOrderId = () => {
    const timestamp = Date.now();
    setTestOrderId(`test-${timestamp}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="text-green-500">✓</span>;
      case 'error':
        return <span className="text-red-500">✗</span>;
      case 'pending':
        return <span className="text-blue-500">⏳</span>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Тестирование интеграции MAIB</h1>
        <p className="text-gray-600">
          Эта страница позволяет протестировать интеграцию с платежной системой MAIB
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Панель управления тестами */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Управление тестами</h3>
            <p className="text-sm text-gray-600 mt-1">
              Настройте параметры и запустите тесты
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Сумма для тестирования (MDL)</label>
              <input
                id="amount"
                type="number"
                value={testAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestAmount(e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="orderId" className="block text-sm font-medium text-gray-700">ID заказа для тестирования</label>
              <div className="flex gap-2">
                <input
                  id="orderId"
                  value={testOrderId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestOrderId(e.target.value)}
                  placeholder="test-order-123"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={generateTestOrderId}
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Генерировать
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <button 
                onClick={runAllTests} 
                disabled={isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Выполнение тестов...
                  </>
                ) : (
                  'Запустить все тесты'
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={testEnvironmentVariables}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Тест переменных окружения
              </button>
              <button 
                onClick={testTokenGeneration}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Тест генерации токена
              </button>
              <button 
                onClick={testPaymentCreation}
                disabled={isLoading || !testAmount || !testOrderId}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Тест создания платежа
              </button>
            </div>

            <button 
              onClick={clearResults}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Очистить результаты
            </button>
          </div>
        </div>

        {/* Результаты тестов */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Результаты тестов</h3>
            <p className="text-sm text-gray-600 mt-1">
              Результаты выполнения тестов интеграции
            </p>
          </div>
          <div className="p-6">
            {results.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Запустите тесты для просмотра результатов
              </p>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className={`p-4 border rounded-lg ${
                    result.status === 'success' ? 'border-green-200 bg-green-50' : ''
                  }${
                    result.status === 'error' ? 'border-red-200 bg-red-50' : ''
                  }${
                    result.status === 'pending' ? 'border-blue-200 bg-blue-50' : ''
                  }`}>
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <h4 className="font-medium">{result.test}</h4>
                        <p className="mt-1 text-sm text-gray-600">
                          {result.message}
                        </p>
                        {result.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                              Подробности
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Информация о тестировании</h3>
        </div>
        <div className="p-6">
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Переменные окружения:</strong> Проверяет наличие и корректность MAIB_PROJECT_ID, MAIB_PROJECT_SECRET, MAIB_SIGNATURE_KEY</p>
            <p><strong>Генерация токена:</strong> Тестирует возможность генерации токена доступа к MAIB API</p>
            <p><strong>Создание платежа:</strong> Создает тестовый платеж через MAIB API (не выполняет реальную оплату)</p>
          </div>
        </div>
      </div>
    </div>
  );
}