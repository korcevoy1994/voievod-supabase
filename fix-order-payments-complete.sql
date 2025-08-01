-- Полное исправление таблицы order_payments
-- Добавляем все недостающие колонки

-- Сначала проверим, существует ли таблица
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_payments' AND table_schema = 'public') THEN
        RAISE NOTICE 'Таблица order_payments не существует, создаем...';
        
        CREATE TABLE order_payments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            order_id UUID NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
            payment_provider VARCHAR(50) NOT NULL DEFAULT 'maib',
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Включаем RLS
        ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;
        
        -- Создаем политику для сервисной роли
        CREATE POLICY "Service role has full access to order_payments" ON order_payments
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Добавляем недостающие колонки если их нет
ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS event_id UUID;

ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(255);

ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS provider_data JSONB;

ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'MDL';

ALTER TABLE order_payments 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Создаем индексы для лучшей производительности
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_event_id ON order_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_provider_payment_id ON order_payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_status ON order_payments(status);
CREATE INDEX IF NOT EXISTS idx_order_payments_created_at ON order_payments(created_at);

-- Создаем триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_order_payments_updated_at ON order_payments;
CREATE TRIGGER update_order_payments_updated_at 
    BEFORE UPDATE ON order_payments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Добавляем комментарии
COMMENT ON TABLE order_payments IS 'Платежи для заказов билетов';
COMMENT ON COLUMN order_payments.order_id IS 'ID заказа';
COMMENT ON COLUMN order_payments.event_id IS 'ID события';
COMMENT ON COLUMN order_payments.amount IS 'Сумма платежа';
COMMENT ON COLUMN order_payments.payment_method IS 'Метод оплаты (card, cash, etc.)';
COMMENT ON COLUMN order_payments.payment_provider IS 'Провайдер платежей (maib, stripe, etc.)';
COMMENT ON COLUMN order_payments.provider_payment_id IS 'ID платежа в системе провайдера';
COMMENT ON COLUMN order_payments.provider_data IS 'Дополнительные данные от провайдера (JSON)';
COMMENT ON COLUMN order_payments.status IS 'Статус платежа';
COMMENT ON COLUMN order_payments.completed_at IS 'Время завершения платежа';

-- Обновляем существующие записи, если они есть
UPDATE order_payments 
SET event_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE event_id IS NULL;

-- Сообщение об успешном завершении
DO $$
BEGIN
    RAISE NOTICE 'Таблица order_payments успешно обновлена!';
    RAISE NOTICE 'Все необходимые колонки добавлены.';
END $$;