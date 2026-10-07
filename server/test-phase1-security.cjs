/**
 * Phase 1 Security Regression Tests
 * 
 * These tests verify that critical security fixes are in place.
 * Run with: node server/test-phase1-security.cjs
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.log(`  FAIL: ${message}`);
    failed++;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

console.log('\n=== Phase 1 Security Regression Tests ===\n');

// Test 1: Mock Data Removal
console.log('1. Mock Data Removal');
const appContext = readFile('src/context/AppContext.tsx');
assert(
  !appContext.includes('INITIAL_USERS'),
  'AppContext does not import INITIAL_USERS'
);
assert(
  !appContext.includes('INITIAL_BUDDY_PROFILES'),
  'AppContext does not import INITIAL_BUDDY_PROFILES'
);
assert(
  !appContext.includes('INITIAL_BOOKINGS'),
  'AppContext does not import INITIAL_BOOKINGS'
);
assert(
  !appContext.includes('INITIAL_PAYMENTS'),
  'AppContext does not import INITIAL_PAYMENTS'
);
assert(
  !appContext.includes('INITIAL_MEMBERSHIP'),
  'AppContext does not import INITIAL_MEMBERSHIP'
);
assert(
  !appContext.includes('INITIAL_VERIFICATIONS'),
  'AppContext does not import INITIAL_VERIFICATIONS'
);
assert(
  !appContext.includes('INITIAL_REPORTS'),
  'AppContext does not import INITIAL_REPORTS'
);
assert(
  appContext.includes('useState<Booking[]>([])'),
  'Bookings initialized as empty array'
);
assert(
  appContext.includes('useState<FullBuddyData[]>([])'),
  'Buddies initialized as empty array'
);

// Test 2: Admin Authorization
console.log('\n2. Admin Authorization');
const authGuard = readFile('src/components/auth/AuthGuard.tsx');
assert(
  authGuard.includes('getRoleFromToken'),
  'AuthGuard extracts role from JWT token'
);
assert(
  authGuard.includes('atob(token.split'),
  'AuthGuard decodes JWT payload'
);
assert(
  !authGuard.includes('currentUser.role !== \'admin\''),
  'AuthGuard does not rely on currentUser.role for admin check'
);

const header = readFile('src/components/layout/Header.tsx');
assert(
  !header.includes('Preview Role'),
  'Header does not have Preview Role switcher'
);
assert(
  !header.includes('role-btn-user'),
  'Header does not have User View button'
);
assert(
  !header.includes('role-btn-buddy'),
  'Header does not have Buddy Mode button'
);
assert(
  header.includes('currentUser.role === \'admin\''),
  'Header only shows admin button for admin users'
);

// Test 3: Verification Security
console.log('\n3. Verification Security');
const verificationService = readFile('server/src/services/verificationService.ts');
assert(
  !verificationService.includes('dev_code'),
  'No dev_code in API responses'
);
assert(
  verificationService.includes('verification_codes'),
  'Uses database-backed verification_codes table'
);
assert(
  verificationService.includes('hashCode'),
  'Codes are hashed before storage'
);
assert(
  verificationService.includes('used_at'),
  'Codes have one-time-use tracking'
);
assert(
  verificationService.includes('expires_at'),
  'Codes have expiration'
);
assert(
  !verificationService.includes('const verificationCodes = new Map'),
  'Does not use in-memory Map for codes'
);

// Test 4: Seed Data
console.log('\n4. Seed Data');
const seedScript = readFile('server/src/scripts/seed-buddies.ts');
assert(
  seedScript.includes('is_verified: false'),
  'Seed buddies have is_verified: false'
);
assert(
  seedScript.includes('verification_status: \'pending\''),
  'Seed buddies have verification_status: pending'
);
assert(
  !seedScript.includes('is_verified: true'),
  'Seed script does not set is_verified: true'
);

// Test 5: Sensitive Logging
console.log('\n5. Sensitive Logging');
const paymentService = readFile('server/src/services/paymentService.ts');
assert(
  !paymentService.includes('[VERIFY DEBUG]'),
  'No debug logging in payment verification'
);
assert(
  !paymentService.includes('console.log'),
  'No console.log in payment service'
);

// Test 6: Webhook Security
console.log('\n6. Webhook Security');
assert(
  paymentService.includes('RAZORPAY_WEBHOOK_SECRET not configured'),
  'Webhook rejects when secret not configured'
);
assert(
  paymentService.includes('Webhook not configured'),
  'Webhook returns error when not configured'
);
assert(
  !paymentService.includes('skipping verification'),
  'Webhook does not skip verification'
);

// Test 7: Old Pricing Removal
console.log('\n7. Old Pricing Removal');
const initialData = readFile('src/data/initialData.ts');
assert(
  !initialData.includes('amount: 499'),
  'No ₹499 membership amount in mock data'
);
assert(
  !initialData.includes('one_time_lifetime'),
  'No one_time_lifetime membership type'
);
assert(
  !initialData.includes('INITIAL_PAYMENTS'),
  'INITIAL_PAYMENTS mock data removed from initialData'
);
assert(
  !initialData.includes('INITIAL_MEMBERSHIP'),
  'INITIAL_MEMBERSHIP mock data removed from initialData'
);
assert(
  !initialData.includes('INITIAL_USERS'),
  'INITIAL_USERS mock data removed from initialData'
);
assert(
  !initialData.includes('INITIAL_PROFILES'),
  'INITIAL_PROFILES mock data removed from initialData'
);
assert(
  !initialData.includes('INITIAL_BUDDY_PROFILES'),
  'INITIAL_BUDDY_PROFILES mock data removed from initialData'
);
assert(
  !initialData.includes('INITIAL_BOOKINGS'),
  'INITIAL_BOOKINGS mock data removed from initialData'
);
assert(
  !initialData.includes('INITIAL_REVIEWS'),
  'INITIAL_REVIEWS mock data removed from initialData'
);
assert(
  !initialData.includes('INITIAL_VERIFICATIONS'),
  'INITIAL_VERIFICATIONS mock data removed from initialData'
);
assert(
  !initialData.includes('INITIAL_REPORTS'),
  'INITIAL_REPORTS mock data removed from initialData'
);

// Test 8: Verification Codes Migration
console.log('\n8. Verification Codes Migration');
const migration = readFile('server/src/db/migrations/008_verification_codes.sql');
assert(
  migration.includes('CREATE TABLE IF NOT EXISTS verification_codes'),
  'Migration creates verification_codes table'
);
assert(
  migration.includes('code_hash'),
  'Migration has code_hash column'
);
assert(
  migration.includes('expires_at'),
  'Migration has expires_at column'
);
assert(
  migration.includes('used_at'),
  'Migration has used_at column'
);

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  console.log('\nSome tests FAILED. Please review the failures above.');
  process.exit(1);
} else {
  console.log('\nAll tests PASSED!');
  process.exit(0);
}
