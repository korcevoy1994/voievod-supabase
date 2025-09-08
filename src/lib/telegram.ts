interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
}

interface OrderNotification {
  orderId: string;
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  totalAmount: number;
  seatsCount: number;
  eventTitle?: string;
  paymentMethod: string;
}

class TelegramBot {
  private botToken: string;
  private chatId: string;
  private baseUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  private isConfigured(): boolean {
    return !!(this.botToken && this.chatId);
  }

  async sendMessage(message: TelegramMessage): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Telegram bot not configured. Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Telegram API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        return false;
      }

      const result = await response.json();
      console.log('Telegram message sent successfully:', result.message_id);
      return true;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return false;
    }
  }

  async sendOrderNotification(orderData: OrderNotification): Promise<boolean> {
    const message = this.formatOrderMessage(orderData);
    
    return await this.sendMessage({
      chat_id: this.chatId,
      text: message,
      parse_mode: 'HTML'
    });
  }

  private formatOrderMessage(orderData: OrderNotification): string {
    const {
      orderId,
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      totalAmount,
      seatsCount,
      eventTitle,
      paymentMethod
    } = orderData;

    let message = `🎫 <b>Новый успешный заказ!</b>\n\n`;
    
    if (orderNumber) {
      message += `📋 <b>Номер заказа:</b> #${orderNumber}\n`;
    }
    message += `🆔 <b>ID заказа:</b> ${orderId}\n`;
    
    if (eventTitle) {
      message += `🎭 <b>Мероприятие:</b> ${eventTitle}\n`;
    }
    
    message += `👤 <b>Клиент:</b> ${customerName}\n`;
    message += `📧 <b>Email:</b> ${customerEmail}\n`;
    
    if (customerPhone) {
      message += `📱 <b>Телефон:</b> ${customerPhone}\n`;
    }
    
    message += `🎟️ <b>Количество мест:</b> ${seatsCount}\n`;
    message += `💰 <b>Сумма:</b> ${totalAmount} MDL\n`;
    message += `💳 <b>Способ оплаты:</b> ${paymentMethod}\n`;
    message += `⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Chisinau' })}`;

    return message;
  }
}

export const telegramBot = new TelegramBot();
export type { OrderNotification };