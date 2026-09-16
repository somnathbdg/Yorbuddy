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

async function api(method, reqPath, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch('http://localhost:3001' + reqPath, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

(async () => {
  // Generate JWT for test user (b7b02ed0-778b-4596-910b-d32718b3db89)
  const token = jwt.sign(
    { userId: 'b7b02ed0-778b-4596-910b-d32718b3db89', email: 'testuser_step6_2026@example.com', role: 'user', type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m', issuer: 'yorbuddy-api' }
  );

  // Test 1: MONTH_1 correct amount (19900 paise)
  console.log('\n=== Test 1: MONTH_1 amount ===');
  try {
    const res = await api('POST', '/api/memberships/create-order', { plan_id: 'MONTH_1' }, token);
    if (res.status !== 201) throw new Error('Expected 201, got ' + res.status);
    if (res.data.data.amount !== 19900) throw new Error('Expected 19900, got ' + res.data.data.amount);
    pass('MONTH_1 = 19900 paise', 'Rs 199.00');
  } catch (err) { fail('Test 1', null, err); }

  // Test 2: MONTH_6 correct amount (99900 paise)
  console.log('\n=== Test 2: MONTH_6 amount ===');
  try {
    const res = await api('POST', '/api/memberships/create-order', { plan_id: 'MONTH_6' }, token);
    if (res.status !== 201) throw new Error('Expected 201, got ' + res.status);
    if (res.data.data.amount !== 99900) throw new Error('Expected 99900, got ' + res.data.data.amount);
    pass('MONTH_6 = 99900 paise', 'Rs 999.00');
  } catch (err) { fail('Test 2', null, err); }

  // Test 3: YEAR_1 correct amount (169900 paise)
  console.log('\n=== Test 3: YEAR_1 amount ===');
  try {
    const res = await api('POST', '/api/memberships/create-order', { plan_id: 'YEAR_1' }, token);
    if (res.status !== 201) throw new Error('Expected 201, got ' + res.status);
    if (res.data.data.amount !== 169900) throw new Error('Expected 169900, got ' + res.data.data.amount);
    pass('YEAR_1 = 169900 paise', 'Rs 1,699.00');
  } catch (err) { fail('Test 3', null, err); }

  // Test 4: LIFETIME correct amount (499900 paise)
  console.log('\n=== Test 4: LIFETIME amount ===');
  try {
    const res = await api('POST', '/api/memberships/create-order', { plan_id: 'LIFETIME' }, token);
    if (res.status !== 201) throw new Error('Expected 201, got ' + res.status);
    if (res.data.data.amount !== 499900) throw new Error('Expected 499900, got ' + res.data.data.amount);
    pass('LIFETIME = 499900 paise', 'Rs 4,999.00');
  } catch (err) { fail('Test 4', null, err); }

  // Test 5: Invalid plan rejected
  console.log('\n=== Test 5: Invalid plan ===');
  try {
    const res = await api('POST', '/api/memberships/create-order', { plan_id: 'INVALID' }, token);
    if (res.status !== 400) throw new Error('Expected 400, got ' + res.status);
    pass('Invalid plan rejected', 'status=400');
  } catch (err) { fail('Test 5', null, err); }

  // Test 6: Client amount override rejected
  console.log('\n=== Test 6: Client amount override ===');
  try {
    const res = await api('POST', '/api/memberships/create-order', { plan_id: 'MONTH_1', amount: 1 }, token);
    if (res.status !== 400) throw new Error('Expected 400, got ' + res.status);
    pass('Client amount override rejected', 'status=400');
  } catch (err) { fail('Test 6', null, err); }

  // Test 7: Unauthorized request rejected
  console.log('\n=== Test 7: Unauthorized ===');
  try {
    const res = await api('POST', '/api/memberships/create-order', { plan_id: 'MONTH_1' });
    if (res.status !== 401) throw new Error('Expected 401, got ' + res.status);
    pass('Unauthorized rejected', 'status=401');
  } catch (err) { fail('Test 7', null, err); }

  // Test 8: Invalid Razorpay signature rejected
  console.log('\n=== Test 8: Invalid signature ===');
  try {
    const orderRes = await api('POST', '/api/memberships/create-order', { plan_id: 'MONTH_1' }, token);
    const orderId = orderRes.data.data.order_id;
    const verifyRes = await api('POST', '/api/memberships/verify', {
      razorpay_order_id: orderId,
      razorpay_payment_id: 'pay_fake',
      razorpay_signature: 'invalid_sig',
    }, token);
    if (verifyRes.status !== 400) throw new Error('Expected 400, got ' + verifyRes.status);
    pass('Invalid signature rejected', 'status=400');
  } catch (err) { fail('Test 8', null, err); }

  // Test 9: Successful verification activates MONTH_1
  console.log('\n=== Test 9: Successful verification MONTH_1 ===');
  try {
    const orderRes = await api('POST', '/api/memberships/create-order', { plan_id: 'MONTH_1' }, token);
    const orderId = orderRes.data.data.order_id;
    const paymentId = 'pay_test9_' + Date.now();
    const body = orderId + '|' + paymentId;
    const sig = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    const verifyRes = await api('POST', '/api/memberships/verify', {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
    }, token);
    if (verifyRes.status !== 200) throw new Error('Verify failed: ' + JSON.stringify(verifyRes.data));

    const { data: m } = await supabase.from('memberships').select('*').eq('razorpay_order_id', orderId).single();
    if (m.status !== 'success') throw new Error('Expected success, got ' + m.status);
    if (!m.membership_start_date) throw new Error('Start date not set');
    if (!m.membership_expiry_date) throw new Error('Expiry date not set for MONTH_1');
    pass('MONTH_1 activated', 'start=' + m.membership_start_date + ', expiry=' + m.membership_expiry_date);
  } catch (err) { fail('Test 9', null, err); }

  // Test 10: Successful verification activates MONTH_6
  console.log('\n=== Test 10: Successful verification MONTH_6 ===');
  try {
    const orderRes = await api('POST', '/api/memberships/create-order', { plan_id: 'MONTH_6' }, token);
    const orderId = orderRes.data.data.order_id;
    const paymentId = 'pay_test10_' + Date.now();
    const body = orderId + '|' + paymentId;
    const sig = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    const verifyRes = await api('POST', '/api/memberships/verify', {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
    }, token);
    if (verifyRes.status !== 200) throw new Error('Verify failed: ' + JSON.stringify(verifyRes.data));

    const { data: m } = await supabase.from('memberships').select('*').eq('razorpay_order_id', orderId).single();
    if (m.status !== 'success') throw new Error('Expected success, got ' + m.status);
    if (!m.membership_expiry_date) throw new Error('Expiry date not set for MONTH_6');
    pass('MONTH_6 activated', 'expiry=' + m.membership_expiry_date);
  } catch (err) { fail('Test 10', null, err); }

  // Test 11: Successful verification activates YEAR_1
  console.log('\n=== Test 11: Successful verification YEAR_1 ===');
  try {
    const orderRes = await api('POST', '/api/memberships/create-order', { plan_id: 'YEAR_1' }, token);
    const orderId = orderRes.data.data.order_id;
    const paymentId = 'pay_test11_' + Date.now();
    const body = orderId + '|' + paymentId;
    const sig = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    const verifyRes = await api('POST', '/api/memberships/verify', {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
    }, token);
    if (verifyRes.status !== 200) throw new Error('Verify failed: ' + JSON.stringify(verifyRes.data));

    const { data: m } = await supabase.from('memberships').select('*').eq('razorpay_order_id', orderId).single();
    if (m.status !== 'success') throw new Error('Expected success, got ' + m.status);
    if (!m.membership_expiry_date) throw new Error('Expiry date not set for YEAR_1');
    pass('YEAR_1 activated', 'expiry=' + m.membership_expiry_date);
  } catch (err) { fail('Test 11', null, err); }

  // Test 12: Successful verification activates LIFETIME
  console.log('\n=== Test 12: Successful verification LIFETIME ===');
  try {
    const orderRes = await api('POST', '/api/memberships/create-order', { plan_id: 'LIFETIME' }, token);
    const orderId = orderRes.data.data.order_id;
    const paymentId = 'pay_test12_' + Date.now();
    const body = orderId + '|' + paymentId;
    const sig = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    const verifyRes = await api('POST', '/api/memberships/verify', {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
    }, token);
    if (verifyRes.status !== 200) throw new Error('Verify failed: ' + JSON.stringify(verifyRes.data));

    const { data: m } = await supabase.from('memberships').select('*').eq('razorpay_order_id', orderId).single();
    if (m.status !== 'success') throw new Error('Expected success, got ' + m.status);
    if (m.membership_expiry_date !== null) throw new Error('Expected null expiry for LIFETIME, got ' + m.membership_expiry_date);
    pass('LIFETIME activated', 'expiry=null (never expires)');
  } catch (err) { fail('Test 12', null, err); }

  // Test 13: Lifetime expiry_date is NULL
  console.log('\n=== Test 13: Lifetime expiry is NULL ===');
  try {
    const { data: m } = await supabase.from('memberships').select('*').eq('plan_id', 'LIFETIME').eq('status', 'success').order('created_at', { ascending: false }).limit(1).single();
    if (!m) throw new Error('No LIFETIME membership found');
    if (m.membership_expiry_date !== null) throw new Error('Expected null, got ' + m.membership_expiry_date);
    pass('Lifetime expiry_date is NULL', 'correct');
  } catch (err) { fail('Test 13', null, err); }

  // Test 14: Duplicate verification is idempotent
  console.log('\n=== Test 14: Duplicate verification ===');
  try {
    const orderRes = await api('POST', '/api/memberships/create-order', { plan_id: 'MONTH_1' }, token);
    const orderId = orderRes.data.data.order_id;
    const paymentId = 'pay_test14_' + Date.now();
    const body = orderId + '|' + paymentId;
    const sig = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    const v1 = await api('POST', '/api/memberships/verify', {
      razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig,
    }, token);
    if (v1.status !== 200) throw new Error('First verify failed: ' + v1.status);

    const v2 = await api('POST', '/api/memberships/verify', {
      razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig,
    }, token);
    if (v2.status !== 200) throw new Error('Duplicate verify failed: ' + v2.status);
    pass('Duplicate verification idempotent', 'status=200');
  } catch (err) { fail('Test 14', null, err); }

  // Test 15: Existing booking flow unaffected
  console.log('\n=== Test 15: Existing booking flow ===');
  try {
    const { data: buddy } = await supabase.from('buddy_profiles').select('user_id').limit(1);
    const { data: activity } = await supabase.from('activities').select('id').limit(1);
    if (!buddy || buddy.length === 0 || !activity || activity.length === 0) throw new Error('No buddy/activity data');

    const bookingRes = await api('POST', '/api/bookings', {
      buddy_id: buddy[0].user_id,
      activity_id: activity[0].id,
      booking_date: '2026-12-30',
      booking_time: '14:00:00',
      duration_hours: 2,
      location_name: 'Test',
      location_address: 'Pune',
    }, token);
    if (bookingRes.status !== 201) throw new Error('Booking failed: ' + JSON.stringify(bookingRes.data));
    const bookingData = bookingRes.data.data;

    const paymentRes = await api('POST', '/api/payments/create-order', { booking_id: bookingData.id }, token);
    if (paymentRes.status !== 201) throw new Error('Payment failed: ' + JSON.stringify(paymentRes.data));
    pass('Booking + payment flow works', 'booking=' + bookingData.booking_code);
  } catch (err) { fail('Test 15', null, err); }

  // Summary
  console.log('\n=== MEMBERSHIP PAYMENT TEST SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log('PASSED: ' + passed + '  FAILED: ' + failed);
  if (failed > 0) {
    console.log('\nFAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log('  [FAIL] ' + r.name + ': ' + r.error));
  }
  process.exit(failed > 0 ? 1 : 0);
})();
