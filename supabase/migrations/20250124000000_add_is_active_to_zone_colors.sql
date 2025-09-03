-- Добавление поля is_active в таблицу zone_colors для управления блокировкой зон

ALTER TABLE public.zone_colors 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Добавляем комментарий к полю
COMMENT ON COLUMN public.zone_colors.is_active IS 'Активна ли зона (false = заблокирована)';

-- Создаем индекс для быстрого поиска активных зон
CREATE INDEX IF NOT EXISTS idx_zone_colors_is_active ON public.zone_colors(is_active);

-- Устанавливаем зоны 201 и 213 как заблокированные (как они сейчас работают)
UPDATE public.zone_colors 
SET is_active = false 
WHERE zone IN ('201', '213');