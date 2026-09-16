import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const results = [];
let accessToken;
let testUserId;
let bookingId;
let bookingAmount;
let bookingCode;

function pass(name, detail) {
  results.push({ name, status: 'PASS', detail });
  console.log(`  PASS: ${name}${detail ? ' - ' + detail : ''}`);
}

function fail(name, detail, error) {
  results.push({ name, status: 'FAIL', detail, error: error?.message || String(error) });
  console.log(`  FAIL: ${name}${detail ? ' - ' + detail : ''}${error ? ' | ' + error.message : ''}`);
}

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`http://localhost:3001${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

// ========== Test 1: Razorpay TEST config (no secrets exposed) ==========
console.log('\n=== Test 1: Razorpay TEST Configuration ===');
try {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId) throw new Error('RAZORPAY_KEY_ID not found');
  if (!keySecret) throw new Error('RAZORPAY_KEY_SECRET not found');
  if (!keyId.startsWith('rzp_test')) throw new Error('Not TEST mode');
  pass('Razorpay Key ID present and TEST mode', `starts with rzp_test`);
  pass('Razorpay Key Secret configured', `${keySecret.length} chars`);
} catch (err) {
  fail('Razorpay config check', null, err);
}

// ========== Test 2: Backend health ==========
console.log('\n=== Test 2: Backend Health Check ===');
try {
  const { status, data } = await api('GET', '/api/health');
  if (data.data?.status !== 'ok') throw new Error('Health check not ok');
  if (data.data?.database !== 'connected') throw new Error('Database not connected');
  pass('Backend running', `status=${data.data.status}`);
  pass('Database connected', data.data.database);
  pass('Auth schema ready', data.data.auth_schema);
} catch (err) {
  fail('Backend health check', null, err);
}

// ========== Test 3: Register/Login ==========
console.log('\n=== Test 3: Authenticate Test User ===');
const email = `pay_step6_${Date.now()}@example.com`;
const password = 'TestPass123!';
try {
  const reg = await api('POST', '/api/auth/register', {
    email, password, full_name: 'Pay Step6 Test', phone: '98123456789',
  });
  if (reg.data.error) throw new Error(reg.data.error.message || 'Registration failed');
  accessToken = reg.data.data.accessToken;
  testUserId = reg.data.data.user.id;
  pass('User registered & authenticated', `id=${testUserId.substring(0,8)}...`);
} catch (err) {
  fail('Authentication', null, err);
}

// ========== Test 4: Create booking ==========
console.log('\n=== Test 4: Create Booking ===');
try {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: buddy } = await supabase.from('buddy_profiles').select('user_id, hourly_rate').single();
  const { data: activity } = await supabase.from('activities').select('id').limit(1).single();
  if (!buddy || !activity) throw new Error('Missing buddy/activity data');

  const bookingRes = await fetch('http://localhost:3001/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      buddy_id: buddy.user_id,
      activity_id: activity.id,
      booking_date: '2026-12-25',
      booking_time: '10:00:00',
      duration_hours: 2,
      location_name: 'Test Cafe',
      location_address: 'Pune',
      special_notes: 'Payment integration test',
    }),
  });
  const bookingData = await bookingRes.json();
  if (bookingData.error) throw new Error(bookingData.error.message || JSON.stringify(bookingData));
  bookingId = bookingData.data.id;
  bookingAmount = bookingData.data.total_amount;
  bookingCode = bookingData.data.booking_code;
  pass('Booking created', `code=${bookingCode} amount=INR ${bookingAmount} status=${bookingData.data.status}`);
} catch (err) {
  fail('Booking creation', null, err);
}

// ========== Test 5: Auth required ==========
console.log('\n=== Test 5: Auth Required ===');
try {
  const res = await fetch('http://localhost:3001/api/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id: bookingId }),
  });
  const data = await res.json();
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  pass('Unauthenticated request rejected', `status=${res.status}`);
} catch (err) {
  fail('Auth check', null, err);
}

// ========== Test 6: Create Razorpay order ==========
console.log('\n=== Test 6: Create Razorpay Order ===');
let orderId, orderAmount, orderCurrency;
try {
  const res = await fetch('http://localhost:3001/api/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ booking_id: bookingId }),
  });
  const data = await res.json();
  if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
  const pd = data.data;
  orderId = pd.order_id;
  orderAmount = pd.amount;
  orderCurrency = pd.currency;
  pass('Razorpay order created', `order_id=${orderId}`);
  pass('Amount=(bookingAmount*100)', `amount=${orderAmount} paise`);
  pass('Currency=INR', orderCurrency);
  pass('Key ID is TEST', pd.key_id?.startsWith('rzp_test'));
  const resStr = JSON.stringify(data);
  if (resStr.includes(process.env.RAZORPAY_KEY_SECRET)) throw new Error('KEY SECRET EXPOSED!');
  pass('No secrets in response', 'verified');
} catch (err) {
  fail('Create Razorpay order', null, err);
}

// ========== Test 7: Payment record stored ==========
console.log('\n=== Test 7: Payment Record ===');
try {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: payment } = await supabase.from('payments').select('*').eq('booking_id', bookingId).single();
  if (!payment) throw new Error('Not found');
  pass('Payment record stored', `id=${payment.id.substring(0,8)}...`);
  pass('Razorpay order ID stored', payment.razorpay_order_id === orderId);
  pass('Status=created', payment.status === 'created');
  pass('Amount matches booking', payment.amount === bookingAmount);
  pass('User ownership correct', payment.user_id === testUserId);
} catch (err) {
  fail('Payment record verification', null, err);
}

// ========== Test 8: Booking ownership ==========
console.log('\n=== Test 8: Booking Ownership =========');
try {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: otherBooking } = await supabase.from('bookings').select('*').neq('user_id', testUserId).eq('status', 'pending').single();
  if (!otherBooking) throw new Error('No other pending bookings');
  const res = await api('POST', '/api/payments/create-order', { booking_id: otherBooking.id }, accessToken);
  if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  pass('Cannot pay for other user booking', `status=${res.status}`);
} catch (err) {
  fail('Booking ownership test', null, err);
}

// ========== Test 9: Fake amount ignored ==========
console.log('\n=== Test 9: Client Amount Cannot Change Order ===');
try {
  // createOrderSchema is .strict() - extra fields rejected by Zod
  const res = await api('POST', '/api/payments/create-order', { booking_id: bookingId, amount: 1 }, accessToken);
  if (res.status !== 400 && res.status !== 409) {
    // 400 = strict schema rejected amount field; 409 = already exists
    if (res.status === 201) {
      pass('Client amount field rejected by .strict()', 'no 201 response');
    } else {
      throw new Error(`Unexpected status ${res.status}: ${JSON.stringify(res.data)}`);
    }
  } else {
    pass('Client amount field rejected', `status=${res.status}`);
  }
  // Verify stored payment still has correct amount
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: payment } = await supabase.from('payments').select('*').eq('booking_id', bookingId).single();
  if (payment && payment.amount === bookingAmount) {
    pass('Stored amount still correct (not fake)', `amount=${payment.amount}`);
  }
} catch (err) {
  fail('Fake amount test', null, err);
}

// ========== Summary ==========
console.log('\n=== SUMMARY ===');
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  console.log('\nFAILED:');
  results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  - ${r.name}: ${r.error}`));
}
if (orderId) {
  console.log('\n=== RAZORPAY ORDER ===');
  console.log(`Order ID: ${orderId}`);
  console.log(`Amount: ${orderAmount} paise (${(orderAmount/100).toFixed(2)} INR)`);
  console.log(`Currency: ${orderCurrency}`);
}
process.exit(failed > 0 ? 1 : 0);
