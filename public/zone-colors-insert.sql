-- Insert zone colors for sectors A, B, C
-- Event ID: 550e8400-e29b-41d4-a716-446655440000
-- Color: #E7CB15 (Golden Yellow)

INSERT INTO public.zone_colors (zone, color, name, created_at, updated_at) VALUES
('A', '#4AC4C1', 'A', NOW(), NOW()),
('B', '#FFA983', 'B', NOW(), NOW()),
('C', '#FF7887', 'C', NOW(), NOW())
ON CONFLICT (zone) DO UPDATE SET
  color = EXCLUDED.color,
  name = EXCLUDED.name,
  updated_at = NOW();

-- Note: The zone_colors table does not have an event_id column based on the schema.
-- If event-specific zone colors are needed, this would require a schema modification
-- or a different approach using the zone_pricing table which does have event_id.