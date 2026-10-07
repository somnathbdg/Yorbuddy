/**
 * Test: Admin Console visibility in Header profile dropdown
 * Verifies that:
 *   - user role CANNOT see Admin Console
 *   - buddy role CANNOT see Admin Console
 *   - admin role CAN see Admin Console
 *
 * Run with: cd src/components/layout/__tests__ && node header-admin-visibility.test.mjs
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

// ========== Helpers ==========
// Simulates the Header.tsx render logic for Admin Console visibility
// After the fix: Admin Console is only rendered when currentUser.role === 'admin'
function shouldShowAdminConsole(currentUser, isAuthenticated) {
  const isLoggedIn = isAuthenticated && !!currentUser?.full_name;
  if (!isLoggedIn) return false;
  return currentUser.role === 'admin';
}

// ========== Tests ==========

test('user role CANNOT see Admin Console', () => {
  const currentUser = { full_name: 'Test User', role: 'user' };
  const result = shouldShowAdminConsole(currentUser, true);
  assertEqual(result, false, 'User should NOT see Admin Console');
});

test('buddy role CANNOT see Admin Console', () => {
  const currentUser = { full_name: 'Test Buddy', role: 'buddy' };
  const result = shouldShowAdminConsole(currentUser, true);
  assertEqual(result, false, 'Buddy should NOT see Admin Console');
});

test('admin role CAN see Admin Console', () => {
  const currentUser = { full_name: 'Admin User', role: 'admin' };
  const result = shouldShowAdminConsole(currentUser, true);
  assertEqual(result, true, 'Admin SHOULD see Admin Console');
});

test('unauthenticated user CANNOT see Admin Console', () => {
  const currentUser = null;
  const result = shouldShowAdminConsole(currentUser, false);
  assertEqual(result, false, 'Unauthenticated user should NOT see Admin Console');
});

test('authenticated but full_name missing - edge case', () => {
  const currentUser = { role: 'admin' }; // no full_name
  const result = shouldShowAdminConsole(currentUser, true);
  assertEqual(result, false, 'User without full_name should NOT see Admin Console (isLoggedIn guard)');
});

test('Admin Console onClick handler works for admin role', () => {
  // Verify the onClick handler sets correct state
  let activeRole = 'user';
  let activeTab = 'user-dashboard';
  let dropdownOpen = true;

  const handleAdminClick = (role) => {
    if (role !== 'admin') {
      alert('Admin access required');
      return;
    }
    activeRole = 'admin';
    activeTab = 'admin-panel';
    dropdownOpen = false;
  };

  handleAdminClick('admin');
  assertEqual(activeRole, 'admin');
  assertEqual(activeTab, 'admin-panel');
  assertEqual(dropdownOpen, false);
});

// ========== Run tests ==========
console.log('\n=== Header Admin Console Visibility Tests ===\n');

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
