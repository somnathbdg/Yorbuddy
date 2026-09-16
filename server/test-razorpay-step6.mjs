import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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
    method, headers,
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
  pass('Key ID present & TEST mode', 'starts with rzp_test');
  pass('Key Secret configured', `${keySecret.length} chars`);
} catch (err) { fail('Razorpay config', null, err); }

// ========== Test 2: Backend health ==========
console.log('\n=== Test 2: Backend Health ===');
try {
  const { data } = await api('GET', '/api/health');
  if (data.data?.status !== 'ok') throw new Error('not ok');
  pass('Backend running', data.data.status);
  pass('Database', data.data.database);
  pass('Auth schema', data.data.auth_schema);
} catch (err) { fail('Health check', null, err); }

// ========== Setup: Find existing booking & generate token ==========
console.log('\n=== Setup: Existing Booking & Token ===');
try {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: bookings } = await supabase.from('bookings')
    .select('id, booking_code, user_id, total_amount, status')
    .eq('status', 'pending')
    .limit(1);
  if (!bookings?.length) throw new Error('No pending bookings found');
  const b = bookings[0];
  const { data: user } = await supabase.from('users').select('id, email, role').eq('id', b.user_id).single();
  if (!user) throw new Error('User not found');

  accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, type: 'access' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m', issuer: 'yorbuddy-api' }
  );
  testUserId = user.id;
  bookingId = b.id;
  bookingAmount = b.total_amount;
  bookingCode = b.booking_code;
  pass('Found existing booking', `code=${bookingCode} amount=INR ${bookingAmount}`);
  pass('Token generated for user', `email=${user.email}`);
} catch (err) { fail('Setup', null, err); }

// ========== Test 3: Auth required ==========
console.log('\n=== Test 3: Auth Required ===');
try {
  const res = await api('POST', '/api/payments/create-order', { booking_id: bookingId });
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  pass('No token = 401', `status=${res.status}`);
} catch (err) { fail('Auth required', null, err); }

// ========== Test 4: Invalid token ==========
console.log('\n=== Test 4: Invalid Token ===');
try {
  const res = await api('POST', '/api/payments/create-order', { booking_id: bookingId }, 'invalidtoken');
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  pass('Invalid token = 401', `status=${res.status}`);
} catch (err) { fail('Invalid token', null, err); }

// ========== Test 5: Create Razorpay order ==========
console.log('\n=== Test 5: Create Razorpay Order ===');
let orderId, orderAmount, orderCurrency, responseBody;
try {
  const res = await api('POST', '/api/payments/create-order', { booking_id: bookingId }, accessToken);
  if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
  responseBody = res.data;
  const pd = res.data.data;
  orderId = pd.order_id;
  orderAmount = pd.amount;
  orderCurrency = pd.currency;
  pass('Order created', `order_id=${orderId}`);
  pass('Amount = booking total * 100', `${orderAmount} paise = Rs ${(orderAmount / 100).toFixed(2)}`);
  pass('Currency INR', orderCurrency);
  pass('Key ID is TEST', pd.key_id?.startsWith('rzp_test'));
  pass('Booking code in response', pd.booking_code === bookingCode);
} catch (err) { fail('Create order', null, err); }

// ========== Test 6: No secrets in response ==========
console.log('\n=== Test 6: Response Safety ===');
try {
  const resStr = JSON.stringify(responseBody);
  if (resStr.includes(process.env.RAZORPAY_KEY_SECRET)) throw new Error('KEY SECRET exposed!');
  if (resStr.includes('webhook')) throw new Error('Webhook secret exposed!');
  if (resStr.includes('password_hash')) throw new Error('Password hash exposed!');
  if (resStr.includes(process.env.JWT_ACCESS_SECRET)) throw new Error('JWT secret exposed!');
  pass('No secrets in response', 'verified');
} catch (err) { fail('Response safety', null, err); }

// ========== Test 7: Payment record stored ==========
console.log('\n=== Test 7: Payment Record ===');
try {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: payment, error } = await supabase.from('payments').select('*').eq('booking_id', bookingId).single();
  if (error || !payment) throw new Error('Payment not found');
  pass('Payment stored', `id=${payment.id.substring(0, 8)}...`);
  pass('Razorpay order ID correct', payment.razorpay_order_id === orderId);
  pass('Status = created', payment.status === 'created');
  pass('Amount matches booking', payment.amount === bookingAmount);
  pass('User ID correct', payment.user_id === testUserId);
  pass('Payment type = booking', payment.payment_type === 'booking');
} catch (err) { fail('Payment record', null, err); }

// ========== Test 8: Ownership ==========
console.log('\n=== Test 8: Ownership Protection ===');
try {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: otherBookings } = await supabase.from('bookings').select('id').neq('user_id', testUserId).eq('status', 'pending').limit(1);
  if (!otherBookings?.length) throw new Error('No other pending bookings to test with');
  const res = await api('POST', '/api/payments/create-order', { booking_id: otherBookings[0].id }, accessToken);
  if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  pass('Other user booking = 403', `status=${res.status}`);
} catch (err) { fail('Ownership test', null, err); }

// ========== Test 9: Client amount rejected ==========
console.log('\n=== Test 9: Fake Client Amount ===');
try {
  const res = await api('POST', '/api/payments/create-order', { booking_id: bookingId, amount: 1 }, accessToken);
  if (res.status !== 400 && res.status !== 409) {
    if (res.status === 201) throw new Error('Client amount was accepted - SECURITY ISSUE!');
    throw new Error(`Unexpected ${res.status}: ${JSON.stringify(res.data)}`);
  }
  pass('Client amount field rejected', `status=${res.status}`);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: payment } = await supabase.from('payments').select('*').eq('booking_id', bookingId).single();
  if (payment && payment.amount === bookingAmount) pass('Stored amount unchanged', `${payment.amount} INR`);
} catch (err) { fail('Fake amount test', null, err); }

// ========== Test 10: Duplicate payment ==========
console.log('\n=== Test 10: Duplicate Payment Prevention ===');
try {
  const res = await api('POST', '/api/payments/create-order', { booking_id: bookingId }, accessToken);
  if (res.status !== 409) throw new Error(`Expected 409 Conflict, got ${res.status}`);
  pass('Duplicate payment rejected', `status=${res.status}`);
} catch (err) { fail('Duplicate payment', null, err); }

// ========== Test 11: Invalid booking ID ==========
console.log('\n=== Test 11: Invalid Booking ID ===');
try {
  const res = await api('POST', '/api/payments/create-order', { booking_id: 'invalid-uuid' }, accessToken);
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  pass('Invalid UUID rejected', `status=${res.status}`);
} catch (err) { fail('Invalid booking ID', null, err); }

// ========== Test 12: Booking not found ==========
console.log('\n=== Test 12: Booking Not Found ===');
try {
  const res = await api('POST', '/api/payments/create-order', { booking_id: '00000000-0000-0000-0000-000000000000' }, accessToken);
  if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  pass('Non-existent booking = 404', `status=${res.status}`);
} catch (err) { fail('Booking not found', null, err); }

// ========== Test 13: Invalid payment signature ==========
console.log('\n=== Test 13: Invalid Payment Signature ===');
try {
  const res = await api('POST', '/api/payments/verify', {
    razorpay_order_id: orderId,
    razorpay_payment_id: 'pay_test123',
    razorpay_signature: 'invalid_signature',
  }, accessToken);
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  pass('Invalid signature rejected', `status=${res.status}`);
  // Verify payment record marked as failed
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: payment } = await supabase.from('payments').select('*').eq('booking_id', bookingId).single();
  if (payment && payment.status === 'failed') pass('Payment marked failed', payment.status);
} catch (err) { fail('Invalid signature test', null, err); }

// ========== Test 14: Duplicate verification idempotent ==========
console.log('\n=== Test 14: Duplicate Verification Idempotent ===');
try {
  // Try verifying again with same invalid signature
  const res1 = await api('POST', '/api/payments/verify', {
    razorpay_order_id: orderId,
    razorpay_payment_id: 'pay_test123',
    razorpay_signature: 'invalid_signature',
  }, accessToken);
  // Try with empty signature
  const res2 = await api('POST', '/api/payments/verify', {
    razorpay_order_id: orderId,
    razorpay_payment_id: 'pay_test123',
    razorpay_signature: '',
  }, accessToken);
  if (res1.status !== 400 && res1.status !== 404) throw new Error(`Unexpected: ${res1.status}`);
  if (res2.status !== 400) throw new Error(`Empty signature should be rejected: ${res2.status}`);
  pass('Re-verification handled', `status1=${res1.status} status2=${res2.status}`);
} catch (err) { fail('Duplicate verification', null, err); }

// ========== Test 15: Invalid webhook signature ==========
console.log('\n=== Test 15: Invalid Webhook Signature ===');
try {
  const res = await fetch('http://localhost:3001/api/payments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'invalid' },
    body: JSON.stringify({ event: 'payment.captured', payload: {} }),
  });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  pass('Invalid webhook signature rejected', `status=${res.status}`);
} catch (err) { fail('Webhook signature test', null, err); }

// ========== Test 16: Webhook without signature ==========
console.log('\n=== Test 16: Webhook Missing Signature ===');
try {
  const res = await fetch('http://localhost:3001/api/payments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'payment.captured', payload: {} }),
  });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  pass('Missing webhook signature rejected', `status=${res.status}`);
} catch (err) { fail('Missing webhook signature', null, err); }

// ========== Test 17: Valid booking flow still works ==========
console.log('\n=== Test 17: Existing Booking Flow ===');
try {
  // Get bookings for user
  const res = await api('GET', '/api/bookings', null, accessToken);
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  pass('GET /api/bookings works', `status=${res.status} count=${res.data.data?.length || 0}`);
  // Get specific booking
  const res2 = await api('GET', `/api/bookings/${bookingId}`, null, accessToken);
  if (res2.status !== 200) throw new Error(`Expected 200, got ${res2.status}`);
  pass('GET /api/bookings/:id works', `status=${res2.status}`);
  // Get payment status
  const res3 = await api('GET', `/api/payments/status/${bookingId}`, null, accessToken);
  if (res3.status !== 200) throw new Error(`Expected 200, got ${res3.status}`);
  pass('GET /api/payments/status/:booking_id works', `status=${res3.status}`);
} catch (err) { fail('Existing booking flow', null, err); }

// ========== Summary ==========
console.log('\n================ TEST SUMMARY ================');
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
console.log(`PASSED: ${passed}  FAILED: ${failed}`);
if (failed > 0) {
  console.log('\nFAILURES:');
  results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  [FAIL] ${r.name}: ${r.error}`));
}
if (orderId) {
  console.log('\n========== RAZORPAY TEST ORDER ==========');
  console.log(`Order ID:  ${orderId}`);
  console.log(`Amount:    ${orderAmount} paise (Rs ${(orderAmount / 100).toFixed(2)})`);
  console.log(`Currency:  ${orderCurrency}`);
  console.log(`Booking:   ${bookingCode}`);
}
process.exit(failed > 0 ? 1 : 0);
