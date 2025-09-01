-- Fix zone colors to match static data
-- Current database colors don't match the static zone-XXX-seats.ts files

-- Update zone colors to match static data from zone-XXX-seats.ts files
UPDATE zone_colors SET color = '#4ED784' WHERE zone = '201';  -- was #179240
UPDATE zone_colors SET color = '#8525D9' WHERE zone = '202';  -- was #8526d9 (case difference)
UPDATE zone_colors SET color = '#921792' WHERE zone = '203';  -- correct
UPDATE zone_colors SET color = '#921792' WHERE zone = '204';  -- correct
UPDATE zone_colors SET color = '#E7CB15' WHERE zone = '205';  -- was #e7cb14 (case difference)
UPDATE zone_colors SET color = '#EA3446' WHERE zone = '206';  -- was #ea3446 (case difference)
UPDATE zone_colors SET color = '#EA3446' WHERE zone = '207';  -- was #ea3446 (case difference)
UPDATE zone_colors SET color = '#EA3446' WHERE zone = '208';  -- was #ea3446 (case difference)
UPDATE zone_colors SET color = '#E7CB15' WHERE zone = '209';  -- was #e7cb14 (case difference)
UPDATE zone_colors SET color = '#921792' WHERE zone = '210';  -- correct
UPDATE zone_colors SET color = '#921792' WHERE zone = '211';  -- correct
UPDATE zone_colors SET color = '#8525D9' WHERE zone = '212';  -- was #8526d9 (case difference)
UPDATE zone_colors SET color = '#179240' WHERE zone = '213';  -- correct

-- Verify the changes
SELECT zone, color, name FROM zone_colors ORDER BY zone::integer;