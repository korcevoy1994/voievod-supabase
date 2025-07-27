-- Исправление: Автоматическое обновление цен мест при изменении zone_prices
-- Этот файл решает проблему, когда изменение цен в zone_prices не отражается в таблице seats

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

-- Функция для автоматической установки custom_price при ручном изменении цены места
CREATE OR REPLACE FUNCTION set_custom_price_on_manual_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Если цена изменилась и это не автоматическое обновление
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    -- Проверяем, не является ли новая цена расчетной из zone_prices
    DECLARE
      calculated_price DECIMAL(10,2);
    BEGIN
      calculated_price := calculate_seat_price(NEW.event_id, NEW.zone, NEW.row);
      
      -- Если новая цена отличается от расчетной, устанавливаем custom_price = true
      IF calculated_price IS NULL OR ABS(NEW.price - calculated_price) > 0.01 THEN
        NEW.custom_price := true;
      ELSE
        NEW.custom_price := false;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматической установки custom_price при изменении цены места
DROP TRIGGER IF EXISTS trigger_set_custom_price ON seats;
CREATE TRIGGER trigger_set_custom_price
  BEFORE UPDATE OF price ON seats
  FOR EACH ROW
  EXECUTE FUNCTION set_custom_price_on_manual_update();

-- Сообщение об успешном применении
DO $$
BEGIN
  RAISE NOTICE 'Триггеры для управления ценами мест успешно созданы!';
  RAISE NOTICE '1. При изменении цен в zone_prices автоматически обновятся цены в seats (только для мест без custom_price)';
  RAISE NOTICE '2. При ручном изменении цены места автоматически устанавливается custom_price = true';
  RAISE NOTICE '3. Места с custom_price = true не будут перезаписываться при изменении zone_prices';
END;
$$;