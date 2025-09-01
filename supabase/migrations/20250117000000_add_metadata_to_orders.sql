-- Добавляем колонку metadata в таблицу orders если её нет
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata jsonb;