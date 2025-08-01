-- Исправление конкретного заказа ORD-2025-1005
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущее состояние заказа ORD-2025-1005
SELECT 
    id,
    short_order_number,
    event_id,
    pdf_url,
    qr_code,
    status,
    total_price,
    created_at,
    updated_at
FROM public.orders 
WHERE short_order_number = 'ORD-2025-1005';

-- 2. Получаем активное событие для установки event_id
SELECT 
    id,
    title,
    status
FROM public.events 
WHERE status = 'active'
LIMIT 1;

-- 3. Исправляем заказ ORD-2025-1005
UPDATE public.orders 
SET 
    event_id = (SELECT id FROM public.events WHERE status = 'active' LIMIT 1),
    pdf_url = '/api/tickets/pdf?orderId=' || id::TEXT,
    updated_at = NOW()
WHERE short_order_number = 'ORD-2025-1005'
  AND (event_id IS NULL OR pdf_url IS NULL OR pdf_url = '');

-- 4. Проверяем результат исправления
SELECT 
    'После исправления' as info,
    id,
    short_order_number,
    CASE WHEN event_id IS NOT NULL THEN 'ДА' ELSE 'НЕТ' END as has_event_id,
    CASE WHEN pdf_url IS NOT NULL AND pdf_url != '' THEN 'ДА' ELSE 'НЕТ' END as has_pdf_url,
    CASE WHEN qr_code IS NOT NULL AND qr_code != '' THEN 'ДА' ELSE 'НЕТ' END as has_qr_code,
    status,
    total_price,
    updated_at
FROM public.orders 
WHERE short_order_number = 'ORD-2025-1005';

-- 5. Если QR код тоже отсутствует, добавляем его
UPDATE public.orders 
SET 
    qr_code = 'ORDER:' || id::TEXT || ':' || EXTRACT(EPOCH FROM NOW())::TEXT,
    updated_at = NOW()
WHERE short_order_number = 'ORD-2025-1005'
  AND (qr_code IS NULL OR qr_code = '');

-- 6. Финальная проверка заказа
SELECT 
    'Финальное состояние заказа' as info,
    short_order_number,
    event_id,
    LEFT(pdf_url, 50) as pdf_url_preview,
    LEFT(qr_code, 30) as qr_code_preview,
    status,
    total_price,
    created_at,
    updated_at
FROM public.orders 
WHERE short_order_number = 'ORD-2025-1005';