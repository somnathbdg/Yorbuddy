
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
  // Seed buddy_profiles if empty
  const { data: existingBuddies } = await supabase.from('buddy_profiles').select('id').limit(1);
  if (!existingBuddies || existingBuddies.length === 0) {
    // Get a user to use as buddy
    const { data: users } = await supabase.from('users').select('id, role').eq('role', 'user').limit(1);
    if (users && users.length > 0) {
      // Insert buddy profile
      await supabase.from('buddy_profiles').insert({
        user_id: users[0].id,
        hourly_rate: 650,
        headline: 'Test Buddy',
        bio: 'Test buddy for membership enforcement testing',
        rating: 4.5,
        review_count: 10,
        is_verified: true,
        is_online: true,
        response_time: '1 hour',
        badge_text: 'Verified',
        supported_activity_ids: ['de9ccefc-e4a5-48fe-b70c-c6f51bbfa49f'],
        safety_pledge_signed: true,
      });
      console.log('Seeded buddy_profiles');

      // Update user role to buddy
      await supabase.from('users').update({ role: 'buddy' }).eq('id', users[0].id);
      console.log('Updated user role to buddy');
    }
  }

  // Seed activities if empty
  const { data: existingActivities } = await supabase.from('activities').select('id').limit(1);
  if (!existingActivities || existingActivities.length === 0) {
    await supabase.from('activities').insert({
      id: 'de9ccefc-e4a5-48fe-b70c-c6f51bbfa49f',
      slug: 'coffee-chat',
      title: 'Coffee & Chat',
      icon: 'Coffee',
      category: 'Casual',
      description: 'Test activity',
      popular: true,
    });
    console.log('Seeded activities');
  }

  console.log('Seed complete');
})();
