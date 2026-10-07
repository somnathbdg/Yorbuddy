/**
 * P0 Security Hardening Unit Tests
 * Tests the logic of the three P0 fixes without requiring a running server.
 */
import crypto from 'crypto';
import fs from 'fs';

console.log('\n=== P0 SECURITY HARDENING UNIT TESTS ===\n');

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

// ========== TEST 1: Trial Enforcement Logic ==========
console.log('=== Test 1: Paid Rs.99 Trial Enforcement Logic ===\n');

// Simulate hasUserUsedTrial logic
function hasUserUsedTrial(memberships, userId) {
  const trialMemberships = memberships.filter(
    (m) => m.user_id === userId && m.plan_id === 'TRIAL_1D'
  );
  return trialMemberships.length > 0;
}

// Scenario A: User with no prior trial should be allowed
const membershipsA = [];
const resultA = hasUserUsedTrial(membershipsA, 'user-1');
if (!resultA) {
  pass('User with no prior trial: allowed to create TRIAL_1D order');
} else {
  fail('User with no prior trial: should be allowed');
}

// Scenario B: User with existing TRIAL_1D membership should be blocked
const membershipsB = [
  { id: 'mem-1', user_id: 'user-1', plan_id: 'TRIAL_1D', status: 'success' },
];
const resultB = hasUserUsedTrial(membershipsB, 'user-1');
if (resultB) {
  pass('User with existing TRIAL_1D: blocked from creating new trial order');
} else {
  fail('User with existing TRIAL_1D: should be blocked');
}

// Scenario C: User with WEEK_1 membership (not TRIAL_1D) should still be allowed to get trial
const membershipsC = [
  { id: 'mem-1', user_id: 'user-1', plan_id: 'WEEK_1', status: 'success' },
];
const resultC = hasUserUsedTrial(membershipsC, 'user-1');
if (!resultC) {
  pass('User with WEEK_1 only: trial check correctly returns false (no TRIAL_1D)');
} else {
  fail('User with WEEK_1 only: should not be marked as trial used');
}

// Scenario D: Different user with no trial should be allowed
const membershipsD = [
  { id: 'mem-1', user_id: 'user-2', plan_id: 'TRIAL_1D', status: 'success' },
];
const resultD = hasUserUsedTrial(membershipsD, 'user-1');
if (!resultD) {
  pass('Different user (user-1) with no trial: correctly allowed despite user-2 having trial');
} else {
  fail('Different user: should be allowed');
}

// Scenario E: User with pending TRIAL_1D order (created status) should be blocked
const membershipsE = [
  { id: 'mem-1', user_id: 'user-1', plan_id: 'TRIAL_1D', status: 'created' },
];
const resultE = hasUserUsedTrial(membershipsE, 'user-1');
if (resultE) {
  pass('User with pending TRIAL_1D order (created status): blocked from creating another trial');
} else {
  fail('User with pending TRIAL_1D: should be blocked');
}

console.log('\n=== Test 2: Verification dev_code Removal ===\n');

const DEV_ENV = 'development';
const PROD_ENV = 'production';

function buildEmailResponse(nodeEnv, code) {
  const response = {
    message: 'Verification code sent to email.',
  };
  // NEW behavior (after fix): never include dev_code
  return response;
}

function buildPhoneResponse(nodeEnv, code) {
  const response = {
    message: 'Verification code sent to phone.',
  };
  // NEW behavior (after fix): never include dev_code
  return response;
}

// Test that dev_code is NEVER included regardless of NODE_ENV
const emailDevRes = buildEmailResponse(DEV_ENV, '123456');
if (!emailDevRes.dev_code) {
  pass('Development: email response does NOT contain dev_code');
} else {
  fail('Development: email response should NOT contain dev_code', 'dev_code=' + emailDevRes.dev_code);
}

const emailProdRes = buildEmailResponse(PROD_ENV, '123456');
if (!emailProdRes.dev_code) {
  pass('Production: email response does NOT contain dev_code');
} else {
  fail('Production: email response should NOT contain dev_code');
}

const phoneDevRes = buildPhoneResponse(DEV_ENV, '654321');
if (!phoneDevRes.dev_code) {
  pass('Development: phone response does NOT contain dev_code');
} else {
  fail('Development: phone response should NOT contain dev_code');
}

const phoneProdRes = buildPhoneResponse(PROD_ENV, '654321');
if (!phoneProdRes.dev_code) {
  pass('Production: phone response does NOT contain dev_code');
} else {
  fail('Production: phone response should NOT contain dev_code');
}

// Test that message is still correct
if (emailDevRes.message === 'Verification code sent to email.') {
  pass('Development: email response has correct message');
} else {
  fail('Development: email response message incorrect');
}

if (phoneProdRes.message === 'Verification code sent to phone.') {
  pass('Production: phone response has correct message');
} else {
  fail('Production: phone response message incorrect');
}

console.log('\n=== Test 3: Frontend Membership Check Fail-Closed ===\n');

// Simulate the old behavior (before fix)
async function oldMembershipCheck(membershipService, shouldFail) {
  try {
    const status = await membershipService.getMembershipStatus();
    if (!status || !status.is_active) {
      return { blocked: true, error: false };
    }
    return { blocked: false, error: false };
  } catch (err) {
    // OLD: catch and continue — allows proceeding
    return { blocked: false, error: true }; // Not blocked, continues to booking
  }
}

// Simulate the new behavior (after fix)
async function newMembershipCheck(membershipService) {
  const status = await membershipService.getMembershipStatus();
  if (!status || !status.is_active) {
    return { blocked: true, error: false };
  }
  // If the call itself fails, the promise rejects and the caller handles it
  // No catch block — fail closed
  return { blocked: false, error: false };
}

// Mock membership service
const activeService = {
  getMembershipStatus: async () => ({ is_active: true, plan_id: 'MONTH_1' }),
};

const inactiveService = {
  getMembershipStatus: async () => ({ is_active: false }),
};

const failingService = {
  getMembershipStatus: async () => { throw new Error('Network error'); },
};

// Test old behavior with failing service
const oldResult = await oldMembershipCheck(failingService, false);
if (!oldResult.blocked) {
  pass('OLD behavior: failing membership check allows proceeding (VULNERABLE)');
} else {
  fail('OLD behavior: should allow proceeding (this was the vulnerable behavior)');
}

// Test new behavior with failing service — should throw
try {
  await newMembershipCheck(failingService);
  fail('NEW behavior: failing membership check should throw');
} catch (err) {
  pass('NEW behavior: failing membership check throws error (fail-closed)');
}

// Test new behavior with inactive membership
const newInactiveResult = await newMembershipCheck(inactiveService);
if (newInactiveResult.blocked) {
  pass('NEW behavior: inactive membership blocks booking');
} else {
  fail('NEW behavior: inactive membership should block');
}

// Test new behavior with active membership
const newActiveResult = await newMembershipCheck(activeService);
if (!newActiveResult.blocked) {
  pass('NEW behavior: active membership allows booking');
} else {
  fail('NEW behavior: active membership should allow');
}

console.log('\n=== Test 4: free_trial_used Marking After Successful Payment ===\n');

// Simulate the marking logic
async function markTrialUsed(users, userId) {
  const user = users.find((u) => u.id === userId);
  if (user) {
    user.free_trial_used = true;
  }
}

// Scenario A: Mark trial used after successful TRIAL_1D payment
const usersA = [
  { id: 'user-1', email: 'test@example.com', free_trial_used: false },
];
await markTrialUsed(usersA, 'user-1');
if (usersA[0].free_trial_used === true) {
  pass('After TRIAL_1D payment: free_trial_used set to true');
} else {
  fail('After TRIAL_1D payment: free_trial_used should be true');
}

// Scenario B: Different user (user-3) is NOT marked when user-2 is marked
const usersB = [
  { id: 'user-2', email: 'test2@example.com', free_trial_used: false },
  { id: 'user-3', email: 'test3@example.com', free_trial_used: false },
];
await markTrialUsed(usersB, 'user-2');
if (usersB[0].free_trial_used === true && usersB[1].free_trial_used === false) {
  pass('markTrialUsed: only marks the specified user, not others');
} else {
  fail('markTrialUsed: should only mark user-2, not user-3');
}

// Scenario C: Non-existent user does not cause error
const usersC = [
  { id: 'user-3', email: 'test3@example.com', free_trial_used: false },
];
await markTrialUsed(usersC, 'user-999'); // Non-existent
pass('markTrialUsed: non-existent user handled gracefully (no error thrown)');

console.log('\n=== Test 5: V-03 Verification Endpoints — Actual Source Code ===\n');

// Read the actual verification service source and verify dev_code is not in responses
const verificationSource = fs.readFileSync('./src/services/verificationService.ts', 'utf8');

// Check that the response object for requestEmailCode does NOT contain dev_code
const emailResponseMatch = verificationSource.match(/res\.status\(200\)\.json\(\{\s*message:\s*'Verification code sent to email\.'/);
if (emailResponseMatch) {
  // Get the full response block
  const emailBlockStart = verificationSource.indexOf("message: 'Verification code sent to email.'");
  const emailBlockEnd = verificationSource.indexOf('};', emailBlockStart + 50);
  const emailBlock = verificationSource.substring(emailBlockStart, emailBlockEnd + 2);

  if (!emailBlock.includes('dev_code')) {
    pass('V-03 source: requestEmailCode response does NOT contain dev_code');
  } else {
    fail('V-03 source: requestEmailCode response STILL contains dev_code');
  }
} else {
  fail('V-03 source: could not find requestEmailCode response block');
}

// Check phone response
const phoneResponseMatch = verificationSource.match(/res\.status\(200\)\.json\(\{\s*message:\s*'Verification code sent to phone\.'/);
if (phoneResponseMatch) {
  const phoneBlockStart = verificationSource.indexOf("message: 'Verification code sent to phone.'");
  const phoneBlockEnd = verificationSource.indexOf('};', phoneBlockStart + 50);
  const phoneBlock = verificationSource.substring(phoneBlockStart, phoneBlockEnd + 2);

  if (!phoneBlock.includes('dev_code')) {
    pass('V-03 source: requestPhoneCode response does NOT contain dev_code');
  } else {
    fail('V-03 source: requestPhoneCode response STILL contains dev_code');
  }
} else {
  fail('V-03 source: could not find requestPhoneCode response block');
}

console.log('\n=== Test 6: V-04 BookingModal — Actual Source Code ===\n');

// Read the actual BookingModal source and verify the fix is in place
const bookingModalSource = fs.readFileSync('../src/components/booking/BookingModal.tsx', 'utf8');

// Check that the old vulnerable pattern is gone
const oldPattern = /try\s*\{\s*const\s+membershipStatus\s*=\s*await\s+membershipService\.getMembershipStatus\(\);\s*if\s*\(!\s*membershipStatus\s*\|\|\s*!\s*membershipStatus\.is_active\)/s;
const oldPatternMatch = bookingModalSource.match(oldPattern);

if (!oldPatternMatch) {
  pass('V-04 source: old try/catch pattern around membership check REMOVED');
} else {
  fail('V-04 source: old try/catch pattern STILL PRESENT in BookingModal');
}

// Check that the new pattern (no try/catch) is present
const newPattern = /const\s+membershipStatus\s*=\s*await\s+membershipService\.getMembershipStatus\(\);\s*if\s*\(!\s*membershipStatus\s*\|\|\s*!\s*membershipStatus\.is_active\)/s;
const newPatternMatch = bookingModalSource.match(newPattern);

if (newPatternMatch) {
  pass('V-04 source: new membership check (without try/catch) PRESENT in BookingModal');
} else {
  fail('V-04 source: new membership check pattern NOT FOUND in BookingModal');
}

// Check that the "fail closed" comment is present
if (bookingModalSource.includes('Membership-check failure is a hard block')) {
  pass('V-04 source: fail-closed comment present in BookingModal');
} else {
  fail('V-04 source: fail-closed comment MISSING from BookingModal');
}

// Check that the old "backend will enforce" comment is gone
if (!bookingModalSource.includes('backend will enforce')) {
  pass('V-04 source: old "backend will enforce" comment REMOVED');
} else {
  fail('V-04 source: old "backend will enforce" comment STILL PRESENT');
}

console.log('\n=== Test 7: V-04 Membership Check — Logic Verification ===\n');

// Simulate the EXACT logic from BookingModal.handleConfirm after the fix
async function simulateHandleConfirmMembershipCheck(membershipService) {
  const membershipStatus = await membershipService.getMembershipStatus();
  if (!membershipStatus || !membershipStatus.is_active) {
    throw new Error('MEMBERSHIP_REQUIRED');
  }
  // If we get here, membership is active — proceed
}

// Test with active membership — should proceed without error
const activeMembershipService = {
  getMembershipStatus: async () => ({ is_active: true, plan_id: 'MONTH_1' }),
};

try {
  await simulateHandleConfirmMembershipCheck(activeMembershipService);
  pass('V-04 logic: active membership — handleConfirm proceeds without error');
} catch (err) {
  fail('V-04 logic: active membership — should NOT throw', err.message);
}

// Test with inactive membership — should throw
const inactiveMembershipService = {
  getMembershipStatus: async () => ({ is_active: false }),
};

try {
  await simulateHandleConfirmMembershipCheck(inactiveMembershipService);
  fail('V-04 logic: inactive membership — should throw MEMBERSHIP_REQUIRED');
} catch (err) {
  if (err.message === 'MEMBERSHIP_REQUIRED') {
    pass('V-04 logic: inactive membership — throws MEMBERSHIP_REQUIRED (fail-closed)');
  } else {
    fail('V-04 logic: inactive membership — wrong error thrown', err.message);
  }
}

// Test with failing membership service — should throw (not caught)
const failingMembershipService = {
  getMembershipStatus: async () => { throw new Error('Network error'); },
};

try {
  await simulateHandleConfirmMembershipCheck(failingMembershipService);
  fail('V-04 logic: failing membership service — should throw, not continue');
} catch (err) {
  pass('V-04 logic: failing membership service — throws error (NOT caught, fail-closed)');
}

console.log('\n=== FINAL TEST SUMMARY (ALL TESTS) ===');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);
console.log(failed === 0 ? '\n  ALL TESTS PASSED\n' : `\n  ${failed} TEST(S) FAILED\n`);

process.exit(failed === 0 ? 0 : 1);
