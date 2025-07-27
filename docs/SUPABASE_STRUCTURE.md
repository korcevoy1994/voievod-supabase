# Supabase Integration Structure

Этот документ описывает структуру интеграции с Supabase для системы бронирования мест.

## Обзор архитектуры

Новая структура заменяет статические файлы данных на динамическую загрузку из Supabase, обеспечивая:
- Гибкое ценообразование (по зонам и индивидуально по местам)
- Реальное время обновления статуса мест
- Централизованное управление данными
- Масштабируемость для множественных событий

## Структура базы данных

### Основные таблицы

1. **events** - События
   - `id`, `name`, `description`, `event_date`, `venue`, `status`

2. **zone_templates** - Шаблоны зон
   - `zone_id`, `rows`, `seats_per_row`, координаты и расстояния

3. **zone_pricing** - Ценообразование по зонам
   - `event_id`, `zone_id`, `base_price`, `row_multiplier`

4. **seats** - Места
   - `id`, `zone_id`, `row_name`, `seat_number`, координаты, `status`, `price`, `custom_price`

5. **bookings** - Бронирования
   - Связь пользователей с местами

## API Routes

### `/api/zones`
- **GET**: Получить все зоны
- Возвращает: `{ zones: ZoneData[] }`

### `/api/zones/[zoneId]/seats`
- **GET**: Получить места конкретной зоны
- Возвращает: `{ seats: SeatData[] }`
- Включает вычисленные цены и цвета

### `/api/events/[eventId]/pricing`
- **GET**: Получить ценообразование события
- Возвращает: `{ zonePrices: Record<string, number>, detailedPricing: any[] }`

### `/api/events/[eventId]`
- **GET**: Получить информацию о событии
- Возвращает: `{ event: EventData }`

## React Hooks

### `useZones()`
Загружает список всех зон
```typescript
const { zones, loading, error } = useZones()
```

### `useZoneSeats(zoneId)`
Загружает места конкретной зоны
```typescript
const { seats, loading, error } = useZoneSeats('201')
```

### `useEventPricing(eventId)`
Загружает ценообразование события
```typescript
const { zonePrices, detailedPricing, loading, error } = useEventPricing('voevoda')
```

### `useEvent(eventId)`
Загружает информацию о событии
```typescript
const { event, loading, error } = useEvent('voevoda')
```

## Компоненты

### `SeatMapSupabase`
Отображает карту мест для конкретной зоны, загружая данные из Supabase
```typescript
<SeatMapSupabase
  zoneId="201"
  selectedSeats={selectedSeats}
  onSeatClick={handleSeatClick}
  eventId="voevoda"
/>
```

### `ZoneSelector`
Компонент выбора зоны с загрузкой из Supabase
```typescript
<ZoneSelector
  selectedZone={selectedZone}
  onZoneSelect={handleZoneSelect}
  eventId="voevoda"
/>
```

## Утилиты

### `supabaseUtils.ts`
Вспомогательные функции для работы с данными Supabase:
- `getZones()` - получение зон
- `getZoneSeats()` - получение мест зоны
- `createSeatLookup()` - создание lookup объекта
- `getZoneColor()` - получение цвета зоны
- `preloadEventData()` - предзагрузка данных события

## Система ценообразования

### Гибкое ценообразование
1. **Базовая цена зоны** (`zone_pricing.base_price`)
2. **Множитель ряда** (`zone_pricing.row_multiplier`)
3. **Индивидуальная цена места** (`seats.custom_price`)

### Приоритет цен
1. Если у места есть `custom_price` - используется она
2. Иначе вычисляется: `base_price * row_multiplier`
3. Функция `get_seat_price()` в БД автоматически выбирает правильную цену

## Миграция с статических файлов

### Старая структура
```
src/data/zone-XXX-seats.ts - статические файлы мест
src/lib/utils.ts - seatLookup объект
```

### Новая структура
```
API routes - динамическая загрузка
React hooks - управление состоянием
Supabase - централизованные данные
```

## Пример использования

```typescript
// Страница события с Supabase
import { useZones, useEvent } from '@/lib/hooks/useSupabaseData'
import SeatMapSupabase from '@/components/SeatMapSupabase'
import ZoneSelector from '@/components/ZoneSelector'

export default function EventPage() {
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  
  const { event } = useEvent('voevoda')
  
  return (
    <div>
      <ZoneSelector
        selectedZone={selectedZone}
        onZoneSelect={setSelectedZone}
      />
      
      {selectedZone && (
        <SeatMapSupabase
          zoneId={selectedZone}
          selectedSeats={selectedSeats}
          onSeatClick={(seatId) => {
            setSelectedSeats(prev => 
              prev.includes(seatId) 
                ? prev.filter(id => id !== seatId)
                : [...prev, seatId]
            )
          }}
        />
      )}
    </div>
  )
}
```

## Преимущества новой структуры

1. **Динамические данные**: Обновления в реальном времени
2. **Гибкое ценообразование**: Индивидуальные цены мест
3. **Масштабируемость**: Поддержка множественных событий
4. **Централизованное управление**: Все данные в одном месте
5. **Производительность**: Загрузка только необходимых данных
6. **Типобезопасность**: TypeScript интерфейсы для всех данных

## Следующие шаги

1. Выполнить SQL скрипты в Supabase
2. Настроить переменные окружения
3. Протестировать API routes
4. Интегрировать компоненты в существующие страницы
5. Добавить обработку ошибок и loading состояний