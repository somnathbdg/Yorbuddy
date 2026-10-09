/**
 * Membership & Free Access Regression Tests
 *
 * Verifies:
 * 1. FREE_ACCESS_10D plan is defined with correct properties
 * 2. assignFreeAccess function exists and is exported
 * 3. Registration calls assignFreeAccess
 * 4. "Trial" word is removed from user-facing strings
 * 5. Paid plan prices are unchanged (₹99, ₹499, ₹1,999)
 * 6. One-time rule is enforced in backend
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const membershipService = fs.readFileSync(path.join(__dirname, 'src/services/membershipService.ts'), 'utf8');
const authService = fs.readFileSync(path.join(__dirname, 'src/services/authService.ts'), 'utf8');
const pricingView = fs.readFileSync(path.join(__dirname, '../src/components/pricing/PricingView.tsx'), 'utf8');
const userDashboard = fs.readFileSync(path.join(__dirname, '../src/components/dashboard/UserDashboard.tsx'), 'utf8');
const header = fs.readFileSync(path.join(__dirname, '../src/components/layout/Header.tsx'), 'utf8');
const faqSection = fs.readFileSync(path.join(__dirname, '../src/components/home/FaqSection.tsx'), 'utf8');
const appContext = fs.readFileSync(path.join(__dirname, '../src/context/AppContext.tsx'), 'utf8');
const authModal = fs.readFileSync(path.join(__dirname, '../src/components/auth/AuthModal.tsx'), 'utf8');

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

console.log('\n=== MEMBERSHIP & FREE ACCESS REGRESSION TESTS ===\n');

console.log('=== Test 1: FREE_ACCESS_10D plan is defined ===\n');
assert(membershipService.includes("FREE_ACCESS_10D"), 'FREE_ACCESS_10D plan exists in PLANS');
assert(membershipService.includes("amount: 0"), 'FREE_ACCESS_10D has amount 0 (free)');
assert(membershipService.includes("period: '10 days'"), 'FREE_ACCESS_10D has 10-day period');
assert(membershipService.includes("name: 'Free Access'"), 'FREE_ACCESS_10D is named "Free Access"');

console.log('\n=== Test 2: assignFreeAccess function exists ===\n');
assert(membershipService.includes('export async function assignFreeAccess'), 'assignFreeAccess is exported');
assert(membershipService.includes("plan_id: 'FREE_ACCESS_10D'"), 'assignFreeAccess creates FREE_ACCESS_10D membership');
assert(membershipService.includes("status: 'success'"), 'assignFreeAccess sets status to success');
assert(membershipService.includes("free_trial_used: true"), 'assignFreeAccess marks free_trial_used');

console.log('\n=== Test 3: Registration calls assignFreeAccess ===\n');
assert(authService.includes("import { assignFreeAccess }"), 'authService imports assignFreeAccess');
assert(authService.includes('await assignFreeAccess(supabase, newUser.id)'), 'register() calls assignFreeAccess');
assert(authService.includes('10-day Free Access has been activated'), 'Registration response mentions Free Access');

console.log('\n=== Test 4: "Trial" word removed from user-facing strings ===\n');
assert(!pricingView.includes("'Free Trial'"), 'PricingView does not show "Free Trial"');
assert(!userDashboard.includes("'Free Trial'"), 'UserDashboard does not show "Free Trial"');
assert(!header.includes("'Free Trial'"), 'Header does not show "Free Trial"');
assert(!faqSection.includes('₹99 trial'), 'FAQ does not mention "₹99 trial"');

console.log('\n=== Test 5: Paid plan prices unchanged ===\n');
assert(membershipService.includes('TRIAL_1D'), 'TRIAL_1D plan still exists');
assert(membershipService.includes('amount: 9900'), 'TRIAL_1D price is ₹99 (9900 paise)');
assert(membershipService.includes('WEEK_1'), 'WEEK_1 plan still exists');
assert(membershipService.includes('amount: 49900'), 'WEEK_1 price is ₹499 (49900 paise)');
assert(membershipService.includes('MONTH_1'), 'MONTH_1 plan still exists');
assert(membershipService.includes('amount: 199900'), 'MONTH_1 price is ₹1,999 (199900 paise)');

console.log('\n=== Test 6: One-time rule enforced in backend ===\n');
assert(membershipService.includes("hasUserUsedTrial"), 'hasUserUsedTrial function exists');
assert(membershipService.includes(".in('plan_id', ['TRIAL_1D', 'FREE_ACCESS_10D'])"), 'hasUserUsedTrial checks both TRIAL_1D and FREE_ACCESS_10D');
assert(membershipService.includes("free_trial_used: true"), 'free_trial_used flag is set');

console.log('\n=== Test 7: Frontend shows "Free Access" ===\n');
assert(pricingView.includes("'Free Access'"), 'PricingView shows "Free Access"');
assert(pricingView.includes("'₹0'"), 'PricingView shows ₹0 for free plan');
assert(pricingView.includes("'for 10 days'"), 'PricingView shows "for 10 days"');
assert(userDashboard.includes("'Free Access'"), 'UserDashboard shows "Free Access"');
assert(header.includes("'Free Access'"), 'Header shows "Free Access"');

console.log('\n=== Test 8: handleFreeAccess uses backend as authority ===\n');
assert(pricingView.includes('await fetchApiMembership()'), 'handleFreeAccess calls fetchApiMembership');
assert(pricingView.includes('apiMembership?.is_active'), 'handleFreeAccess checks is_active from backend');
assert(pricingView.includes("apiMembership.plan_id === 'FREE_ACCESS_10D'"), 'handleFreeAccess checks plan_id from backend');

console.log('\n=== Test 9: AppContext defaults to WEEK_1 (not TRIAL_1D) ===\n');
assert(appContext.includes("pendingMembershipPlan ?? 'WEEK_1'"), 'AppContext defaults to WEEK_1');
assert(!appContext.includes("pendingMembershipPlan ?? 'TRIAL_1D'"), 'AppContext does not default to TRIAL_1D');

console.log('\n=== Test 10: AuthModal supports FREE_ACCESS_10D ===\n');
assert(authModal.includes('FREE_ACCESS_10D: 0'), 'AuthModal has FREE_ACCESS_10D price (₹0)');
assert(authModal.includes("FREE_ACCESS_10D: 'Free Access'"), 'AuthModal has FREE_ACCESS_10D name');
assert(authModal.includes("pendingMembershipPlan ?? 'WEEK_1'"), 'AuthModal defaults to WEEK_1');

console.log('\n=== Test 11: PricingView shows all 4 plans ===\n');
assert(pricingView.includes("'Free Access'"), 'PricingView shows Free Access plan');
assert(pricingView.includes("'1 Day Access'"), 'PricingView shows 1 Day Access plan');
assert(pricingView.includes("'1 Week'"), 'PricingView shows 1 Week plan');
assert(pricingView.includes("'1 Month'"), 'PricingView shows 1 Month plan');

console.log('\n=== Test 12: No "Trial" in user-facing strings ===\n');
assert(!pricingView.includes("'Free Trial'"), 'PricingView does not show "Free Trial"');
assert(!userDashboard.includes("'Free Trial'"), 'UserDashboard does not show "Free Trial"');
assert(!header.includes("'Free Trial'"), 'Header does not show "Free Trial"');
assert(!faqSection.includes('₹99 trial'), 'FAQ does not mention "₹99 trial"');
assert(!authModal.includes("'Free Trial'"), 'AuthModal does not show "Free Trial"');

console.log('\n=== MEMBERSHIP TEST SUMMARY ===');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);
console.log('');
if (failed === 0) {
  console.log('  ALL TESTS PASSED');
} else {
  console.log('  SOME TESTS FAILED');
  process.exit(1);
}
