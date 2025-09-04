import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';

interface MaibConfig {
  projectId: string;
  projectSecret: string;
  signatureKey: string;
  baseUrl?: string;
  isProduction?: boolean;
}

interface PaymentRequest {
  amount: number;
  currency: string;
  clientIp: string;
  orderId?: string;
  description?: string;
  clientName?: string;
  email?: string;
  phone?: string;
  delivery?: number;
  items?: Array<{
    id?: string;
    name?: string;
    price?: number;
    quantity?: number;
  }>;
  okUrl?: string;
  failUrl?: string;
  callbackUrl?: string;
  language?: string;
}

interface PaymentResponse {
  payUrl: string;
  payId: string;
  orderId?: string;
}

interface PaymentInfo {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  orderId: string;
  paymentDate?: string;
}

class MaibClient {
  private config: MaibConfig;
  private baseUrl: string;

  constructor(config: MaibConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.maibmerchants.md/v1';
  }

  /**
   * Создает агент прокси для HTTP запросов если настроен FIXIE_URL
   */
  private createProxyAgent(): HttpsProxyAgent<string> | undefined {
    const fixieUrl = process.env.FIXIE_URL;
    if (fixieUrl) {
      console.log('Using Fixie proxy for MAIB requests:', {
        proxyUrl: fixieUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'),
        timestamp: new Date().toISOString()
      });
      return new HttpsProxyAgent(fixieUrl);
    }
    return undefined;
  }

  /**
   * Генерация токена доступа
   */
  private async generateToken(): Promise<string> {
    console.log('MAIB Token Request:', {
      baseUrl: this.baseUrl,
      projectId: this.config.projectId,
      hasProjectSecret: !!this.config.projectSecret,
      timestamp: new Date().toISOString()
    });

    const agent = this.createProxyAgent();
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: this.config.projectId,
        projectSecret: this.config.projectSecret,
      }),
    };

    if (agent) {
      (fetchOptions as any).agent = agent;
    }

    const response = await fetch(`${this.baseUrl}/generate-token`, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MAIB Token Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Failed to generate token: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('MAIB Token Response:', {
      hasResult: !!result.result,
      hasAccessToken: !!(result.result?.accessToken || result.accessToken || result.token),
      resultKeys: Object.keys(result)
    });
    
    // MAIB API возвращает токен в result.accessToken
    return result.result?.accessToken || result.accessToken || result.token;
  }

  /**
   * Создание прямого платежа
   */
  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    const token = await this.generateToken();

    // Подготавливаем тело запроса согласно документации MAIB
    const requestBody: any = {
      amount: paymentData.amount, // Сумма уже в правильном формате (лей)
      currency: paymentData.currency,
      clientIp: paymentData.clientIp,
      language: paymentData.language || 'ru',
    };

    // Добавляем опциональные параметры если они переданы
    if (paymentData.orderId) requestBody.orderId = paymentData.orderId;
    if (paymentData.description) requestBody.description = paymentData.description;
    if (paymentData.clientName) requestBody.clientName = paymentData.clientName;
    if (paymentData.email) requestBody.email = paymentData.email;
    if (paymentData.phone) requestBody.phone = paymentData.phone;
    if (paymentData.delivery) requestBody.delivery = paymentData.delivery;
    if (paymentData.items) requestBody.items = paymentData.items;
    if (paymentData.okUrl) requestBody.okUrl = paymentData.okUrl;
    if (paymentData.failUrl) requestBody.failUrl = paymentData.failUrl;
    if (paymentData.callbackUrl) requestBody.callbackUrl = paymentData.callbackUrl;

    console.log('MAIB Payment Request:', {
      url: `${this.baseUrl}/pay`,
      hasToken: !!token,
      requestBody,
      timestamp: new Date().toISOString()
    });

    const agent = this.createProxyAgent();
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    };

    if (agent) {
      (fetchOptions as any).agent = agent;
    }

    const response = await fetch(`${this.baseUrl}/pay`, fetchOptions);

    if (!response.ok) {
      let errorMessage = response.statusText;
      let responseText = '';
      try {
        responseText = await response.text();
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            // Проверяем структуру ошибок MAIB API
            if (errorData.errors && Array.isArray(errorData.errors)) {
              errorMessage = errorData.errors.map((err: any) => 
                `${err.errorCode}: ${err.errorMessage}`
              ).join(', ');
            } else {
              errorMessage = errorData.message || responseText;
            }
          } catch {
            errorMessage = responseText;
          }
        }
      } catch {
        // Используем statusText если не можем прочитать ответ
      }
      
      console.error('MAIB Payment Error:', {
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        responseText,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Payment creation failed: ${response.status} ${errorMessage}`);
    }

    const result = await response.json();
    
    console.log('MAIB Payment Response:', {
      ok: result.ok,
      hasResult: !!result.result,
      resultKeys: result.result ? Object.keys(result.result) : [],
      timestamp: new Date().toISOString()
    });
    
    // Проверяем успешность ответа
    if (!result.ok) {
      let errorMessage = 'Unknown error';
      if (result.errors && Array.isArray(result.errors)) {
        errorMessage = result.errors.map((err: any) => 
          `${err.errorCode}: ${err.errorMessage}`
        ).join(', ');
      }
      console.error('MAIB Payment Result Error:', {
        errorMessage,
        errors: result.errors,
        fullResult: result
      });
      throw new Error(`Payment creation failed: ${errorMessage}`);
    }

    return {
      payUrl: result.result.payUrl,
      payId: result.result.payId,
      orderId: result.result.orderId,
    };
  }

  /**
   * Получение информации о платеже
   */
  async getPaymentInfo(transactionId: string): Promise<PaymentInfo> {
    const token = await this.generateToken();

    const agent = this.createProxyAgent();
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        transactionId,
      }),
    };

    if (agent) {
      (fetchOptions as any).agent = agent;
    }

    const response = await fetch(`${this.baseUrl}/pay-info`, fetchOptions);

    if (!response.ok) {
      throw new Error(`Failed to get payment info: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      transactionId: result.transactionId,
      status: result.status,
      amount: result.amount,
      currency: result.currency,
      orderId: result.orderId,
      paymentDate: result.paymentDate,
    };
  }

  /**
   * Возврат платежа
   */
  async refundPayment(payId: string, refundAmount?: number): Promise<boolean> {
    const token = await this.generateToken();

    const requestBody: any = {
      payId,
    };

    if (refundAmount) {
      requestBody.refundAmount = refundAmount;
    }

    const agent = this.createProxyAgent();
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    };

    if (agent) {
      (fetchOptions as any).agent = agent;
    }

    const response = await fetch(`${this.baseUrl}/refund`, fetchOptions);

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const responseText = await response.text();
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.errors && Array.isArray(errorData.errors)) {
              errorMessage = errorData.errors.map((err: any) => 
                `${err.errorCode}: ${err.errorMessage}`
              ).join(', ');
            } else {
              errorMessage = errorData.message || responseText;
            }
          } catch {
            errorMessage = responseText;
          }
        }
      } catch {
        // Используем statusText если не можем прочитать ответ
      }
      throw new Error(`Refund failed: ${response.status} ${errorMessage}`);
    }

    const result = await response.json();
    
    // Проверяем успешность ответа согласно документации MAIB
    if (!result.ok) {
      let errorMessage = 'Unknown error';
      if (result.errors && Array.isArray(result.errors)) {
        errorMessage = result.errors.map((err: any) => 
          `${err.errorCode}: ${err.errorMessage}`
        ).join(', ');
      }
      throw new Error(`Refund failed: ${errorMessage}`);
    }

    // Проверяем статус возврата
    return result.result?.status === 'OK';
  }

  /**
   * Проверка подписи callback уведомления
   */
  verifyCallback(data: any, signature: string): boolean {
    try {
      // Согласно документации MAIB, данные приходят в объекте 'result'
      const resultData = data.result || data;
      
      // Сортируем параметры по алфавиту, исключая поле signature
      const sortedKeys = Object.keys(resultData)
        .filter(key => key !== 'signature')
        .sort();
      
      // Создаем строку из значений параметров, разделенных ':'
      const values = sortedKeys.map(key => String(resultData[key]));
      
      // Добавляем signature key в конец
      values.push(this.config.signatureKey);
      
      // Объединяем все значения через ':'
      const signString = values.join(':');
      
      // Генерируем хэш SHA256 и конвертируем в base64
      const expectedSignature = crypto
        .createHash('sha256')
        .update(signString)
        .digest('base64');

      // Debug log removed for production

      return signature === expectedSignature;
    } catch (error) {
      // Error verifying callback signature
      return false;
    }
  }
}

// Создаем экземпляр клиента
const maibClient = new MaibClient({
  projectId: process.env.MAIB_PROJECT_ID!,
  projectSecret: process.env.MAIB_PROJECT_SECRET!,
  signatureKey: process.env.MAIB_SIGNATURE_KEY!,
  isProduction: process.env.NODE_ENV === 'production',
});

export { MaibClient, maibClient };
export type { PaymentRequest, PaymentResponse, PaymentInfo };