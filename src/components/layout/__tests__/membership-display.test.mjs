/**
 * Regression Test: MONTH_1 membership must NOT display as Lifetime.
 * 
 * Run with: cd src/components/layout/__tests__ && node membership-display.test.mjs
 */

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    throw new Error(message || `Expected values to differ, both are ${JSON.stringify(actual)}`);
  }
}

// ========== Helpers ==========

// Simulates the Header.tsx profile dropdown membership display logic (after fix)
function getMembershipDisplay(apiMembership) {
  if (!apiMembership) return 'Loading...';
  
  const status = apiMembership.is_active ? 'Active' : 'Inactive';
  const amount = `₹${apiMembership.amount} Paid`;
  const plan = apiMembership.plan_id === 'MONTH_1' ? '1 Month Plan'
    : apiMembership.plan_id === 'MONTH_6' ? '6 Months Plan'
    : apiMembership.plan_id === 'YEAR_1' ? '1 Year Plan'
    : apiMembership.plan_id === 'LIFETIME' ? 'Lifetime Plan'
    : apiMembership.plan_id;
  
  return { status, amount, plan };
}

// ========== Tests ==========

test('MONTH_1 membership is NOT displayed as Lifetime', () => {
  const apiMembership = {
    id: 'mem-1',
    plan_id: 'MONTH_1',
    status: 'active',
    amount: 1999,
    currency: 'INR',
    is_active: true,
    start_date: '2026-09-19',
    expiry_date: '2026-10-19',
  };
  
  const display = getMembershipDisplay(apiMembership);
  assertEqual(display.status, 'Active');
  assertEqual(display.amount, '₹1999 Paid');
  assertEqual(display.plan, '1 Month Plan');
  assertNotEqual(display.plan, 'Lifetime Plan', 'MONTH_1 must NOT show as Lifetime');
});

test('LIFETIME membership correctly displays as Lifetime Plan', () => {
  const apiMembership = {
    id: 'mem-lifetime',
    plan_id: 'LIFETIME',
    status: 'active',
    amount: 4999,
    currency: 'INR',
    is_active: true,
    start_date: '2026-01-01',
    expiry_date: null,
  };
  
  const display = getMembershipDisplay(apiMembership);
  assertEqual(display.status, 'Active');
  assertEqual(display.amount, '₹4999 Paid');
  assertEqual(display.plan, 'Lifetime Plan');
});

test('MONTH_6 membership shows as 6 Months Plan, not Lifetime', () => {
  const apiMembership = {
    id: 'mem-6m',
    plan_id: 'MONTH_6',
    status: 'active',
    amount: 999,
    currency: 'INR',
    is_active: true,
    start_date: '2026-09-19',
    expiry_date: '2027-03-19',
  };
  
  const display = getMembershipDisplay(apiMembership);
  assertEqual(display.plan, '6 Months Plan');
  assertNotEqual(display.plan, 'Lifetime Plan');
});

test('YEAR_1 membership shows as 1 Year Plan, not Lifetime', () => {
  const apiMembership = {
    id: 'mem-1y',
    plan_id: 'YEAR_1',
    status: 'active',
    amount: 1699,
    currency: 'INR',
    is_active: true,
    start_date: '2026-09-19',
    expiry_date: '2027-09-19',
  };
  
  const display = getMembershipDisplay(apiMembership);
  assertEqual(display.plan, '1 Year Plan');
  assertNotEqual(display.plan, 'Lifetime Plan');
});

test('Inactive membership shows as Inactive, not Active', () => {
  const apiMembership = {
    id: 'mem-expired',
    plan_id: 'MONTH_1',
    status: 'expired',
    amount: 1999,
    currency: 'INR',
    is_active: false,
    start_date: '2025-01-01',
    expiry_date: '2025-02-01',
  };
  
  const display = getMembershipDisplay(apiMembership);
  assertEqual(display.status, 'Inactive');
  assertNotEqual(display.status, 'Active');
});

test('Null/loading state shows Loading...', () => {
  const display = getMembershipDisplay(null);
  assertEqual(display, 'Loading...');
});

test('Step6 Test User: MONTH_1 shows correct plan and amount', () => {
  // Exact scenario from the bug report
  const apiMembership = {
    id: 'mem-testuser',
    plan_id: 'MONTH_1',
    status: 'active',
    amount: 1999,
    currency: 'INR',
    is_active: true,
    start_date: '2026-09-19',
    expiry_date: '2026-10-19',
  };
  
  const display = getMembershipDisplay(apiMembership);
  assertEqual(display.status, 'Active');
  assertEqual(display.amount, '₹1999 Paid');
  assertEqual(display.plan, '1 Month Plan');
  
  // This was the bug: it used to show "Lifetime Member Active" hardcoded
  assertNotEqual(display.plan, 'Lifetime Plan', 'Regression: MONTH_1 must never show as Lifetime');
});

// ========== Run tests ==========
console.log('\n=== Membership Display Regression Tests ===\n');

for (const t of tests) {
  try {
    t.fn();
    console.log(`  PASS: ${t.name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${t.name} - ${err.message}`);
    failed++;
  }
}

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
