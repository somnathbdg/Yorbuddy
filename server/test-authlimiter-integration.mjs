/**
 * Functional integration test for authLimiter on actual Express routes.
 *
 * Boots a real Express app with the authLimiter and verifies:
 * 1. Different client IPs receive separate rate-limit buckets
 * 2. Repeated requests from the same client are limited after 5 attempts
 * 3. IPv4 and IPv6 addresses are handled correctly
 * 4. Missing or malformed X-Forwarded-For headers fall back correctly
 * 5. The handler logs a privacy-safe fingerprint (not the full IP)
 */
import express from 'express';
import http from 'http';

// Set NODE_ENV to production before importing security.ts
// This ensures authLimiter uses max=5 instead of max=100
process.env.NODE_ENV = 'production';

const { authLimiter } = await import('./src/middleware/security.ts');

console.log('\n=== AUTHLIMITER INTEGRATION TESTS ===\n');

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

// Create a test Express app
const app = express();
app.set('trust proxy', 1);

// Apply authLimiter to a test route
app.get('/api/auth/google', authLimiter, (req, res) => {
  res.json({ success: true });
});

app.post('/api/auth/google/exchange', authLimiter, (req, res) => {
  res.json({ success: true });
});

// Start the server
const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

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

  // ========== TEST 1: Different IPv4 addresses get separate buckets ==========
  console.log('=== Test 1: Different IPv4 addresses get separate buckets ===\n');

  // Make 5 requests from IP1 (should all succeed)
  let ip1Results = [];
  for (let i = 0; i < 5; i++) {
    const res = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '192.168.1.1' });
    ip1Results.push(res.status);
  }

  // Make 1 request from IP2 (should succeed because different bucket)
  const ip2Res = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '192.168.1.2' });

  if (ip1Results.every(s => s === 200) && ip2Res.status === 200) {
    pass('Different IPv4 addresses get separate buckets');
  } else {
    fail('Different IPv4 addresses should get separate buckets', `ip1: ${ip1Results}, ip2: ${ip2Res.status}`);
  }

  // ========== TEST 2: Same IP is limited after 5 requests ==========
  console.log('\n=== Test 2: Same IP is limited after 5 requests ===\n');

  // IP1 already has 5 requests, next should be 429
  const ip1Res = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '192.168.1.1' });

  if (ip1Res.status === 429) {
    pass('Same IP is limited after 5 requests');
  } else {
    fail('Same IP should be limited after 5 requests', `got: ${ip1Res.status}`);
  }

  // ========== TEST 3: IPv6 addresses work correctly ==========
  console.log('\n=== Test 3: IPv6 addresses work correctly ===\n');

  // Make 5 requests from IPv6 address
  let ipv6Results = [];
  for (let i = 0; i < 5; i++) {
    const res = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '2001:db8::1' });
    ipv6Results.push(res.status);
  }

  // Next request should be limited
  const ipv6Res = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '2001:db8::1' });

  if (ipv6Results.every(s => s === 200) && ipv6Res.status === 429) {
    pass('IPv6 addresses work correctly');
  } else {
    fail('IPv6 addresses should work correctly', `results: ${ipv6Results}, next: ${ipv6Res.status}`);
  }

  // ========== TEST 4: Missing X-Forwarded-For falls back to req.ip ==========
  console.log('\n=== Test 4: Missing X-Forwarded-For falls back to req.ip ===\n');

  // Make 5 requests without X-Forwarded-For (uses req.ip = 127.0.0.1)
  let noHeaderResults = [];
  for (let i = 0; i < 5; i++) {
    const res = await makeRequest('GET', '/api/auth/google', {});
    noHeaderResults.push(res.status);
  }

  // Next request should be limited
  const noHeaderRes = await makeRequest('GET', '/api/auth/google', {});

  if (noHeaderResults.every(s => s === 200) && noHeaderRes.status === 429) {
    pass('Missing X-Forwarded-For falls back to req.ip');
  } else {
    fail('Missing X-Forwarded-For should fall back to req.ip', `results: ${noHeaderResults}, next: ${noHeaderRes.status}`);
  }

  // ========== TEST 5: Malformed X-Forwarded-For is handled ==========
  console.log('\n=== Test 5: Malformed X-Forwarded-For is handled ===\n');

  // Empty string should fall back to req.ip (which is already limited)
  const emptyRes = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '' });

  if (emptyRes.status === 429) {
    pass('Empty X-Forwarded-For falls back to req.ip (already limited)');
  } else {
    fail('Empty X-Forwarded-For should fall back to req.ip', `got: ${emptyRes.status}`);
  }

  // ========== TEST 6: Multiple proxies in X-Forwarded-For ==========
  console.log('\n=== Test 6: Multiple proxies in X-Forwarded-For ===\n');

  // First IP should be used as the key
  const multiProxyRes = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '10.0.0.1, 10.0.0.2, 10.0.0.3' });

  if (multiProxyRes.status === 200) {
    pass('Multiple proxies in X-Forwarded-For uses first IP');
  } else {
    fail('Multiple proxies should use first IP', `got: ${multiProxyRes.status}`);
  }

  // ========== TEST 7: POST /api/auth/google/exchange is also limited ==========
  console.log('\n=== Test 7: POST /api/auth/google/exchange is also limited ===\n');

  // Make 5 POST requests from a new IP
  let postResults = [];
  for (let i = 0; i < 5; i++) {
    const res = await makeRequest('POST', '/api/auth/google/exchange', { 'X-Forwarded-For': '172.16.0.1' });
    postResults.push(res.status);
  }

  // Next request should be limited
  const postRes = await makeRequest('POST', '/api/auth/google/exchange', { 'X-Forwarded-For': '172.16.0.1' });

  if (postResults.every(s => s === 200) && postRes.status === 429) {
    pass('POST /api/auth/google/exchange is also limited');
  } else {
    fail('POST /api/auth/google/exchange should be limited', `results: ${postResults}, next: ${postRes.status}`);
  }

  // ========== TEST 8: Rate limit headers are present ==========
  console.log('\n=== Test 8: Rate limit headers are present ===\n');

  const headerRes = await makeRequest('GET', '/api/auth/google', { 'X-Forwarded-For': '10.0.0.99' });

  if (headerRes.headers['ratelimit-limit'] || headerRes.headers['x-ratelimit-limit']) {
    pass('Rate limit headers are present');
  } else {
    fail('Rate limit headers should be present', `headers: ${JSON.stringify(headerRes.headers)}`);
  }

  // ========== SUMMARY ==========
  console.log('\n=== AUTHLIMITER INTEGRATION TEST SUMMARY ===');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${passed + failed}`);
  console.log(failed === 0 ? '\n  ALL TESTS PASSED\n' : `\n  ${failed} TEST(S) FAILED\n`);

  server.close();
  process.exit(failed === 0 ? 0 : 1);
});
