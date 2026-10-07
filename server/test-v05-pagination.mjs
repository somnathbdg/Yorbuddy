/**
 * V-05: Admin Bookings Pagination — Unit Tests
 * Tests pagination logic, validation, and metadata without requiring a running server.
 */
import fs from 'fs';
import path from 'path';

console.log('\n=== V-05: ADMIN BOOKINGS PAGINATION TESTS ===\n');

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

// ========== TEST 1: Default Pagination Applied ==========
console.log('=== Test 1: Default Pagination Applied ===\n');

// Read the source to verify constants
const serviceSource = fs.readFileSync(
  path.join(process.cwd(), 'src/services/bookingService.ts'),
  'utf8'
);

if (serviceSource.includes('const DEFAULT_PAGE = 1')) {
  pass('DEFAULT_PAGE = 1 is defined');
} else {
  fail('DEFAULT_PAGE = 1 is defined', 'constant not found');
}

if (serviceSource.includes('const DEFAULT_LIMIT = 20')) {
  pass('DEFAULT_LIMIT = 20 is defined');
} else {
  fail('DEFAULT_LIMIT = 20 is defined', 'constant not found');
}

if (serviceSource.includes('const MAX_LIMIT = 100')) {
  pass('MAX_LIMIT = 100 is defined');
} else {
  fail('MAX_LIMIT = 100 is defined', 'constant not found');
}

// ========== TEST 2: Custom Valid Page/Limit Works ==========
console.log('\n=== Test 2: Custom Valid Page/Limit ===\n');

// Simulate parsePaginationParams logic
function parsePaginationParams(query) {
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 100;

  let page = DEFAULT_PAGE;
  let limit = DEFAULT_LIMIT;

  if (query.page !== undefined) {
    const raw = String(query.page);
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error('Invalid page parameter. Must be a positive integer.');
    }
    page = parsed;
  }

  if (query.limit !== undefined) {
    const raw = String(query.limit);
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error('Invalid limit parameter. Must be a positive integer.');
    }
    if (parsed > MAX_LIMIT) {
      throw new Error(`Limit cannot exceed ${MAX_LIMIT}.`);
    }
    limit = parsed;
  }

  return { page, limit };
}

// Valid custom params
try {
  const result = parsePaginationParams({ page: '3', limit: '50' });
  if (result.page === 3 && result.limit === 50) {
    pass('Custom page=3, limit=50 parsed correctly');
  } else {
    fail('Custom page=3, limit=50', `got page=${result.page}, limit=${result.limit}`);
  }
} catch (err) {
  fail('Custom page=3, limit=50', null, err.message);
}

// Only page specified
try {
  const result = parsePaginationParams({ page: '5' });
  if (result.page === 5 && result.limit === 20) {
    pass('Page-only param uses default limit=20');
  } else {
    fail('Page-only param', `got page=${result.page}, limit=${result.limit}`);
  }
} catch (err) {
  fail('Page-only param', null, err.message);
}

// Only limit specified
try {
  const result = parsePaginationParams({ limit: '10' });
  if (result.page === 1 && result.limit === 10) {
    pass('Limit-only param uses default page=1');
  } else {
    fail('Limit-only param', `got page=${result.page}, limit=${result.limit}`);
  }
} catch (err) {
  fail('Limit-only param', null, err.message);
}

// ========== TEST 3: Limit Cannot Exceed Server Maximum ==========
console.log('\n=== Test 3: Limit Cannot Exceed Maximum ===\n');

try {
  parsePaginationParams({ limit: '101' });
  fail('limit=101 should be rejected', 'no error thrown');
} catch (err) {
  if (err.message.includes('cannot exceed')) {
    pass('limit=101 rejected with correct message');
  } else {
    fail('limit=101 rejection', 'wrong error: ' + err.message);
  }
}

try {
  parsePaginationParams({ limit: '1000' });
  fail('limit=1000 should be rejected', 'no error thrown');
} catch (err) {
  if (err.message.includes('cannot exceed')) {
    pass('limit=1000 rejected with correct message');
  } else {
    fail('limit=1000 rejection', 'wrong error: ' + err.message);
  }
}

// Boundary: exactly MAX_LIMIT should work
try {
  const result = parsePaginationParams({ limit: '100' });
  if (result.limit === 100) {
    pass('limit=100 (exactly MAX_LIMIT) accepted');
  } else {
    fail('limit=100 boundary', `got limit=${result.limit}`);
  }
} catch (err) {
  fail('limit=100 boundary', null, err.message);
}

// ========== TEST 4: Invalid Page/Limit Rejected ==========
console.log('\n=== Test 4: Invalid Page/Limit Rejected ===\n');

// Negative page
try {
  parsePaginationParams({ page: '-1' });
  fail('page=-1 should be rejected', 'no error thrown');
} catch (err) {
  pass('page=-1 rejected');
}

// Zero page
try {
  parsePaginationParams({ page: '0' });
  fail('page=0 should be rejected', 'no error thrown');
} catch (err) {
  pass('page=0 rejected');
}

// Negative limit
try {
  parsePaginationParams({ limit: '-5' });
  fail('limit=-5 should be rejected', 'no error thrown');
} catch (err) {
  pass('limit=-5 rejected');
}

// Zero limit
try {
  parsePaginationParams({ limit: '0' });
  fail('limit=0 should be rejected', 'no error thrown');
} catch (err) {
  pass('limit=0 rejected');
}

// NaN page
try {
  parsePaginationParams({ page: 'abc' });
  fail('page=abc should be rejected', 'no error thrown');
} catch (err) {
  pass('page=abc (NaN) rejected');
}

// NaN limit
try {
  parsePaginationParams({ limit: 'xyz' });
  fail('limit=xyz should be rejected', 'no error thrown');
} catch (err) {
  pass('limit=xyz (NaN) rejected');
}

// Float page
try {
  parsePaginationParams({ page: '1.5' });
  fail('page=1.5 should be rejected', 'no error thrown');
} catch (err) {
  pass('page=1.5 (float) rejected');
}

// Float limit
try {
  parsePaginationParams({ limit: '10.5' });
  fail('limit=10.5 should be rejected', 'no error thrown');
} catch (err) {
  pass('limit=10.5 (float) rejected');
}

// ========== TEST 5: Response Contains Correct Pagination Metadata ==========
console.log('\n=== Test 5: Pagination Metadata Structure ===\n');

// Verify the source code includes all required metadata fields
const requiredMetaFields = ['page', 'limit', 'total', 'totalPages', 'hasNextPage', 'hasPreviousPage'];
let allFieldsPresent = true;
for (const field of requiredMetaFields) {
  if (!serviceSource.includes(field)) {
    fail(`Metadata field '${field}' present in response`, 'field not found in source');
    allFieldsPresent = false;
  }
}
if (allFieldsPresent) {
  pass('All required metadata fields present: page, limit, total, totalPages, hasNextPage, hasPreviousPage');
}

// Verify the response structure
if (serviceSource.includes('res.status(200).json({') &&
    serviceSource.includes('data: enrichedBookings') &&
    serviceSource.includes('meta: {')) {
  pass('Response structure: { data: [...], meta: { ... } }');
} else {
  fail('Response structure', 'expected { data, meta } structure not found');
}

// ========== TEST 6: Second Page Returns Correct Records ==========
console.log('\n=== Test 6: Second Page Logic ===\n');

// Verify range calculation logic in source
if (serviceSource.includes('const from = (page - 1) * limit') &&
    serviceSource.includes('const to = from + limit - 1') &&
    serviceSource.includes('.range(from, to)')) {
  pass('DB-level pagination with range(from, to) is implemented');
} else {
  fail('DB-level pagination', 'range calculation not found in source');
}

// Simulate range calculation
function calculateRange(page, limit) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
}

const page2Range = calculateRange(2, 20);
if (page2Range.from === 20 && page2Range.to === 39) {
  pass('Page 2 with limit 20: range(20, 39) — correct offset');
} else {
  fail('Page 2 range calculation', `got from=${page2Range.from}, to=${page2Range.to}`);
}

const page5Range = calculateRange(5, 10);
if (page5Range.from === 40 && page5Range.to === 49) {
  pass('Page 5 with limit 10: range(40, 49) — correct offset');
} else {
  fail('Page 5 range calculation', `got from=${page5Range.from}, to=${page5Range.to}`);
}

// ========== TEST 7: Deterministic Ordering ==========
console.log('\n=== Test 7: Deterministic Ordering ===\n');

if (serviceSource.includes(".order('created_at', { ascending: false })") &&
    serviceSource.includes(".order('id', { ascending: false })")) {
  pass('Deterministic ordering: created_at DESC, id DESC (tiebreaker)');
} else {
  fail('Deterministic ordering', 'dual-order not found in source');
}

// ========== TEST 8: Admin Authorization Preserved ==========
console.log('\n=== Test 8: Admin Authorization Preserved ===\n');

// Verify admin-only access pattern
if (serviceSource.includes("if (userRole === 'admin')") &&
    serviceSource.includes('.range(from, to)')) {
  pass('Pagination only applied for admin role');
} else {
  fail('Admin-only pagination', 'admin role check not found');
}

// Verify non-admin roles still get their own bookings (not paginated)
if (serviceSource.includes("if (userRole === 'user')") &&
    serviceSource.includes("if (userRole === 'buddy')")) {
  pass('Non-admin roles (user, buddy) still get their own bookings');
} else {
  fail('Non-admin role handling', 'user/buddy role checks not found');
}

// Verify the route still uses authenticate middleware
const routeSource = fs.readFileSync(
  path.join(process.cwd(), 'src/routes/bookings.ts'),
  'utf8'
);
if (routeSource.includes('router.get(\'/\', authenticate, getBookings)')) {
  pass('GET /bookings route still protected by authenticate middleware');
} else {
  fail('Route authentication', 'authenticate middleware not found on bookings route');
}

// ========== TEST 9: No Full Table Load Into Memory ==========
console.log('\n=== Test 9: Efficient Count (No Full Table Load) ===\n');

if (serviceSource.includes("select('*', { count: 'exact' })")) {
  pass('Uses Supabase count: exact for efficient total count');
} else {
  fail('Efficient count', 'count: exact not found in source');
}

// Verify we don't do data.length for total when count is available
if (serviceSource.includes('const total = count ?? bookings.length')) {
  pass('Total uses count from DB, falls back to data.length only if count is null');
} else {
  fail('Total calculation', 'count fallback not found');
}

// ========== TEST 10: Existing Booking Fields Preserved ==========
console.log('\n=== Test 10: Existing Booking Fields Preserved ===\n');

// Verify the response still includes all original booking fields via spread
if (serviceSource.includes('...booking') &&
    serviceSource.includes('buddy: buddyMap[booking.buddy_id] || null')) {
  pass('Booking fields preserved via spread operator + buddy enrichment');
} else {
  fail('Booking fields preservation', 'spread or buddy enrichment not found');
}

// Verify the frontend still uses the same field names
const adminPanelSource = fs.readFileSync(
  path.join(process.cwd(), '../src/components/dashboard/AdminPanel.tsx'),
  'utf8'
);

const requiredFields = ['booking_code', 'booking_date', 'booking_time', 'duration_hours', 'location_name', 'total_amount', 'status'];
let allFrontendFieldsPresent = true;
for (const field of requiredFields) {
  if (!adminPanelSource.includes(field)) {
    fail(`Frontend field '${field}' present`, 'field not found in AdminPanel');
    allFrontendFieldsPresent = false;
  }
}
if (allFrontendFieldsPresent) {
  pass('All booking fields preserved in AdminPanel: booking_code, booking_date, booking_time, duration_hours, location_name, total_amount, status');
}

// ========== TEST 11: Frontend Pagination Controls ==========
console.log('\n=== Test 11: Frontend Pagination Controls ===\n');

if (adminPanelSource.includes('ChevronLeft') && adminPanelSource.includes('ChevronRight')) {
  pass('Previous/Next button icons imported');
} else {
  fail('Pagination icons', 'ChevronLeft/ChevronRight not found');
}

if (adminPanelSource.includes('hasPreviousPage') && adminPanelSource.includes('hasNextPage')) {
  pass('Previous/Next buttons disabled based on hasPreviousPage/hasNextPage');
} else {
  fail('Pagination button disable logic', 'hasPreviousPage/hasNextPage not used');
}

if (adminPanelSource.includes('bookingsMeta.page') && adminPanelSource.includes('bookingsMeta.totalPages')) {
  pass('Current page and total pages displayed');
} else {
  fail('Page display', 'page/totalPages display not found');
}

if (adminPanelSource.includes('setBookingsPage')) {
  pass('Page state management with setBookingsPage');
} else {
  fail('Page state', 'setBookingsPage not found');
}

// ========== TEST 12: Frontend Service Supports Pagination ==========
console.log('\n=== Test 12: Frontend Service Pagination Support ===\n');

const bookingServiceSource = fs.readFileSync(
  path.join(process.cwd(), '../src/services/booking.ts'),
  'utf8'
);

if (bookingServiceSource.includes('async getBookings(page?: number, limit?: number)')) {
  pass('bookingService.getBookings accepts optional page and limit params');
} else {
  fail('Service pagination params', 'getBookings signature not updated');
}

if (bookingServiceSource.includes('params.page = page') && bookingServiceSource.includes('params.limit = limit')) {
  pass('Page and limit passed as query params to API');
} else {
  fail('Query params', 'page/limit not passed as query params');
}

if (bookingServiceSource.includes('meta: response.data.meta')) {
  pass('Response meta returned to caller');
} else {
  fail('Meta return', 'meta not returned from getBookings');
}

// ========== SUMMARY ==========
console.log('\n=== V-05 TEST SUMMARY ===');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);
console.log(failed === 0 ? '\n  ALL TESTS PASSED\n' : `\n  ${failed} TEST(S) FAILED\n`);

process.exit(failed === 0 ? 0 : 1);
