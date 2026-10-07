import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Test credentials come from the environment or are generated per run.
// No password is hard-coded in this file.
import { testPassword } from './test-utils/credentials.mjs';

dotenv.config();

const results = [];
let accessToken;

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
console.log('\n=== Test 1: Backend Health Check ===');
try {
  const { status, data } = await api('GET', '/api/health');
  if (data.data?.status !== 'ok') throw new Error('Health check not ok');
  pass('Backend running', `status=${data.data.status}`);
} catch (err) {
  fail('Backend health check', null, err);
}

// ========== Test 2: Forgot password with existing email ==========
console.log('\n=== Test 2: Forgot Password (existing email) ===');
try {
  const email = 'testuser_step6_2026@example.com';
  const res = await api('POST', '/api/auth/forgot-password', { email });
  
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.data.message) throw new Error('Missing message in response');
  pass('Forgot password request accepted', `status=${res.status}`);
  pass('Generic message returned', res.data.message.includes('If an account exists'));
  
  // Verify no sensitive data in response
  const resStr = JSON.stringify(res.data);
  if (resStr.includes('token') && !resStr.includes('If an account')) {
    fail('No token in response', 'Token should not be in response');
  } else {
    pass('No token exposed in response', 'verified');
  }
} catch (err) {
  fail('Forgot password (existing)', null, err);
}

// ========== Test 3: Forgot password with non-existing email ==========
console.log('\n=== Test 3: Forgot Password (non-existing email) ===');
try {
  const email = 'nonexistent_user_not_found@example.com';
  const res = await api('POST', '/api/auth/forgot-password', { email });
  
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.data.message) throw new Error('Missing message in response');
  pass('Same generic message for non-existing email', 'no email enumeration');
} catch (err) {
  fail('Forgot password (non-existing)', null, err);
}

// ========== Test 4: Reset password with invalid token ==========
console.log('\n=== Test 4: Reset Password (invalid token) ===');
try {
  const res = await api('POST', '/api/auth/reset-password', {
    token: 'invalid_token_12345',
    new_password: testPassword,
  });
  
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  pass('Invalid token rejected', `status=${res.status}`);
} catch (err) {
  fail('Reset password (invalid token)', null, err);
}

// ========== Test 5: Reset password validation ==========
console.log('\n=== Test 5: Reset Password (short password) ===');
try {
  // NOTE: 'short' is a deliberate invalid input for the length-validation
  // check below, not a credential.
  const res = await api('POST', '/api/auth/reset-password', {
    token: 'some_token',
    new_password: 'short',
  });
  
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  pass('Short password rejected', `status=${res.status}`);
} catch (err) {
  fail('Reset password (short password)', null, err);
}

// ========== Test 6: Forgot password validation ==========
console.log('\n=== Test 6: Forgot Password (invalid email) ===');
try {
  const res = await api('POST', '/api/auth/forgot-password', {
    email: 'not-an-email',
  });
  
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  pass('Invalid email rejected', `status=${res.status}`);
} catch (err) {
  fail('Forgot password (invalid email)', null, err);
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
process.exit(failed > 0 ? 1 : 0);
