import crypto from 'crypto';

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
  orderId: string;
  description: string;
  okUrl: string;
  failUrl: string;
  callbackUrl: string;
  language?: string;
}

interface PaymentResponse {
  payUrl: string;
  transactionId: string;
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
   * Генерация токена доступа
   */
  private async generateToken(): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const data = `${this.config.projectId}${timestamp}`;
    const signature = crypto
      .createHmac('sha256', this.config.signatureKey)
      .update(data)
      .digest('hex');

    const response = await fetch(`${this.baseUrl}/generate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: this.config.projectId,
        timestamp,
        signature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate token: ${response.statusText}`);
    }

    const result = await response.json();
    return result.token;
  }

  /**
   * Создание прямого платежа
   */
  async createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    const token = await this.generateToken();

    const requestBody = {
      amount: paymentData.amount,
      currency: paymentData.currency,
      orderId: paymentData.orderId,
      description: paymentData.description,
      okUrl: paymentData.okUrl,
      failUrl: paymentData.failUrl,
      callbackUrl: paymentData.callbackUrl,
      language: paymentData.language || 'ru',
    };

    const response = await fetch(`${this.baseUrl}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Payment creation failed: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    return {
      payUrl: result.payUrl,
      transactionId: result.transactionId,
    };
  }

  /**
   * Получение информации о платеже
   */
  async getPaymentInfo(transactionId: string): Promise<PaymentInfo> {
    const token = await this.generateToken();

    const response = await fetch(`${this.baseUrl}/pay-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        transactionId,
      }),
    });

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
  async refundPayment(transactionId: string, amount?: number): Promise<boolean> {
    const token = await this.generateToken();

    const requestBody: any = {
      transactionId,
    };

    if (amount) {
      requestBody.amount = amount;
    }

    const response = await fetch(`${this.baseUrl}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Refund failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success;
  }

  /**
   * Проверка подписи callback уведомления
   */
  verifyCallback(data: any, signature: string): boolean {
    const sortedKeys = Object.keys(data).sort();
    const dataString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
    
    const expectedSignature = crypto
      .createHmac('sha256', this.config.signatureKey)
      .update(dataString)
      .digest('hex');

    return signature === expectedSignature;
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