
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const i = line.indexOf('=');
  if (i > 0) env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
});

const jwt = require(path.join(process.cwd(), 'node_modules/jsonwebtoken'));
const { createClient } = require(path.join(process.cwd(), 'node_modules/@supabase/supabase-js'));

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

const results = [];
function pass(name, detail) { results.push({ name, status: 'PASS', detail }); console.log('  PASS: ' + name + (detail ? ' - ' + detail : '')); }
function fail(name, detail, error) { results.push({ name, status: 'FAIL', detail, error: error?.message || String(error) }); console.log('  FAIL: ' + name + (detail ? ' - ' + detail : '') + (error ? ' | ' + error.message : '')); }

(async () => {
  // Test 1: User without membership cannot create booking
  console.log('\n=== Test 1: User without membership ===');
  try {
    // Create a new user without membership
    const email = 'nomem_' + Date.now() + '@example.com';
    const regRes = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'TestNoMem@2026!', full_name: 'No Mem', phone: '9' + Math.floor(100000000 + Math.random() * 899999999) }),
    });
    const regData = await regRes.json();
    if (regData.error) throw new Error('Registration failed: ' + regData.error.message);
    const noMemToken = regData.data.accessToken;

    // Get buddy and activity
    const { data: buddy } = await supabase.from('buddy_profiles').select('user_id').limit(1);
    const { data: activity } = await supabase.from('activities').select('id').limit(1);
    if (!buddy || buddy.length === 0 || !activity || activity.length === 0) throw new Error('No buddy/activity data');

    // Try to create booking
    const bookingRes = await fetch('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + noMemToken },
      body: JSON.stringify({
        buddy_id: buddy[0].user_id,
        activity_id: activity[0].id,
        booking_date: '2026-12-30',
        booking_time: '14:00:00',
        duration_hours: 2,
        location_name: 'Test',
        location_address: 'Pune',
      }),
    });
    const bookingData = await bookingRes.json();
    if (bookingRes.status !== 403) throw new Error('Expected 403, got ' + bookingRes.status + ': ' + JSON.stringify(bookingData));
    pass('Booking rejected without membership', 'status=403, message=' + bookingData.error?.message);
  } catch (err) { fail('User without membership', null, err); }

  // Test 2: User with active membership can create booking
  console.log('\n=== Test 2: User with active membership ===');
  try {
    // Use the test user who has active membership
    const token = jwt.sign(
      { userId: 'b7b02ed0-778b-4596-910b-d32718b3db89', email: 'testuser_step6_2026@example.com', role: 'user', type: 'access' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m', issuer: 'yorbuddy-api' }
    );

    const { data: buddy } = await supabase.from('buddy_profiles').select('user_id').limit(1);
    const { data: activity } = await supabase.from('activities').select('id').limit(1);
    if (!buddy || buddy.length === 0 || !activity || activity.length === 0) throw new Error('No buddy/activity data');

    const bookingRes = await fetch('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({
        buddy_id: buddy[0].user_id,
        activity_id: activity[0].id,
        booking_date: '2026-12-31',
        booking_time: '10:00:00',
        duration_hours: 2,
        location_name: 'Test Cafe',
        location_address: 'Pune',
      }),
    });
    const bookingData = await bookingRes.json();
    if (bookingRes.status !== 201) throw new Error('Expected 201, got ' + bookingRes.status + ': ' + JSON.stringify(bookingData));
    pass('Booking allowed with active membership', 'code=' + bookingData.data.booking_code);
  } catch (err) { fail('User with active membership', null, err); }

  // Test 3: Admin can create booking without membership
  console.log('\n=== Test 3: Admin bypass ===');
  try {
    // Create admin user
    const adminEmail = 'admin_' + Date.now() + '@example.com';
    const adminReg = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'TestAdmin@2026!', full_name: 'Admin', phone: '9' + Math.floor(100000000 + Math.random() * 899999999) }),
    });
    const adminData = await adminReg.json();
    if (adminData.error) throw new Error('Admin registration failed');

    // Manually set role to admin in database
    await supabase.from('users').update({ role: 'admin' }).eq('id', adminData.data.user.id);

    const adminToken = jwt.sign(
      { userId: adminData.data.user.id, email: adminEmail, role: 'admin', type: 'access' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m', issuer: 'yorbuddy-api' }
    );

    const { data: buddy } = await supabase.from('buddy_profiles').select('user_id').limit(1);
    const { data: activity } = await supabase.from('activities').select('id').limit(1);
    if (!buddy || buddy.length === 0 || !activity || activity.length === 0) throw new Error('No buddy/activity data');

    const bookingRes = await fetch('http://localhost:3001/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
      body: JSON.stringify({
        buddy_id: buddy[0].user_id,
        activity_id: activity[0].id,
        booking_date: '2027-01-15',
        booking_time: '16:00:00',
        duration_hours: 2,
        location_name: 'Admin Test',
        location_address: 'Pune',
      }),
    });
    const bookingData = await bookingRes.json();
    if (bookingRes.status !== 201) throw new Error('Expected 201, got ' + bookingRes.status + ': ' + JSON.stringify(bookingData));
    pass('Admin booking allowed without membership', 'code=' + bookingData.data.booking_code);
  } catch (err) { fail('Admin bypass', null, err); }

  // Test 4: Buddy without membership is filtered from search
  console.log('\n=== Test 4: Buddy membership filter ===');
  try {
    // Get all buddies from search API
    const searchRes = await fetch('http://localhost:3001/api/buddies?per_page=50');
    const searchData = await searchRes.json();
    if (searchRes.status !== 200) throw new Error('Search failed');

    // Check that all returned buddies have active membership
    let allHaveMembership = true;
    for (const buddy of searchData.data) {
      const { data: membership } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', buddy.user.id)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!membership || membership.length === 0) {
        allHaveMembership = false;
        console.log('  WARNING: Buddy ' + buddy.user.full_name + ' has no active membership');
      } else {
        const m = membership[0];
        const isActive = !m.membership_expiry_date || new Date(m.membership_expiry_date) > new Date();
        if (!isActive) {
          allHaveMembership = false;
          console.log('  WARNING: Buddy ' + buddy.user.full_name + ' has expired membership');
        }
      }
    }

    if (allHaveMembership) {
      pass('All search results have active membership', searchData.data.length + ' buddies checked');
    } else {
      fail('Buddy membership filter', 'Some buddies without active membership appeared in search');
    }
  } catch (err) { fail('Buddy membership filter', null, err); }

  // Summary
  console.log('\n=== MEMBERSHIP ENFORCEMENT TEST SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log('PASSED: ' + passed + '  FAILED: ' + failed);
  if (failed > 0) {
    console.log('\nFAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log('  [FAIL] ' + r.name + ': ' + r.error));
  }
  process.exit(failed > 0 ? 1 : 0);
})();
