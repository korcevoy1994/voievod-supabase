-- Создание таблицы для хранения цен зон
CREATE TABLE IF NOT EXISTS zone_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  zone VARCHAR(10) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  row_multipliers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание уникального индекса для предотвращения дублирования
CREATE UNIQUE INDEX IF NOT EXISTS idx_zone_prices_event_zone 
ON zone_prices(event_id, zone);

-- Создание индекса для быстрого поиска по событию
CREATE INDEX IF NOT EXISTS idx_zone_prices_event_id 
ON zone_prices(event_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_zone_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_zone_prices_updated_at ON zone_prices;
CREATE TRIGGER trigger_update_zone_prices_updated_at
  BEFORE UPDATE ON zone_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_zone_prices_updated_at();

-- Функция для вычисления цены места с учетом ряда
CREATE OR REPLACE FUNCTION calculate_seat_price(
  p_event_id UUID,
  p_zone VARCHAR(10),
  p_row VARCHAR(10) DEFAULT NULL
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_base_price DECIMAL(10,2);
  v_row_multipliers JSONB;
  v_multiplier DECIMAL(10,2) := 1.0;
BEGIN
  -- Получаем базовую цену и множители рядов для зоны
  SELECT base_price, row_multipliers
  INTO v_base_price, v_row_multipliers
  FROM zone_prices
  WHERE event_id = p_event_id AND zone = p_zone;
  
  -- Если цена не найдена, возвращаем 0
  IF v_base_price IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Если указан ряд и есть множители, применяем множитель
  IF p_row IS NOT NULL AND v_row_multipliers IS NOT NULL THEN
    v_multiplier := COALESCE((v_row_multipliers->>p_row)::DECIMAL(10,2), 1.0);
  END IF;
  
  RETURN v_base_price * v_multiplier;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения всех цен события
CREATE OR REPLACE FUNCTION get_event_pricing(p_event_id UUID)
RETURNS TABLE(
  zone VARCHAR(10),
  base_price DECIMAL(10,2),
  row_multipliers JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT zp.zone, zp.base_price, zp.row_multipliers
  FROM zone_prices zp
  WHERE zp.event_id = p_event_id
  ORDER BY zp.zone;
END;
$$ LANGUAGE plpgsql;

-- Функция для обновления или создания цены зоны
CREATE OR REPLACE FUNCTION upsert_zone_price(
  p_event_id UUID,
  p_zone VARCHAR(10),
  p_base_price DECIMAL(10,2),
  p_row_multipliers JSONB DEFAULT '{}'
)
RETURNS zone_prices AS $$
DECLARE
  result zone_prices;
BEGIN
  INSERT INTO zone_prices (event_id, zone, base_price, row_multipliers)
  VALUES (p_event_id, p_zone, p_base_price, p_row_multipliers)
  ON CONFLICT (event_id, zone)
  DO UPDATE SET
    base_price = EXCLUDED.base_price,
    row_multipliers = EXCLUDED.row_multipliers,
    updated_at = NOW()
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Вставка примерных данных для тестирования
INSERT INTO zone_prices (event_id, zone, base_price, row_multipliers)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', '201', 1500.00, '{"1": 1.2, "2": 1.1, "3": 1.0, "4": 0.9}'),
  ('550e8400-e29b-41d4-a716-446655440000', '202', 1200.00, '{"1": 1.1, "2": 1.0, "3": 0.95}'),
  ('550e8400-e29b-41d4-a716-446655440000', '203', 1000.00, '{"1": 1.0, "2": 0.95, "3": 0.9}'),
  ('550e8400-e29b-41d4-a716-446655440000', '204', 800.00, '{}'),
  ('550e8400-e29b-41d4-a716-446655440000', '205', 600.00, '{}'),
  ('550e8400-e29b-41d4-a716-446655440000', '206', 500.00, '{}'),
  ('550e8400-e29b-41d4-a716-446655440000', '207', 400.00, '{}'),
  ('550e8400-e29b-41d4-a716-446655440000', '208', 350.00, '{}'),
  ('550e8400-e29b-41d4-a716-446655440000', '209', 300.00, '{}'),
  ('550e8400-e29b-41d4-a716-446655440000', '210', 250.00, '{}'),
  ('550e8400-e29b-41d4-a716-446655440000', '211', 200.00, '{}'),
  ('550e8400-e29b-41d4-a716-446655440000', '212', 150.00, '{}'),
  ('550e8400-e29b-41d4-a716-446655440000', '213', 100.00, '{}')
ON CONFLICT (event_id, zone) DO NOTHING;

-- Создание RLS политик для безопасности
ALTER TABLE zone_prices ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (все могут читать)
CREATE POLICY "Allow read access to zone_prices" ON zone_prices
  FOR SELECT USING (true);

-- Политика для записи (только аутентифицированные пользователи)
CREATE POLICY "Allow authenticated users to manage zone_prices" ON zone_prices
  FOR ALL USING (auth.role() = 'authenticated');

-- Комментарии к таблице и столбцам
COMMENT ON TABLE zone_prices IS 'Хранит цены зон для событий с поддержкой множителей рядов';
COMMENT ON COLUMN zone_prices.event_id IS 'ID события';
COMMENT ON COLUMN zone_prices.zone IS 'Идентификатор зоны';
COMMENT ON COLUMN zone_prices.base_price IS 'Базовая цена зоны';
COMMENT ON COLUMN zone_prices.row_multipliers IS 'JSON объект с множителями для рядов {"1": 1.2, "2": 1.1}';