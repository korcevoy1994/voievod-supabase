-- Исправление проблемы с полем custom_price
-- Проблема: поле custom_price содержит строки 'false' вместо булевых значений false
-- PostgreSQL интерпретирует любую непустую строку как true

-- Сначала посмотрим на проблемные записи
SELECT 
    id, 
    zone, 
    row, 
    number, 
    price, 
    custom_price,
    CASE 
        WHEN custom_price::text = 'false' THEN 'Строка false (проблема)'
        WHEN custom_price = false THEN 'Булево false (правильно)'
        WHEN custom_price = true THEN 'Булево true (правильно)'
        ELSE 'Другое значение'
    END as custom_price_status
FROM seats 
WHERE custom_price::text = 'false'
LIMIT 10;

-- Исправляем все записи где custom_price = 'false' (строка) на false (булево)
UPDATE seats 
SET custom_price = false
WHERE custom_price::text = 'false';

-- Проверяем результат
SELECT 
    COUNT(*) as total_seats,
    COUNT(CASE WHEN custom_price = true THEN 1 END) as custom_price_true,
    COUNT(CASE WHEN custom_price = false THEN 1 END) as custom_price_false,
    COUNT(CASE WHEN custom_price IS NULL THEN 1 END) as custom_price_null
FROM seats;

-- Дополнительная проверка: убеждаемся что нет строковых значений
SELECT 
    custom_price,
    pg_typeof(custom_price) as data_type,
    COUNT(*)
FROM seats 
GROUP BY custom_price, pg_typeof(custom_price)
ORDER BY COUNT(*) DESC;

SELECT 'Исправление завершено. Все места с custom_price = "false" (строка) изменены на custom_price = false (булево)' as result;