/**
 * Integration test for oauthLimiter on Google OAuth routes.
 *
 * Boots a real Express app with both authLimiter and oauthLimiter and verifies:
 * 1. authLimiter still limits at 5 req/10 min/IP (registration/login unchanged)
 * 2. oauthLimiter allows 10 req/10 min/IP (Google OAuth gets separate bucket)
 * 3. OAuth and auth use separate buckets — OAuth attempts don't consume auth attempts
 * 4. Different IPs get separate buckets for both limiters
 * 5. IPv6 works with oauthLimiter
 * 6. Missing X-Forwarded-For falls back to req.ip
 * 7. Rate limit headers present
 */
import express from 'express';
import http from 'http';

process.env.NODE_ENV = 'production';

const { authLimiter, oauthLimiter } = await import('./src/middleware/security.ts');

console.log('\n=== OAUTH LIMITER INTEGRATION TESTS ===\n');

let passed = 0;
let failed = 0;

function pass(name, detail) {
  passed++;
  console.log(`  PASS: ${name}${detail ? ' - ' + detail : ''}`);
}

function fail(name, detail, error) {
  failed++;
  console.log(`  FAIL: ${name}${detail ? ' - ' + detail : ''}${error ? ' | ' + error : ''}`);
}

const app = express();
app.set('trust proxy', 1);

// Auth limiter route (simulates registration/login)
app.post('/api/auth/register', authLimiter, (req, res) => {
  res.json({ success: true });
});

// OAuth limiter route (simulates Google OAuth)
app.get('/api/auth/google', oauthLimiter, (req, res) => {
  res.json({ success: true });
});

app.get('/api/auth/google/callback', oauthLimiter, (req, res) => {
  res.json({ success: true });
});

app.post('/api/auth/google/exchange', oauthLimiter, (req, res) => {
  res.json({ success: true });
});

// Start the server
const server = app.listen(0, async () => {
  const port = server.address().port;

  // Helper to make a request
  function makeRequest(method, path, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: port,
        path: path,
        method: method,
        headers: headers,
      };
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, body: body, headers: res.headers });
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  // ========== TEST 1: authLimiter still limits at 5 (unchanged) ==========
  console.log('=== Test 1: authLimiter still limits at 5 ===\n');

  let authResults = [];
  for (let i = 0; i < 5; i++) {
    const res = await makeRequest('POST', '/api/auth/register', { 'X-Forwarded-For': '192.168.1.1' });
    authResults.push(res.status);
  }
  const authLimited = await makeRequest('POST', '/api/auth/register', { 'X-Forwarded-For': '192.168.1.1' });

  if (authResults.every(s => s === 200) && authLimited.status === 429) {
    pass('authLimiter still limits at 5 requests');
  } else {
    fail('authLimiter should still limit at 5', `results: ${authResults}, 6th: ${authLimited.status}`);
  }

  // ========== TEST 2: oauthLimiter allows 10 requests ==========
  console.log('\n=== Test 2: oauthLimiter allows 10 requests ===\n');

  let oauthResults = [];
  for (let i = 0; i < 10; i++) {
    const res = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '192.168.1.2' });
    oauthResults.push(res.status);
  }
  const oauthLimited = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '192.168.1.2' });

  if (oauthResults.every(s => s === 200) && oauthLimited.status === 429) {
    pass('oauthLimiter allows 10 requests, 11th returns 429');
  } else {
    fail('oauthLimiter should allow 10 requests', `results: ${oauthResults}, 11th: ${oauthLimited.status}`);
  }

  // ========== TEST 3: OAuth and auth buckets are separate ==========
  console.log('\n=== Test 3: OAuth and auth buckets are separate ===\n');

  // Fresh IP — make 5 OAuth attempts, then 1 auth attempt
  const oauthRes1 = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '192.168.1.3' });
  const oauthRes2 = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '192.168.1.3' });
  const oauthRes3 = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '192.168.1.3' });
  const oauthRes4 = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '192.168.1.3' });
  const oauthRes5 = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '192.168.1.3' });
  const authRes = await makeRequest('POST', '/api/auth/register', { 'X-Forwarded-For': '192.168.1.3' });

  const allOauthOk = [oauthRes1, oauthRes2, oauthRes3, oauthRes4, oauthRes5].every(s => s.status === 200);
  if (allOauthOk && authRes.status === 200) {
    pass('OAuth and auth use separate buckets (5 OAuth + 1 auth = OK)');
  } else {
    fail('OAuth and auth should use separate buckets', `oauth: ${[oauthRes1, oauthRes2, oauthRes3, oauthRes4, oauthRes5].map(s => s.status)}, auth: ${authRes.status}`);
  }

  // Now the 6th auth attempt should be limited (auth bucket is separate, already used 1)
  const authRes2 = await makeRequest('POST', '/api/auth/register', { 'X-Forwarded-For': '192.168.1.3' });
  if (authRes2.status === 200) {
    pass('6th auth attempt succeeds (only 2/5 auth attempts used)');
  } else {
    fail('6th auth attempt should succeed', `got: ${authRes2.status}`);
  }

  // ========== TEST 4: Different IPs get separate OAuth buckets ==========
  console.log('\n=== Test 4: Different IPs get separate OAuth buckets ===\n');

  const ip1Res = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '10.0.0.1' });
  const ip2Res = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '10.0.0.2' });

  if (ip1Res.status === 200 && ip2Res.status === 200) {
    pass('Different IPs get separate OAuth buckets');
  } else {
    fail('Different IPs should get separate buckets', `ip1: ${ip1Res.status}, ip2: ${ip2Res.status}`);
  }

  // ========== TEST 5: IPv6 works with oauthLimiter ==========
  console.log('\n=== Test 5: IPv6 works with oauthLimiter ===\n');

  let ipv6Results = [];
  for (let i = 0; i < 10; i++) {
    const res = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '2001:db8::1' });
    ipv6Results.push(res.status);
  }
  const ipv6Limited = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '2001:db8::1' });

  if (ipv6Results.every(s => s === 200) && ipv6Limited.status === 429) {
    pass('IPv6 works correctly with oauthLimiter');
  } else {
    fail('IPv6 should work with oauthLimiter', `results: ${ipv6Results}, 11th: ${ipv6Limited.status}`);
  }

  // ========== TEST 6: Missing X-Forwarded-For falls back to req.ip ==========
  console.log('\n=== Test 6: Missing X-Forwarded-For falls back to req.ip ===\n');

  let noHeaderResults = [];
  for (let i = 0; i < 10; i++) {
    const res = await makeRequest('GET', '/api/auth/google', {});
    noHeaderResults.push(res.status);
  }
  const noHeaderLimited = await makeRequest('GET', '/api/auth/google', {});

  if (noHeaderResults.every(s => s === 200) && noHeaderLimited.status === 429) {
    pass('Missing X-Forwarded-For falls back to req.ip');
  } else {
    fail('Missing X-Forwarded-For should fall back to req.ip', `results: ${noHeaderResults}, 11th: ${noHeaderLimited.status}`);
  }

  // ========== TEST 7: OAuth callback and exchange routes also use oauthLimiter ==========
  console.log('\n=== Test 7: OAuth callback and exchange routes use oauthLimiter ===\n');

  let callbackResults = [];
  for (let i = 0; i < 10; i++) {
    const res = await makeRequest('GET', '/api/auth/google/callback', { 'X-Forwarded-For': '172.16.0.1' });
    callbackResults.push(res.status);
  }
  const callbackLimited = await makeRequest('GET', '/api/auth/google/callback', { 'X-Forwarded-For': '172.16.0.1' });

  let exchangeResults = [];
  for (let i = 0; i < 10; i++) {
    const res = await makeRequest('POST', '/api/auth/google/exchange', { 'X-Forwarded-For': '172.16.0.2' });
    exchangeResults.push(res.status);
  }
  const exchangeLimited = await makeRequest('POST', '/api/auth/google/exchange', { 'X-Forwarded-For': '172.16.0.2' });

  if (callbackResults.every(s => s === 200) && callbackLimited.status === 429) {
    pass('GET /api/auth/google/callback uses oauthLimiter (10 req)');
  } else {
    fail('Callback should use oauthLimiter', `results: ${callbackResults}, 11th: ${callbackLimited.status}`);
  }

  if (exchangeResults.every(s => s === 200) && exchangeLimited.status === 429) {
    pass('POST /api/auth/google/exchange uses oauthLimiter (10 req)');
  } else {
    fail('Exchange should use oauthLimiter', `results: ${exchangeResults}, 11th: ${exchangeLimited.status}`);
  }

  // ========== TEST 8: Rate limit headers present ==========
  console.log('\n=== Test 8: Rate limit headers present ===\n');

  const headerRes = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '10.0.0.99' });

  if (headerRes.headers['ratelimit-limit'] || headerRes.headers['x-ratelimit-limit']) {
    pass('Rate limit headers are present');
  } else {
    fail('Rate limit headers should be present', `headers: ${JSON.stringify(headerRes.headers)}`);
  }

  // ========== SUMMARY ==========
  console.log('\n=== OAUTH LIMITER INTEGRATION TEST SUMMARY ===\n');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log(failed === 0 ? '\n  ALL TESTS PASSED\n' : `\n  ${failed} TEST(S) FAILED\n`);

  server.close();
  process.exit(failed === 0 ? 0 : 1);
});
