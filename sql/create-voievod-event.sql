-- SQL запрос для создания события Voievod
-- Выполните этот скрипт в Supabase SQL Editor

INSERT INTO events (
  title,
  description,
  venue,
  event_date,
  doors_open,
  status,
  total_seats,
  available_seats,
  image_url
) VALUES (
  'Voievod',
  'Концерт группы Voievod - легендарной канадской метал группы',
  'Sala Palatului',
  '2024-12-15 20:00:00+02:00',  -- Дата и время концерта
  '2024-12-15 19:00:00+02:00',  -- Время открытия дверей
  'active',
  0,  -- Будет обновлено автоматически при добавлении мест
  0,  -- Будет обновлено автоматически при добавлении мест
  '/ticket.jpg'  -- Изображение события
);

-- Проверяем, что событие создано
SELECT 
  id,
  title,
  venue,
  event_date,
  doors_open,
  status,
  created_at
FROM events 
WHERE title = 'Voievod'
ORDER BY created_at DESC
LIMIT 1;