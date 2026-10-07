/**
 * P1 Security Hardening Tests
 * Tests the four P1 security improvements:
 *   1. Telegram webhook rate limiter
 *   2. Verification/OTP brute-force protection
 *   3. Self-booking prevention
 *   4. JWT dev-secret warning at startup
 */
import fs from 'fs';
import path from 'path';

console.log('\n=== P1 SECURITY HARDENING TESTS ===\n');

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

// ========== TEST 1: Telegram Webhook Rate Limiter ==========
console.log('=== Test 1: Telegram Webhook Rate Limiter ===\n');

const securityTs = readFile('src/middleware/security.ts');
const telegramRoute = readFile('src/routes/telegram.ts');

// Check telegramLimiter is defined in security.ts
if (securityTs.includes('telegramLimiter')) {
  pass('telegramLimiter defined in security.ts');
} else {
  fail('telegramLimiter should be defined in security.ts');
}

// Check it has appropriate settings (30 req/min in production)
if (securityTs.includes('windowMs: 60 * 1000') && securityTs.includes("max: process.env.NODE_ENV === 'production' ? 30 : 200")) {
  pass('telegramLimiter has correct window (1min) and max (30 prod / 200 dev)');
} else {
  fail('telegramLimiter should have windowMs=1min and max=30 in production');
}

// Check it's applied to the webhook route
if (telegramRoute.includes("import { telegramLimiter } from '../middleware/security.js'")) {
  pass('telegramLimiter imported in telegram route');
} else {
  fail('telegramLimiter should be imported in telegram route');
}

if (telegramRoute.includes("webhookRouter.post('/webhook', telegramLimiter")) {
  pass('telegramLimiter applied to POST /webhook');
} else {
  fail('telegramLimiter should be applied to POST /webhook');
}

// ========== TEST 2: Verification Rate Limiter ==========
console.log('\n=== Test 2: Verification/OTP Brute-Force Protection ===\n');

const verificationRoute = readFile('src/routes/verification.ts');

// Check verificationLimiter is defined in security.ts
if (securityTs.includes('verificationLimiter')) {
  pass('verificationLimiter defined in security.ts');
} else {
  fail('verificationLimiter should be defined in security.ts');
}

// Check it has appropriate settings (5 req/10min in production)
if (securityTs.includes("max: process.env.NODE_ENV === 'production' ? 5 : 100")) {
  // More specific check for verificationLimiter context
  const verifLimiterBlock = securityTs.substring(
    securityTs.indexOf('verificationLimiter'),
    securityTs.indexOf('verificationLimiter') + 500
  );
  if (verifLimiterBlock.includes("windowMs: 10 * 60 * 1000")) {
    pass('verificationLimiter has correct window (10min) and max (5 prod / 100 dev)');
  } else {
    fail('verificationLimiter should have windowMs=10min');
  }
} else {
  fail('verificationLimiter should have max=5 in production');
}

// Check it's imported in verification route
if (verificationRoute.includes("import { verificationLimiter } from '../middleware/security.js'")) {
  pass('verificationLimiter imported in verification route');
} else {
  fail('verificationLimiter should be imported in verification route');
}

// Check it's applied to all verification endpoints
const verifEndpoints = [
  "router.post('/email/request', authenticate, verificationLimiter",
  "router.post('/email/verify', authenticate, verificationLimiter",
  "router.post('/phone/request', authenticate, verificationLimiter",
  "router.post('/phone/verify', authenticate, verificationLimiter",
  "router.post('/submit', authenticate, verificationLimiter",
];

for (const endpoint of verifEndpoints) {
  if (verificationRoute.includes(endpoint)) {
    pass(`verificationLimiter applied to ${endpoint.split(',')[0].trim()}`);
  } else {
    fail(`verificationLimiter should be applied to ${endpoint.split(',')[0].trim()}`);
  }
}

// ========== TEST 3: Self-Booking Prevention ==========
console.log('\n=== Test 3: Self-Booking Prevention ===\n');

const bookingService = readFile('src/services/bookingService.ts');

// Check self-booking check exists
if (bookingService.includes('You cannot book yourself as a buddy')) {
  pass('Self-booking error message present in bookingService');
} else {
  fail('Self-booking error message should be present in bookingService');
}

// Check the comparison logic
if (bookingService.includes('buddy.userId === userId')) {
  pass('Self-booking comparison (buddy.userId === userId) present');
} else {
  fail('Self-booking comparison should check buddy.userId === userId');
}

// Check it throws Conflict
const selfBookingBlock = bookingService.substring(
  bookingService.indexOf('buddy.userId === userId') - 100,
  bookingService.indexOf('buddy.userId === userId') + 200
);
if (selfBookingBlock.includes('Conflict')) {
  pass('Self-booking throws Conflict error');
} else {
  fail('Self-booking should throw Conflict error');
}

// Check it's placed AFTER buddy exists check but BEFORE membership check
const buddyExistsIdx = bookingService.indexOf("throw NotFound('Buddy not found or not available for bookings.')");
const selfBookingIdx = bookingService.indexOf('buddy.userId === userId');
const membershipIdx = bookingService.indexOf('Check buddy membership');

if (buddyExistsIdx < selfBookingIdx && selfBookingIdx < membershipIdx) {
  pass('Self-booking check is correctly placed (after buddy exists, before membership check)');
} else {
  fail('Self-booking check should be after buddy exists check and before membership check');
}

// ========== TEST 4: JWT Dev-Secret Warning ==========
console.log('\n=== Test 4: JWT Dev-Secret Warning at Startup ===\n');

const envTs = readFile('src/config/env.ts');

// Check warning is present
if (envTs.includes('[SECURITY WARNING] JWT_ACCESS_SECRET is still set to the default development value')) {
  pass('JWT_ACCESS_SECRET dev-default warning present');
} else {
  fail('JWT_ACCESS_SECRET dev-default warning should be present');
}

if (envTs.includes('[SECURITY WARNING] JWT_REFRESH_SECRET is still set to the default development value')) {
  pass('JWT_REFRESH_SECRET dev-default warning present');
} else {
  fail('JWT_REFRESH_SECRET dev-default warning should be present');
}

// Check it only fires in production
const warningBlock = envTs.substring(
  envTs.indexOf('[SECURITY WARNING]') - 200,
  envTs.indexOf('[SECURITY WARNING]') + 500
);
if (warningBlock.includes("env.NODE_ENV === 'production'")) {
  pass('JWT dev-secret warning only fires in production');
} else {
  fail('JWT dev-secret warning should only fire in production');
}

// ========== TEST 5: No Existing Security Weakened ==========
console.log('\n=== Test 5: No Existing Security Weakened ===\n');

// Verify authLimiter still exists and is unchanged
if (securityTs.includes('authLimiter')) {
  pass('authLimiter still exists (not removed)');
} else {
  fail('authLimiter should still exist');
}

// Verify apiLimiter still exists
if (securityTs.includes('apiLimiter')) {
  pass('apiLimiter still exists (not removed)');
} else {
  fail('apiLimiter should still exist');
}

// Verify helmet is still used
const appTs = readFile('src/app.ts');
if (appTs.includes('helmetMiddleware')) {
  pass('helmetMiddleware still applied in app.ts');
} else {
  fail('helmetMiddleware should still be applied');
}

// Verify CORS is still configured
if (appTs.includes('corsMiddleware')) {
  pass('corsMiddleware still applied in app.ts');
} else {
  fail('corsMiddleware should still be applied');
}

// Verify authenticate is still used on verification routes
if (verificationRoute.includes('authenticate')) {
  pass('authenticate still used on verification routes');
} else {
  fail('authenticate should still be used on verification routes');
}

// Verify telegram webhook still has secret validation
if (telegramRoute.includes('isValidWebhookSecret')) {
  pass('Telegram webhook secret validation still present');
} else {
  fail('Telegram webhook secret validation should still be present');
}

// Verify booking service still has membership check
if (bookingService.includes('checkUserMembership')) {
  pass('Booking membership check still present');
} else {
  fail('Booking membership check should still be present');
}

// Verify booking service still has overlap check
if (bookingService.includes('checkOverlap')) {
  pass('Booking overlap check still present');
} else {
  fail('Booking overlap check should still be present');
}

// ========== SUMMARY ==========
console.log('\n=== P1 SECURITY HARDENING TEST SUMMARY ===');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);
console.log(failed === 0 ? '\n  ALL TESTS PASSED\n' : `\n  ${failed} TEST(S) FAILED\n`);

process.exit(failed === 0 ? 0 : 1);
