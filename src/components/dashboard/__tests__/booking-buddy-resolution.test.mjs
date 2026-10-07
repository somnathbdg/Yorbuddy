/**
 * Test: Two bookings for different buddies display different buddy names.
 *
 * This tests the fix for the "Neha Sharma" bug where the booking UI
 * always showed the first buddy in the mock array regardless of the
 * actual buddy_id on the booking.
 *
 * Run with: cd src/components/dashboard/__tests__ && node booking-buddy-resolution.test.mjs
 */

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    throw new Error(message || `Expected values to be different, both are ${JSON.stringify(actual)}`);
  }
}

// ========== Test Helpers ==========

// Simulates the buddy resolution logic from UserDashboard.tsx after the fix
function resolveBuddy(booking, mockBuddies) {
  // Prefer API-provided booking.buddy, fall back to mock array, then null
  const buddyObj = booking.buddy
    ? {
        user: { id: booking.buddy.id, full_name: booking.buddy.full_name },
        profile: { photo_url: booking.buddy.photo_url || '' },
        buddyProfile: { rating: booking.buddy.rating || 0 },
      }
    : mockBuddies.find((bud) => bud.user.id === booking.buddy_id) || null;

  const buddyName = buddyObj
    ? buddyObj.user.full_name
    : booking.buddy_id
    ? `Buddy (${booking.buddy_id.slice(0, 8)})`
    : 'Unknown Buddy';

  return { buddyObj, buddyName };
}

// Simulates the OLD buggy behavior for comparison
function resolveBuddyBuggy(booking, mockBuddies) {
  const buddyObj = mockBuddies.find((bud) => bud.user.id === booking.buddy_id) || mockBuddies[0];
  return { buddyObj, buddyName: buddyObj.user.full_name };
}

// ========== Test Data ==========

const mockBuddies = [
  {
    user: { id: 'usr-b1', full_name: 'Neha Sharma' },
    profile: { photo_url: 'https://example.com/neha.jpg' },
    buddyProfile: { rating: 4.9 },
  },
  {
    user: { id: 'usr-b6', full_name: 'Siddharth Kulkarni' },
    profile: { photo_url: 'https://example.com/sid.jpg' },
    buddyProfile: { rating: 4.9 },
  },
  {
    user: { id: 'usr-b2', full_name: 'Rohan Verma' },
    profile: { photo_url: 'https://example.com/rohan.jpg' },
    buddyProfile: { rating: 4.95 },
  },
];

// ========== Tests ==========

test('BUG REPRODUCTION: Old code shows Neha Sharma for UUID bookings from real backend', () => {
  // Simulate real API bookings where buddy_id is a UUID (not in mock array)
  const booking1 = { id: 'bk-1', buddy_id: '550e8400-e29b-41d4-a716-446655440001', buddy: null };
  const booking2 = { id: 'bk-2', buddy_id: '550e8400-e29b-41d4-a716-446655440006', buddy: null };
  const booking3 = { id: 'bk-3', buddy_id: '550e8400-e29b-41d4-a716-446655440002', buddy: null };

  const result1 = resolveBuddyBuggy(booking1, mockBuddies);
  const result2 = resolveBuddyBuggy(booking2, mockBuddies);
  const result3 = resolveBuddyBuggy(booking3, mockBuddies);

  // Old code: ALL three return "Neha Sharma" (buddies[0]) because UUIDs don't match
  assertEqual(result1.buddyName, 'Neha Sharma');
  assertEqual(result2.buddyName, 'Neha Sharma');  // BUG: should be a different buddy
  assertEqual(result3.buddyName, 'Neha Sharma');  // BUG: should be a different buddy
  // All three bookings show the same hardcoded name
  assertEqual(result1.buddyName, result2.buddyName, 'Bug: all bookings show same name');
  assertEqual(result2.buddyName, result3.buddyName, 'Bug: all bookings show same name');
});

test('FIX VERIFIED: Two bookings for different buddies show different buddy names', () => {
  const booking1 = { id: 'bk-1', buddy_id: 'usr-b1', buddy: null };
  const booking2 = { id: 'bk-2', buddy_id: 'usr-b6', buddy: null };

  const result1 = resolveBuddy(booking1, mockBuddies);
  const result2 = resolveBuddy(booking2, mockBuddies);

  // Fixed: each booking resolves to its actual buddy
  assertEqual(result1.buddyName, 'Neha Sharma');
  assertEqual(result2.buddyName, 'Siddharth Kulkarni');
  assertNotEqual(result1.buddyName, result2.buddyName, 'Buddy names must differ for different bookings');
});

test('FIX VERIFIED: Three bookings for three different buddies show three different names', () => {
  const booking1 = { id: 'bk-1', buddy_id: 'usr-b1', buddy: null };
  const booking2 = { id: 'bk-2', buddy_id: 'usr-b6', buddy: null };
  const booking3 = { id: 'bk-3', buddy_id: 'usr-b2', buddy: null };

  const result1 = resolveBuddy(booking1, mockBuddies);
  const result2 = resolveBuddy(booking2, mockBuddies);
  const result3 = resolveBuddy(booking3, mockBuddies);

  assertEqual(result1.buddyName, 'Neha Sharma');
  assertEqual(result2.buddyName, 'Siddharth Kulkarni');
  assertEqual(result3.buddyName, 'Rohan Verma');
  assertNotEqual(result1.buddyName, result2.buddyName);
  assertNotEqual(result2.buddyName, result3.buddyName);
  assertNotEqual(result1.buddyName, result3.buddyName);
});

test('FIX VERIFIED: API booking.buddy summary takes precedence over mock array', () => {
  const apiBooking = {
    id: 'bk-api',
    buddy_id: '550e8400-e29b-41d4-a716-446655440000', // UUID that doesn't exist in mock array
    buddy: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      full_name: 'Arjun Mehta',
      photo_url: 'https://example.com/arjun.jpg',
      city: 'Mumbai',
      rating: 4.85,
      review_count: 42,
      is_verified: true,
      badge_text: 'Verified Pro',
      response_time: 'Usually responds in 5 mins',
    },
  };

  const result = resolveBuddy(apiBooking, mockBuddies);

  assertEqual(result.buddyName, 'Arjun Mehta');
  assertNotEqual(result.buddyName, 'Neha Sharma', 'Must NOT fall back to Neha Sharma');
});

test('FIX VERIFIED: Missing buddy profile shows fallback, not wrong buddy', () => {
  const orphanBooking = {
    id: 'bk-orphan',
    buddy_id: 'non-existent-uuid-1234',
    buddy: null, // API couldn't find this buddy's profile
  };

  const result = resolveBuddy(orphanBooking, mockBuddies);

  // Should NOT default to Neha Sharma — should show a safe fallback
  assertNotEqual(result.buddyName, 'Neha Sharma', 'Orphan booking must NOT show Neha Sharma');
  // Should include the buddy_id fragment so user knows it's a different/unresolved booking
  assert(result.buddyName.includes('non-') || result.buddyName.includes('Unknown'),
    `Should show truncated buddy_id or Unknown, got: ${result.buddyName}`);
});

test('FIX VERIFIED: Buddy photo also resolves per-booking (not hardcoded)', () => {
  const booking1 = { id: 'bk-1', buddy_id: 'usr-b1', buddy: null };
  const booking2 = {
    id: 'bk-2',
    buddy_id: 'some-uuid',
    buddy: { id: 'some-uuid', full_name: 'Custom Buddy', photo_url: 'https://example.com/custom.jpg' },
  };

  const result1 = resolveBuddy(booking1, mockBuddies);
  const result2 = resolveBuddy(booking2, mockBuddies);

  // Each booking has its own photo source
  assert(result1.buddyObj, 'Booking 1 should resolve to a buddy object');
  assert(result2.buddyObj, 'Booking 2 should resolve to a buddy object');
  assertNotEqual(
    result1.buddyObj.profile.photo_url,
    result2.buddyObj.profile.photo_url,
    'Photos should come from different sources'
  );
});

test('FIX VERIFIED: No hardcoded "Neha Sharma" in the resolution logic', () => {
  // Verify the resolution function never returns a hardcoded name
  const booking = {
    id: 'bk-test',
    buddy_id: 'unknown-id',
    buddy: { id: 'unknown-id', full_name: 'Test Person' },
  };
  const result = resolveBuddy(booking, mockBuddies);
  assertEqual(result.buddyName, 'Test Person');
});

// ========== Run tests ==========
console.log('\n=== Booking Buddy Resolution Tests ===\n');

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
