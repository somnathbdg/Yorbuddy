const http = require('http');
const path = require('path');

const fs = require('fs');
const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const i = line.indexOf('=');
  if (i > 0) env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
});

const { createClient } = require(path.join(__dirname, 'node_modules/@supabase/supabase-js'));
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

// Test credentials come from the environment or are generated per run.
// No password is hard-coded in this file.
const { testPassword } = require('./test-utils/credentials.cjs');

function api(method, reqPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request({ hostname: 'localhost', port: 3001, path: reqPath, method, headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function test() {
  console.log('=== Verification Flow Test ===\n');
  
  // Register user
  const reg = await api('POST', '/api/auth/register', { email: 'verify_test_' + Date.now() + '@test.com', password: testPassword, full_name: 'Verify Test' });
  if (reg.status !== 201) { console.log('Registration failed:', reg.status, reg.data); return; }
  const token = reg.data.data.accessToken;
  const userId = reg.data.data.user.id;
  console.log('1. User registered:', userId);
  
  // Request email code
  const emailReq = await api('POST', '/api/verification/email/request', {}, token);
  console.log('2. Email code request:', emailReq.status, JSON.stringify(emailReq.data));
  
  if (emailReq.data.dev_code) {
    const emailCode = emailReq.data.dev_code;
    console.log('   Dev code received:', emailCode);
    
    // Verify email
    const emailVerify = await api('POST', '/api/verification/email/verify', { code: emailCode }, token);
    console.log('3. Email verification:', emailVerify.status, JSON.stringify(emailVerify.data));
  }
  
  // Request phone code
  const phoneReq = await api('POST', '/api/verification/phone/request', { phone: '+919999999999' }, token);
  console.log('4. Phone OTP request:', phoneReq.status, JSON.stringify(phoneReq.data));
  
  if (phoneReq.data.dev_code) {
    const phoneCode = phoneReq.data.dev_code;
    console.log('   Dev OTP received:', phoneCode);
    
    // Verify phone
    const phoneVerify = await api('POST', '/api/verification/phone/verify', { code: phoneCode }, token);
    console.log('5. Phone verification:', phoneVerify.status, JSON.stringify(phoneVerify.data));
  }
  
  // Check verification status
  const status = await api('GET', '/api/verification/me', null, token);
  console.log('6. Verification status:', status.status, JSON.stringify(status.data));
  
  // Test invalid code
  const invalid = await api('POST', '/api/verification/email/verify', { code: '000000' }, token);
  console.log('7. Invalid email code:', invalid.status, JSON.stringify(invalid.data));
  
  // Cleanup
  await supabase.from('verification_codes').delete().eq('key', 'email:' + userId);
  await supabase.from('verification_codes').delete().eq('key', 'phone:' + userId);
  await supabase.from('users').delete().eq('id', userId);
  console.log('\n8. Cleanup complete');
}

test().catch(console.error);
