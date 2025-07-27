-- Исправление check constraint для статуса мест
-- Добавляем 'unavailable' в список допустимых значений

-- Удаляем старый constraint
ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_status_check;

-- Добавляем новый constraint с поддержкой 'unavailable'
ALTER TABLE seats ADD CONSTRAINT seats_status_check 
  CHECK (status IN ('available', 'reserved', 'sold', 'blocked', 'unavailable'));

-- Комментарий для документации
COMMENT ON COLUMN seats.status IS 'Статус места: available (доступно), reserved (забронировано), sold (продано), blocked (заблокировано), unavailable (недоступно)';

-- Сообщение об успешном обновлении
DO $$
BEGIN
  RAISE NOTICE 'Check constraint для статуса мест успешно обновлен!';
  RAISE NOTICE 'Теперь поддерживаются статусы: available, reserved, sold, blocked, unavailable';
END $$;