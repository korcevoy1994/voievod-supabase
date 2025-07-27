-- Полное обновление схемы Supabase для новой структуры зон и цен
-- Этот файл содержит все необходимые изменения для поддержки новой системы

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ТАБЛИЦ
-- ============================================================================

-- Обновляем таблицу seats - добавляем поддержку цветов из зон
ALTER TABLE seats 
ADD COLUMN IF NOT EXISTS zone_color VARCHAR(7),
ADD COLUMN IF NOT EXISTS last_color_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Создаем индекс для быстрого поиска по зоне
CREATE INDEX IF NOT EXISTS idx_seats_zone_color ON seats(zone, zone_color);

-- ============================================================================
-- НОВЫЕ ТАБЛИЦЫ
-- ============================================================================

-- Таблица для хранения цветов зон
CREATE TABLE IF NOT EXISTS zone_colors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone VARCHAR(10) UNIQUE NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#8525D9',
  name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индекса для быстрого поиска по зоне
CREATE INDEX IF NOT EXISTS idx_zone_colors_zone ON zone_colors(zone);

-- Таблица для хранения цен зон (заменяет старую zone_pricing)
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

-- Создаем индекс для сортировки зон
CREATE INDEX IF NOT EXISTS idx_zone_colors_sort_order ON zone_colors(sort_order, zone);

-- ============================================================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ============================================================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at в zone_colors
DROP TRIGGER IF EXISTS trigger_update_zone_colors_updated_at ON zone_colors;
CREATE TRIGGER trigger_update_zone_colors_updated_at
  BEFORE UPDATE ON zone_colors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггер для автоматического обновления updated_at в zone_prices
DROP TRIGGER IF EXISTS trigger_update_zone_prices_updated_at ON zone_prices;
CREATE TRIGGER trigger_update_zone_prices_updated_at
  BEFORE UPDATE ON zone_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- Функция для обновления цветов мест при изменении цвета зоны
CREATE OR REPLACE FUNCTION update_seats_zone_color()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем цвет всех мест в зоне
  UPDATE seats 
  SET 
    zone_color = NEW.color,
    last_color_update = NOW()
  WHERE zone = NEW.zone;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления цветов мест
DROP TRIGGER IF EXISTS trigger_update_seats_zone_color ON zone_colors;
CREATE TRIGGER trigger_update_seats_zone_color
  AFTER UPDATE OF color ON zone_colors
  FOR EACH ROW
  EXECUTE FUNCTION update_seats_zone_color();

-- Триггер для установки цвета при вставке новой зоны
DROP TRIGGER IF EXISTS trigger_insert_seats_zone_color ON zone_colors;
CREATE TRIGGER trigger_insert_seats_zone_color
  AFTER INSERT ON zone_colors
  FOR EACH ROW
  EXECUTE FUNCTION update_seats_zone_color();

-- Функция для автоматического обновления цен мест при изменении zone_prices
CREATE OR REPLACE FUNCTION update_seats_pricing()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем цены всех мест в зоне, которые не имеют custom_price = true
  UPDATE seats 
  SET 
    price = calculate_seat_price(NEW.event_id, NEW.zone, seats.row),
    updated_at = NOW()
  WHERE event_id = NEW.event_id 
    AND zone = NEW.zone 
    AND (custom_price = false OR custom_price IS NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления цен мест при изменении zone_prices
DROP TRIGGER IF EXISTS trigger_update_seats_pricing ON zone_prices;
CREATE TRIGGER trigger_update_seats_pricing
  AFTER UPDATE OF base_price, row_multipliers ON zone_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_seats_pricing();

-- Триггер для установки цен при вставке новой zone_price
DROP TRIGGER IF EXISTS trigger_insert_seats_pricing ON zone_prices;
CREATE TRIGGER trigger_insert_seats_pricing
  AFTER INSERT ON zone_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_seats_pricing();

-- Функция для получения цвета зоны
CREATE OR REPLACE FUNCTION get_zone_color(p_zone VARCHAR(10))
RETURNS VARCHAR(7) AS $$
DECLARE
  v_color VARCHAR(7);
BEGIN
  SELECT color INTO v_color
  FROM zone_colors
  WHERE zone = p_zone AND is_active = true;
  
  -- Если цвет не найден, возвращаем цвет по умолчанию
  IF v_color IS NULL THEN
    RETURN '#8525D9';
  END IF;
  
  RETURN v_color;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- МИГРАЦИЯ ДАННЫХ
-- ============================================================================

-- Переносим данные из старой таблицы zone_pricing в новую zone_prices (если существует)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'zone_pricing') THEN
    INSERT INTO zone_prices (event_id, zone, base_price, row_multipliers)
    SELECT event_id, zone, base_price, row_multipliers
    FROM zone_pricing
    ON CONFLICT (event_id, zone) DO NOTHING;
  END IF;
END $$;

-- Обновляем цвета мест на основе существующих цветов зон
UPDATE seats 
SET zone_color = zone_colors.color,
    last_color_update = NOW()
FROM zone_colors 
WHERE seats.zone = zone_colors.zone
AND seats.zone_color IS NULL;

-- ============================================================================
-- ТЕСТОВЫЕ ДАННЫЕ
-- ============================================================================

-- Вставляем цвета зон (если их еще нет)
INSERT INTO zone_colors (zone, color, name, is_active, sort_order) VALUES
('201', '#179240', 'Зеленый', true, 1),
('202', '#8526d9', 'Фиолетовый', true, 2),
('203', '#921792', 'Розовый', true, 3),
('204', '#921792', 'Розовый VIP', true, 4),
('205', '#e7cb14', 'Желтый', true, 5),
('206', '#ea3446', 'Красный', true, 6),
('207', '#ea3446', 'Красный Premium', true, 7),
('208', '#ea3446', 'Красный Deluxe', true, 8),
('209', '#e7cb14', 'Желтый Premium', true, 9),
('210', '#921792', 'Розовый Premium', true, 10),
('211', '#921792', 'Розовый Deluxe', true, 11),
('212', '#8526d9', 'Фиолетовый Premium', true, 12),
('213', '#179240', 'Зеленый Premium', true, 13)
ON CONFLICT (zone) DO UPDATE SET
  color = EXCLUDED.color,
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Вставляем примерные цены для тестового события
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

-- ============================================================================
-- RLS ПОЛИТИКИ
-- ============================================================================

-- Включаем RLS для таблицы zone_colors
ALTER TABLE zone_colors ENABLE ROW LEVEL SECURITY;

-- Политика для чтения zone_colors (все могут читать)
CREATE POLICY "Allow read access to zone_colors" ON zone_colors
  FOR SELECT USING (true);

-- Политика для записи zone_colors (только аутентифицированные пользователи)
CREATE POLICY "Allow authenticated users to manage zone_colors" ON zone_colors
  FOR ALL USING (auth.role() = 'authenticated');

-- Политика для сервисной роли zone_colors (полный доступ)
CREATE POLICY "Service role has full access to zone_colors" ON zone_colors
  FOR ALL USING (auth.role() = 'service_role');

-- Включаем RLS для таблицы zone_prices
ALTER TABLE zone_prices ENABLE ROW LEVEL SECURITY;

-- Политика для чтения zone_prices (все могут читать)
CREATE POLICY "Allow read access to zone_prices" ON zone_prices
  FOR SELECT USING (true);

-- Политика для записи zone_prices (только аутентифицированные пользователи)
CREATE POLICY "Allow authenticated users to manage zone_prices" ON zone_prices
  FOR ALL USING (auth.role() = 'authenticated');

-- Политика для сервисной роли zone_prices (полный доступ)
CREATE POLICY "Service role has full access to zone_prices" ON zone_prices
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- КОММЕНТАРИИ
-- ============================================================================

COMMENT ON TABLE zone_colors IS 'Хранит цвета и настройки зон для визуализации';
COMMENT ON COLUMN zone_colors.zone IS 'Идентификатор зоны';
COMMENT ON COLUMN zone_colors.color IS 'Цвет зоны в формате HEX (#RRGGBB)';
COMMENT ON COLUMN zone_colors.name IS 'Название зоны для отображения';
COMMENT ON COLUMN zone_colors.is_active IS 'Активна ли зона';
COMMENT ON COLUMN zone_colors.sort_order IS 'Порядок сортировки зон';

COMMENT ON TABLE zone_prices IS 'Хранит цены зон для событий с поддержкой множителей рядов';
COMMENT ON COLUMN zone_prices.event_id IS 'ID события';
COMMENT ON COLUMN zone_prices.zone IS 'Идентификатор зоны';
COMMENT ON COLUMN zone_prices.base_price IS 'Базовая цена зоны';
COMMENT ON COLUMN zone_prices.row_multipliers IS 'JSON объект с множителями для рядов {"1": 1.2, "2": 1.1}';

COMMENT ON COLUMN seats.zone_color IS 'Цвет зоны, автоматически обновляется при изменении цвета зоны';
COMMENT ON COLUMN seats.last_color_update IS 'Время последнего обновления цвета';

-- ============================================================================
-- ОЧИСТКА СТАРЫХ ДАННЫХ (опционально)
-- ============================================================================

-- Удаляем старую таблицу zone_pricing после миграции (раскомментируйте если нужно)
-- DROP TABLE IF EXISTS zone_pricing CASCADE;

-- Сообщение об успешном завершении
DO $$
BEGIN
  RAISE NOTICE 'Схема базы данных успешно обновлена!';
  RAISE NOTICE 'Новые возможности:';
  RAISE NOTICE '- Таблица zone_prices для управления ценами зон';
  RAISE NOTICE '- Автоматическое обновление цветов мест при изменении цвета зоны';
  RAISE NOTICE '- Функции для расчета цен с учетом множителей рядов';
  RAISE NOTICE '- RLS политики для безопасности';
END $$;