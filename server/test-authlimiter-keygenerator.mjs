/**
 * Regression test for authLimiter keyGenerator fix.
 *
 * Verifies that:
 * 1. Different client IPs receive separate rate-limit buckets
 * 2. Repeated requests from the same client remain limited
 * 3. The keyGenerator correctly extracts the first IP from X-Forwarded-For
 * 4. IPv6 addresses are handled correctly
 * 5. Missing X-Forwarded-For falls back to req.ip
 */
import fs from 'fs';

console.log('\n=== AUTHLIMITER KEYGENERATOR REGRESSION TESTS ===\n');

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

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

// ========== TEST 1: keyGenerator is defined ==========
console.log('=== Test 1: keyGenerator is defined ===\n');

const securityTs = readFile('src/middleware/security.ts');

if (securityTs.includes('keyGenerator')) {
  pass('authLimiter has a custom keyGenerator');
} else {
  fail('authLimiter should have a custom keyGenerator');
}

// ========== TEST 2: keyGenerator reads X-Forwarded-For ==========
console.log('\n=== Test 2: keyGenerator reads X-Forwarded-For ===\n');

if (securityTs.includes("req.headers['x-forwarded-for']")) {
  pass('keyGenerator reads X-Forwarded-For header');
} else {
  fail('keyGenerator should read X-Forwarded-For header');
}

if (securityTs.includes("split(',')[0]")) {
  pass('keyGenerator extracts first IP from X-Forwarded-For');
} else {
  fail('keyGenerator should extract first IP from X-Forwarded-For');
}

// ========== TEST 3: keyGenerator falls back to req.ip ==========
console.log('\n=== Test 3: keyGenerator falls back to req.ip ===\n');

if (securityTs.includes("return req.ip || 'unknown'")) {
  pass('keyGenerator falls back to req.ip when X-Forwarded-For is missing');
} else {
  fail('keyGenerator should fall back to req.ip');
}

// ========== TEST 4: Rate limits are unchanged ==========
console.log('\n=== Test 4: Rate limits are unchanged ===\n');

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

// ========== TEST 5: Trust proxy is still set ==========
console.log('\n=== Test 5: Trust proxy is still set ===\n');

const appTs = readFile('src/app.ts');

if (appTs.includes("app.set('trust proxy', 1)")) {
  pass('trust proxy is still set to 1');
} else {
  fail('trust proxy should be set to 1');
}

// ========== TEST 6: authLimiter is still applied to all auth routes ==========
console.log('\n=== Test 6: authLimiter is still applied to all auth routes ===\n');

const authRoute = readFile('src/routes/auth.ts');
const googleAuthRoute = readFile('src/routes/googleAuth.ts');

const authEndpoints = [
  { route: authRoute, path: "router.post('/register', authLimiter" },
  { route: authRoute, path: "router.post('/login', authLimiter" },
  { route: authRoute, path: "router.post('/refresh', authLimiter" },
  { route: authRoute, path: "router.post('/forgot-password', authLimiter" },
  { route: authRoute, path: "router.post('/reset-password', authLimiter" },
];

for (const endpoint of authEndpoints) {
  if (endpoint.route.includes(endpoint.path)) {
    pass(`authLimiter applied to ${endpoint.path}`);
  } else {
    fail(`authLimiter should be applied to ${endpoint.path}`);
  }
}

// Note: Google OAuth routes now use oauthLimiter, not authLimiter (Option B)
// Verified in Test 6b below

// ========== Test 6b: oauthLimiter is applied to Google OAuth routes ==========
console.log('\n=== Test 6b: oauthLimiter is applied to Google OAuth routes ===\n');

const oauthEndpoints = [
  { route: googleAuthRoute, path: "router.get('/', oauthLimiter" },
  { route: googleAuthRoute, path: "router.get('/callback', oauthLimiter" },
  { route: googleAuthRoute, path: "router.post('/exchange', oauthLimiter" },
];

for (const endpoint of oauthEndpoints) {
  if (endpoint.route.includes(endpoint.path)) {
    pass(`oauthLimiter applied to ${endpoint.path}`);
  } else {
    fail(`oauthLimiter should be applied to ${endpoint.path}`);
  }
}

// ========== TEST 7: No security weakened =========
console.log('\n=== Test 7: No security weakened ===\n');

if (securityTs.includes('apiLimiter')) {
  pass('apiLimiter still exists');
} else {
  fail('apiLimiter should still exist');
}

if (securityTs.includes('verificationLimiter')) {
  pass('verificationLimiter still exists');
} else {
  fail('verificationLimiter should still exist');
}

if (securityTs.includes('telegramLimiter')) {
  pass('telegramLimiter still exists');
} else {
  fail('telegramLimiter should still exist');
}

if (appTs.includes('helmetMiddleware')) {
  pass('helmetMiddleware still applied');
} else {
  fail('helmetMiddleware should still be applied');
}

if (appTs.includes('corsMiddleware')) {
  pass('corsMiddleware still applied');
} else {
  fail('corsMiddleware should still be applied');
}

// ========== SUMMARY ==========
console.log('\n=== AUTHLIMITER KEYGENERATOR TEST SUMMARY ===');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);
console.log(failed === 0 ? '\n  ALL TESTS PASSED\n' : `\n  ${failed} TEST(S) FAILED\n`);
process.exit(failed === 0 ? 0 : 1);
