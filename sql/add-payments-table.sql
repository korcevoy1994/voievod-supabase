-- Добавление таблицы платежей для системы заказов
-- Эта таблица будет работать с orders вместо bookings

CREATE TABLE IF NOT EXISTS order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_provider VARCHAR(50) DEFAULT 'maib',
  provider_payment_id VARCHAR(255),
  provider_data JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_status ON order_payments(status);
CREATE INDEX IF NOT EXISTS idx_order_payments_provider_payment_id ON order_payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_created_at ON order_payments(created_at);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_payments_updated_at 
  BEFORE UPDATE ON order_payments
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

-- Политика для чтения платежей (пользователи могут видеть только свои платежи)
CREATE POLICY "Users can view own order payments" ON order_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_payments.order_id 
      AND orders.user_id = current_setting('app.current_user_id', true)
    )
  );

-- Политика для создания платежей (пользователи могут создавать платежи только для своих заказов)
CREATE POLICY "Users can create order payments" ON order_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_payments.order_id 
      AND orders.user_id = current_setting('app.current_user_id', true)
    )
  );

-- Политика для обновления платежей (пользователи могут обновлять только свои платежи)
CREATE POLICY "Users can update own order payments" ON order_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_payments.order_id 
      AND orders.user_id = current_setting('app.current_user_id', true)
    )
  );

-- Политика для сервисной роли (полный доступ)
CREATE POLICY "Service role has full access to order_payments" ON order_payments
  FOR ALL USING (auth.role() = 'service_role');

-- Комментарии
COMMENT ON TABLE order_payments IS 'Платежи для заказов билетов';
COMMENT ON COLUMN order_payments.order_id IS 'ID заказа';
COMMENT ON COLUMN order_payments.amount IS 'Сумма платежа';
COMMENT ON COLUMN order_payments.payment_method IS 'Метод оплаты (card, cash, etc.)';
COMMENT ON COLUMN order_payments.payment_provider IS 'Провайдер платежей (maib, stripe, etc.)';
COMMENT ON COLUMN order_payments.provider_payment_id IS 'ID платежа в системе провайдера';
COMMENT ON COLUMN order_payments.provider_data IS 'Дополнительные данные от провайдера';
COMMENT ON COLUMN order_payments.status IS 'Статус платежа';
COMMENT ON COLUMN order_payments.completed_at IS 'Время завершения платежа';

-- Сообщение об успешном создании
DO $$
BEGIN
  RAISE NOTICE 'Таблица order_payments успешно создана!';
  RAISE NOTICE 'Теперь система заказов может сохранять информацию о платежах.';
END $$;