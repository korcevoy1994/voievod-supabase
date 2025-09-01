-- SQL скрипт для создания таблицы vip_zones с информацией о количестве мест
-- Выполните этот скрипт в вашей базе данных Supabase

-- Создаем таблицу для VIP зон с информацией о количестве мест
CREATE TABLE IF NOT EXISTS vip_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  zone VARCHAR(10) NOT NULL,
  name VARCHAR(50) NOT NULL,
  seat_count INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  color VARCHAR(7) DEFAULT '#1B1792',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, zone)
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_vip_zones_event_id ON vip_zones(event_id);
CREATE INDEX IF NOT EXISTS idx_vip_zones_zone ON vip_zones(zone);
CREATE INDEX IF NOT EXISTS idx_vip_zones_active ON vip_zones(is_active);

-- Добавляем триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_vip_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_vip_zones_updated_at
  BEFORE UPDATE ON vip_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_vip_zones_updated_at();

-- Заполняем таблицу данными о VIP зонах
INSERT INTO vip_zones (event_id, zone, name, seat_count, price, color) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'vip1', 'Zona VIP 1', 20, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip2', 'Zona VIP 2', 25, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip3', 'Zona VIP 3', 30, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip4', 'Zona VIP 4', 15, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip5', 'Zona VIP 5', 18, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip6', 'Zona VIP 6', 12, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip7', 'Zona VIP 7', 35, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip8', 'Zona VIP 8', 35, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip9', 'Zona VIP 9', 12, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip10', 'Zona VIP 10', 18, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip11', 'Zona VIP 11', 15, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip12', 'Zona VIP 12', 30, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip13', 'Zona VIP 13', 25, 12000, '#1B1792'),
('550e8400-e29b-41d4-a716-446655440000', 'vip14', 'Zona VIP 14', 20, 12000, '#1B1792')
ON CONFLICT (event_id, zone) DO UPDATE SET
  name = EXCLUDED.name,
  seat_count = EXCLUDED.seat_count,
  price = EXCLUDED.price,
  color = EXCLUDED.color,
  updated_at = NOW();

-- Проверяем результат
SELECT 
  zone,
  name,
  seat_count,
  price,
  color,
  is_active
FROM vip_zones 
WHERE event_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY zone;

-- Итоговая статистика
SELECT 
  'VIP Zones Summary' as summary,
  COUNT(*) as total_zones,
  SUM(seat_count) as total_seats,
  AVG(price) as average_price
FROM vip_zones 
WHERE event_id = '550e8400-e29b-41d4-a716-446655440000' AND is_active = TRUE;