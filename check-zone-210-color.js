const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkZone210Color() {
  try {
    console.log('Checking zone 210 color in database...');
    
    const { data: zoneColor, error } = await supabase
      .from('zone_colors')
      .select('*')
      .eq('zone', 210)
      .single();
    
    if (error) {
      console.error('Error fetching zone color:', error);
      return;
    }
    
    if (zoneColor) {
      console.log('Zone 210 color in database:', zoneColor.color);
    } else {
      console.log('No color found for zone 210 in database');
    }
    
    // Also check all zone colors for reference
    console.log('\nAll zone colors in database:');
    const { data: allColors, error: allError } = await supabase
      .from('zone_colors')
      .select('*')
      .order('zone');
    
    if (allError) {
      console.error('Error fetching all zone colors:', allError);
    } else {
      allColors.forEach(zc => {
        console.log(`Zone ${zc.zone}: ${zc.color}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkZone210Color();