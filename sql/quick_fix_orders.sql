-- Быстрое исправление заказов - выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущее состояние заказов
SELECT 
    'Статистика заказов' as info,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN qr_code IS NOT NULL AND qr_code != '' THEN 1 END) as orders_with_qr,
    COUNT(CASE WHEN event_id IS NOT NULL THEN 1 END) as orders_with_event,
    COUNT(CASE WHEN pdf_url IS NOT NULL AND pdf_url != '' THEN 1 END) as orders_with_pdf
FROM public.orders;

-- 2. Показываем заказы с проблемами
SELECT 
    short_order_number,
    CASE WHEN qr_code IS NULL OR qr_code = '' THEN 'НЕТ QR' ELSE 'ЕСТЬ QR' END as qr_status,
    CASE WHEN event_id IS NULL THEN 'НЕТ EVENT' ELSE 'ЕСТЬ EVENT' END as event_status,
    CASE WHEN pdf_url IS NULL OR pdf_url = '' THEN 'НЕТ PDF' ELSE 'ЕСТЬ PDF' END as pdf_status,
    status,
    created_at
FROM public.orders 
WHERE 
    qr_code IS NULL OR qr_code = '' OR
    event_id IS NULL OR
    pdf_url IS NULL OR pdf_url = ''
ORDER BY created_at DESC
LIMIT 10;

-- 3. Исправляем заказы без event_id
UPDATE public.orders 
SET 
    event_id = (SELECT id FROM public.events WHERE status = 'active' LIMIT 1),
    updated_at = NOW()
WHERE event_id IS NULL;

-- 4. Исправляем заказы без QR кода
UPDATE public.orders 
SET 
    qr_code = 'ORDER:' || id::TEXT || ':' || EXTRACT(EPOCH FROM NOW())::TEXT,
    updated_at = NOW()
WHERE qr_code IS NULL OR qr_code = '';

-- 5. Исправляем заказы без PDF URL
UPDATE public.orders 
SET 
    pdf_url = '/api/tickets/pdf?orderId=' || id::TEXT,
    updated_at = NOW()
WHERE pdf_url IS NULL OR pdf_url = '';

-- 6. Проверяем результат
SELECT 
    'После исправления' as info,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN qr_code IS NOT NULL AND qr_code != '' THEN 1 END) as orders_with_qr,
    COUNT(CASE WHEN event_id IS NOT NULL THEN 1 END) as orders_with_event,
    COUNT(CASE WHEN pdf_url IS NOT NULL AND pdf_url != '' THEN 1 END) as orders_with_pdf
FROM public.orders;

-- 7. Показываем последние 5 заказов для проверки
SELECT 
    short_order_number,
    LEFT(qr_code, 30) || '...' as qr_preview,
    CASE WHEN event_id IS NOT NULL THEN 'ДА' ELSE 'НЕТ' END as has_event,
    CASE WHEN pdf_url IS NOT NULL THEN 'ДА' ELSE 'НЕТ' END as has_pdf,
    status,
    created_at
FROM public.orders 
ORDER BY created_at DESC 
LIMIT 5;