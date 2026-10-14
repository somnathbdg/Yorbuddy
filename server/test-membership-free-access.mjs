/**
 * Membership & Free Access Regression Tests
 *
 * Verifies the corrected membership rules:
 * 1. FREE_ACCESS_10D plan is defined with correct properties (Rs.0 / 10 days)
 * 2. assignFreeAccess exists and is called on BOTH registration paths
 *    (password AND Google OAuth)
 * 3. One-free-access-per-user is enforced server-side and at the DB level
 * 4. "Trial" never appears in a customer-facing message
 * 5. Paid plan prices are unchanged (Rs.99 / Rs.499 / Rs.1,999)
 * 6. NO paid plan is gated on prior free access or prior purchases
 * 7. Frontend price/duration literals match the authoritative backend PLANS
 * 8. Migration 014 provides a partial unique guard scoped to FREE_ACCESS_10D
 *
 * These are STATIC (source-inspection) assertions: they run without a server,
 * a database, or Razorpay credentials. Runtime/API assertions live in the
 * sibling script (test-membership-eligibility.mjs).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

const membershipService = read('src/services/membershipService.ts');
const authService = read('src/services/authService.ts');
const googleAuthService = read('src/services/googleAuthService.ts');
const membershipMiddleware = read('src/middleware/membership.ts');
const migration014 = read('src/db/migrations/014_one_free_access_per_user.sql');

const pricingView = read('../src/components/pricing/PricingView.tsx');
const userDashboard = read('../src/components/dashboard/UserDashboard.tsx');
const header = read('../src/components/layout/Header.tsx');
const faqSection = read('../src/components/home/FaqSection.tsx');
const appContext = read('../src/context/AppContext.tsx');
const authModal = read('../src/components/auth/AuthModal.tsx');

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

// ---------------------------------------------------------------------------
console.log('=== Test 1: FREE_ACCESS_10D plan is defined correctly ===\n');
assert(membershipService.includes('FREE_ACCESS_10D'), 'FREE_ACCESS_10D plan exists in PLANS');
assert(membershipService.includes('amount: 0'), 'FREE_ACCESS_10D has amount 0 (free)');
assert(membershipService.includes("period: '10 days'"), 'FREE_ACCESS_10D has 10-day period');
assert(membershipService.includes("name: 'Free Access'"), 'FREE_ACCESS_10D is named "Free Access"');
assert(
  membershipService.includes("plan_id: z.enum(['TRIAL_1D', 'WEEK_1', 'MONTH_1'])"),
  'FREE_ACCESS_10D is NOT purchasable (excluded from createOrderSchema)'
);

// ---------------------------------------------------------------------------
console.log('\n=== Test 2: assignFreeAccess is granted on BOTH registration paths ===\n');
assert(membershipService.includes('export async function assignFreeAccess'), 'assignFreeAccess is exported');
assert(membershipService.includes("plan_id: 'FREE_ACCESS_10D'"), 'assignFreeAccess creates FREE_ACCESS_10D');
assert(membershipService.includes("status: 'success'"), 'assignFreeAccess sets status to success');
assert(
  authService.includes('import { assignFreeAccess }') &&
    authService.includes('await assignFreeAccess(supabase, newUser.id)'),
  'password registration calls assignFreeAccess'
);
assert(
  googleAuthService.includes('import { assignFreeAccess }') &&
    googleAuthService.includes('await assignFreeAccess(getSupabase(), user.id)'),
  'Google OAuth registration calls assignFreeAccess (was missing before the fix)'
);
assert(
  /if \(isNewUser\) \{\s*\r?\n\s*await assignFreeAccess/.test(googleAuthService),
  'OAuth grant is scoped to isNewUser only (linked accounts are not re-granted)'
);
assert(
  authService.includes('10-day Free Access has been activated'),
  'registration response mentions Free Access'
);

// ---------------------------------------------------------------------------
console.log('\n=== Test 3: One free-access grant per user, enforced server-side ===\n');
assert(
  membershipService.includes(".eq('plan_id', 'FREE_ACCESS_10D')"),
  'assignFreeAccess checks for an existing FREE_ACCESS_10D row first'
);
assert(
  membershipService.includes("if (error.code === '23505') return;"),
  'assignFreeAccess treats a unique violation as the intended outcome'
);
assert(
  !membershipService.includes('hasUserUsedTrial'),
  'the buggy hasUserUsedTrial helper is GONE (cannot be reintroduced accidentally)'
);
assert(
  !/plan_id === 'TRIAL_1D'[\s\S]{0,200}free_trial_used/.test(membershipService),
  'a successful TRIAL_1D payment no longer sets free_trial_used'
);

// ---------------------------------------------------------------------------
console.log('\n=== Test 4: NO paid plan is gated (the reported production bug) ===\n');
assert(
  !membershipService.includes('already used your 1-day trial'),
  'the production error message is REMOVED from the backend'
);
assert(
  !/if \(input\.plan_id === 'TRIAL_1D'\)/.test(membershipService),
  'the TRIAL_1D eligibility gate is REMOVED from createMembershipOrder'
);
assert(
  !/plan_id', \['TRIAL_1D', 'FREE_ACCESS_10D'\]/.test(membershipService),
  'TRIAL_1D is no longer treated as a one-time offer alongside FREE_ACCESS_10D'
);
assert(
  !/input\.plan_id === 'WEEK_1'|input\.plan_id === 'MONTH_1'/.test(membershipService),
  'WEEK_1 and MONTH_1 have no eligibility gate either'
);

// ---------------------------------------------------------------------------
console.log('\n=== Test 5: "Trial" never appears in a customer-facing message ===\n');
assert(!pricingView.includes("'Free Trial'"), 'PricingView does not show "Free Trial"');
assert(!userDashboard.includes("'Free Trial'"), 'UserDashboard does not show "Free Trial"');
assert(!header.includes("'Free Trial'"), 'Header does not show "Free Trial"');
assert(!authModal.includes("'Free Trial'"), 'AuthModal does not show "Free Trial"');
assert(
  !faqSection.includes('₹99 trial') && !/₹99\s*trial/i.test(faqSection),
  'FAQ does not mention "Rs.99 trial"'
);
// Any remaining "trial" tokens must be identifiers only (TRIAL_1D / free_trial_used)
const trialTokens = [];
for (const [name, src] of [
  ['membershipService', membershipService],
  ['pricingView', pricingView],
  ['authModal', authModal],
  ['appContext', appContext],
  ['userDashboard', userDashboard],
  ['header', header],
]) {
  const re = /trial/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const ctx = src.slice(Math.max(0, m.index - 12), m.index + 14).replace(/\s+/g, ' ');
    if (!/TRIAL_1D|FREE_TRIAL|free_trial_used|handleTrialPayment|trialPlan|apiPlanId/.test(ctx)) {
      trialTokens.push(`${name}: ...${ctx}...`);
    }
  }
}
assert(
  trialTokens.length === 0,
  `no bare "trial" token in customer-facing code (found: ${trialTokens.length})`
);
if (trialTokens.length) trialTokens.forEach((t) => console.log(`         ${t}`));

// ---------------------------------------------------------------------------
console.log('\n=== Test 6: Paid plan prices are unchanged ===\n');
assert(membershipService.includes('TRIAL_1D'), 'TRIAL_1D plan still exists');
assert(membershipService.includes('amount: 9900'), 'TRIAL_1D price is Rs.99 (9900 paise)');
assert(membershipService.includes('WEEK_1'), 'WEEK_1 plan still exists');
assert(membershipService.includes('amount: 49900'), 'WEEK_1 price is Rs.499 (49900 paise)');
assert(membershipService.includes('MONTH_1'), 'MONTH_1 plan still exists');
assert(membershipService.includes('amount: 199900'), 'MONTH_1 price is Rs.1,999 (199900 paise)');
assert(
  membershipService.includes("name: '1 Day Access'"),
  'TRIAL_1D is named "1 Day Access" (never "trial")'
);

// ---------------------------------------------------------------------------
console.log('\n=== Test 7: Frontend price/duration literals match backend PLANS ===\n');
const BACKEND = {
  FREE_ACCESS_10D: { paise: 0 },
  TRIAL_1D: { paise: 9900 },
  WEEK_1: { paise: 49900 },
  MONTH_1: { paise: 199900 },
};
for (const [planId, v] of Object.entries(BACKEND)) {
  assert(
    new RegExp(`${planId}:\\s*\\{[^}]*amount:\\s*${v.paise}\\b`).test(membershipService),
    `backend PLANS.${planId} amount == ${v.paise} paise`
  );
}
assert(pricingView.includes("price: '₹0'") && pricingView.includes("period: 'for 10 days'"), 'PricingView Free Access = Rs.0 / 10 days');
assert(pricingView.includes("price: '₹99'") && pricingView.includes("period: 'for 1 day'"), 'PricingView 1 Day Access = Rs.99 / 1 day');
assert(pricingView.includes("price: '₹499'") && pricingView.includes("period: 'for 7 days'"), 'PricingView 1 Week = Rs.499 / 7 days');
assert(pricingView.includes("price: '₹1,999'") && pricingView.includes("period: 'for 30 days'"), 'PricingView 1 Month = Rs.1,999 / 30 days');
assert(authModal.includes('TRIAL_1D: 99'), 'AuthModal TRIAL_1D = 99');
assert(authModal.includes('WEEK_1: 499'), 'AuthModal WEEK_1 = 499');
assert(authModal.includes('MONTH_1: 1999'), 'AuthModal MONTH_1 = 1999');
assert(authModal.includes('FREE_ACCESS_10D: 0'), 'AuthModal FREE_ACCESS_10D = 0');
assert(appContext.includes("pendingMembershipPlan ?? 'WEEK_1'"), 'AppContext defaults to WEEK_1');
assert(!appContext.includes("pendingMembershipPlan ?? 'TRIAL_1D'"), 'AppContext does not default to TRIAL_1D');

// ---------------------------------------------------------------------------
console.log('\n=== Test 8: Migration 014 provides a scoped DB-level guard ===\n');
assert(
  /CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_one_free_access/.test(migration014),
  'migration 014 creates idx_memberships_one_free_access'
);
assert(
  /ON memberships \(user_id\)/.test(migration014),
  'the index is on memberships(user_id)'
);
assert(
  /WHERE plan_id = 'FREE_ACCESS_10D'/.test(migration014),
  'the index is PARTIAL — scoped to FREE_ACCESS_10D only'
);
assert(
  !/ON memberships \(user_id, plan_id\)/.test(migration014),
  'the index is NOT a blanket UNIQUE(user_id, plan_id) (which would break repeat purchases)'
);
assert(
  !/\bDELETE\b|\bDROP\b|\bTRUNCATE\b/i.test(migration014.replace(/--.*$/gm, '')),
  'migration 014 contains no destructive statement'
);

// ---------------------------------------------------------------------------
console.log('\n=== Test 9: requireMembership still accepts active Free Access ===\n');
assert(
  membershipMiddleware.includes('checkUserMembership'),
  'requireMembership still delegates to checkUserMembership'
);
assert(
  /if \(!m\.membership_expiry_date\)[\s\S]{0,160}isActive = true/.test(membershipService),
  'lifetime/never-expiring memberships are still treated as active'
);
assert(
  /new Date\(m\.membership_expiry_date\) > new Date\(\)/.test(membershipService),
  'expiry comparison unchanged'
);
assert(
  membershipMiddleware.includes("req.user.role === 'admin'"),
  'admin bypass preserved'
);

// ---------------------------------------------------------------------------
console.log('\n=== Test 10: Frontend shows "Free Access" and all 4 plans ===\n');
assert(pricingView.includes("'Free Access'"), 'PricingView shows "Free Access"');
assert(pricingView.includes("'1 Day Access'"), 'PricingView shows "1 Day Access"');
assert(pricingView.includes("'1 Week'"), 'PricingView shows "1 Week"');
assert(pricingView.includes("'1 Month'"), 'PricingView shows "1 Month"');
assert(pricingView.includes('await fetchApiMembership()'), 'handleFreeAccess calls fetchApiMembership');
assert(pricingView.includes('apiMembership?.is_active'), 'frontend gates on is_active from the backend');
assert(userDashboard.includes("'Free Access'"), 'UserDashboard shows "Free Access"');
assert(header.includes("'Free Access'"), 'Header shows "Free Access"');

// ---------------------------------------------------------------------------
console.log('\n=== Test 11: Avatar photo_url handling ===\n');

// New user with picture: photo_url saved from Google
assert(
  googleAuthService.includes('photo_url: googleUser.picture || null'),
  'new user insert includes photo_url from Google'
);

// New user without picture: photo_url is null (fallback avatar)
assert(
  /photo_url:\s*googleUser\.picture\s*\|\|\s*null/.test(googleAuthService),
  'new user without picture gets null photo_url (fallback avatar works)'
);

// Existing user linking Google: only updates photo_url when picture exists
assert(
  googleAuthService.includes('...(googleUser.picture ? { photo_url: googleUser.picture } : {})'),
  'link existing user: photo_url only updated when Google returns a picture'
);

// Existing user login: refreshes photo_url when Google returns new picture
assert(
  /if\s*\(googleUser\.picture\s*&&\s*existingByGoogleId\.photo_url\s*!==\s*googleUser\.picture\)/.test(googleAuthService),
  'login refresh: photo_url updated when Google picture differs'
);

// Existing user login: preserves photo_url when Google returns no picture
assert(
  /if\s*\(googleUser\.picture\s*&&/.test(googleAuthService),
  'login refresh: photo_url preserved when Google returns no picture'
);

// OAuth callback response includes photo_url
assert(
  /photo_url:\s*user\.photo_url\s*\|\|\s*null/.test(googleAuthService),
  'OAuth callback response includes photo_url'
);

// sanitizeUser includes photo_url
assert(
  authService.includes('photo_url: user.photo_url || null'),
  'sanitizeUser includes photo_url'
);

// Two different users: photo_url is per-user (no shared state)
assert(
  !googleAuthService.includes('photo_url: "https://'),
  'no hardcoded photo URL in googleAuthService'
);
assert(
  !googleAuthService.includes("photo_url: 'https://"),
  'no hardcoded photo URL in googleAuthService (single quotes)'
);

// Frontend fallback avatar exists
const photoUtil = read('../src/utils/photo.ts');
assert(
  photoUtil.includes('FALLBACK_AVATAR'),
  'frontend has fallback avatar for users without photo'
);
assert(
  photoUtil.includes('export function getPhotoUrl'),
  'frontend getPhotoUrl helper exists'
);

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
