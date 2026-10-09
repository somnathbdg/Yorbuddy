/**
 * Functional test for authLimiter keyGenerator.
 *
 * Tests the keyGenerator logic by evaluating it with different simulated client IPs.
 * This test verifies the behavior of the keyGenerator function.
 */
import fs from 'fs';

console.log('\n=== FUNCTIONAL AUTHLIMITER KEYGENERATOR TESTS ===\n');

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

// Read the security.ts source
const securityTs = fs.readFileSync('src/middleware/security.ts', 'utf8');

// Verify the keyGenerator exists in the source
if (!securityTs.includes('keyGenerator')) {
  console.log('  ERROR: keyGenerator not found in source');
  process.exit(1);
}

// Extract the keyGenerator function body from the source
// The keyGenerator is defined as:
//   keyGenerator: (req: Request) => {
//     const forwarded = req.headers['x-forwarded-for'];
//     if (typeof forwarded === 'string' && forwarded.length > 0) {
//       const firstIp = forwarded.split(',')[0].trim();
//       if (firstIp) return firstIp;
//     }
//     return req.ip || 'unknown';
//   },
const keyGeneratorStart = securityTs.indexOf('keyGenerator:');
const keyGeneratorBodyStart = securityTs.indexOf('{', keyGeneratorStart);
const keyGeneratorBodyEnd = securityTs.indexOf('},', keyGeneratorBodyStart);
const keyGeneratorBody = securityTs.substring(keyGeneratorBodyStart + 1, keyGeneratorBodyEnd);

// Create a function from the extracted body
const keyGenerator = new Function('req', keyGeneratorBody);

// Helper to create a mock request
function mockRequest(ip, forwardedFor) {
  const headers = {};
  if (forwardedFor !== undefined) {
    headers['x-forwarded-for'] = forwardedFor;
  }
  return {
    ip: ip,
    headers: headers,
  };
}

// ========== TEST 1: Different IPv4 addresses produce different keys ==========
console.log('=== Test 1: Different IPv4 addresses produce different keys ===\n');

const req1 = mockRequest('192.168.1.1', '192.168.1.1');
const req2 = mockRequest('192.168.1.2', '192.168.1.2');

const key1 = keyGenerator(req1);
const key2 = keyGenerator(req2);

if (key1 !== key2) {
  pass('Different IPv4 addresses produce different keys');
} else {
  fail('Different IPv4 addresses should produce different keys', `both returned: ${key1}`);
}

// ========== TEST 2: Same IP produces same key ==========
console.log('\n=== Test 2: Same IP produces same key ===\n');

const req3 = mockRequest('10.0.0.1', '10.0.0.1');
const req4 = mockRequest('10.0.0.1', '10.0.0.1');

const key3 = keyGenerator(req3);
const key4 = keyGenerator(req4);

if (key3 === key4) {
  pass('Same IP produces same key');
} else {
  fail('Same IP should produce same key', `${key3} !== ${key4}`);
}

// ========== TEST 3: IPv6 addresses are handled correctly ==========
console.log('\n=== Test 3: IPv6 addresses are handled correctly ===\n');

const req5 = mockRequest('::1', '::1');
const req6 = mockRequest('::1', '::1');
const req7 = mockRequest('2001:db8::1', '2001:db8::1');

const key5 = keyGenerator(req5);
const key6 = keyGenerator(req6);
const key7 = keyGenerator(req7);

if (key5 === key6) {
  pass('Same IPv6 address produces same key');
} else {
  fail('Same IPv6 address should produce same key', `${key5} !== ${key6}`);
}

if (key5 !== key7) {
  pass('Different IPv6 addresses produce different keys');
} else {
  fail('Different IPv6 addresses should produce different keys', `both returned: ${key5}`);
}

// ========== TEST 4: Missing X-Forwarded-For falls back to req.ip ==========
console.log('\n=== Test 4: Missing X-Forwarded-For falls back to req.ip ===\n');

const req8 = mockRequest('172.16.0.1', undefined);
const key8 = keyGenerator(req8);

if (key8 === '172.16.0.1') {
  pass('Missing X-Forwarded-For falls back to req.ip');
} else {
  fail('Missing X-Forwarded-For should fall back to req.ip', `returned: ${key8}`);
}

// ========== TEST 5: Multiple proxies in X-Forwarded-For ==========
console.log('\n=== Test 5: Multiple proxies in X-Forwarded-For ===\n');

// X-Forwarded-For: client, proxy1, proxy2
// The first value should be the client IP
const req9 = mockRequest('10.0.0.1', '203.0.113.195, 70.41.3.18, 150.172.238.178');
const key9 = keyGenerator(req9);

if (key9 === '203.0.113.195') {
  pass('First IP in X-Forwarded-For is used (client IP)');
} else {
  fail('First IP in X-Forwarded-For should be used', `returned: ${key9}`);
}

// ========== TEST 6: Different clients behind same proxy ==========
console.log('\n=== Test 6: Different clients behind same proxy ===\n');

// Two different clients, same proxy chain
const req10 = mockRequest('10.0.0.1', '198.51.100.1, 70.41.3.18');
const req11 = mockRequest('10.0.0.1', '198.51.100.2, 70.41.3.18');

const key10 = keyGenerator(req10);
const key11 = keyGenerator(req11);

if (key10 !== key11) {
  pass('Different clients behind same proxy produce different keys');
} else {
  fail('Different clients behind same proxy should produce different keys', `both returned: ${key10}`);
}

// ========== TEST 7: Empty X-Forwarded-For falls back to req.ip ==========
console.log('\n=== Test 7: Empty X-Forwarded-For falls back to req.ip ===\n');

const req12 = mockRequest('172.16.0.2', '');
const key12 = keyGenerator(req12);

if (key12 === '172.16.0.2') {
  pass('Empty X-Forwarded-For falls back to req.ip');
} else {
  fail('Empty X-Forwarded-For should fall back to req.ip', `returned: ${key12}`);
}

// ========== TEST 8: Whitespace in X-Forwarded-For is trimmed ==========
console.log('\n=== Test 8: Whitespace in X-Forwarded-For is trimmed ===\n');

const req13 = mockRequest('10.0.0.1', '  192.0.2.1  , 70.41.3.18');
const key13 = keyGenerator(req13);

if (key13 === '192.0.2.1') {
  pass('Whitespace in X-Forwarded-For is trimmed');
} else {
  fail('Whitespace in X-Forwarded-For should be trimmed', `returned: ${key13}`);
}

// ========== TEST 9: Rate limiter configuration is unchanged ==========
console.log('\n=== Test 9: Rate limiter configuration is unchanged ===\n');

if (securityTs.includes('windowMs: 10 * 60 * 1000')) {
  pass('authLimiter windowMs is still 10 minutes');
} else {
  fail('authLimiter windowMs should be 10 minutes');
}

if (securityTs.includes("max: process.env.NODE_ENV === 'production' ? 5 : 100")) {
  pass('authLimiter max is still 5 in production');
} else {
  fail('authLimiter max should be 5 in production');
}

// ========== SUMMARY ==========
console.log('\n=== FUNCTIONAL KEYGENERATOR TEST SUMMARY ===');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);
console.log(failed === 0 ? '\n  ALL TESTS PASSED\n' : `\n  ${failed} TEST(S) FAILED\n`);
process.exit(failed === 0 ? 0 : 1);
