
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const i = line.indexOf('=');
  if (i > 0) env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: buddies } = await supabase.from('buddy_profiles').select('*').limit(5);
  console.log('buddy_profiles count:', buddies?.length || 0);
  if (buddies && buddies.length > 0) {
    console.log('First buddy:', buddies[0].user_id, buddies[0].headline);
  }

  const { data: activities } = await supabase.from('activities').select('*').limit(5);
  console.log('activities count:', activities?.length || 0);
  if (activities && activities.length > 0) {
    console.log('First activity:', activities[0].id, activities[0].title);
  }
})();
