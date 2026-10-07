/**
 * Regression Tests: High-Priority Fixes
 *
 * Run with: cd src/components/__tests__ && node high-priority-fixes.test.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function getComponentPath(relativePath) {
  return join(__dirname, '..', relativePath);
}

function getServerPath(relativePath) {
  return join(__dirname, '..', '..', '..', 'server', 'src', relativePath);
}

function getContextPath(relativePath) {
  return join(__dirname, '..', '..', 'context', relativePath);
}

function readFile(filePath) {
  return readFileSync(filePath, 'utf8');
}

// ========== Helpers ==========

// Test that AdminPanel has no hardcoded mock data
function verifyAdminPanelNoMockData() {
  const content = readFile(getComponentPath('dashboard/AdminPanel.tsx'));
  
  // Should NOT contain hardcoded mock buddy names
  assert(!content.includes('Rohan Mehra'), 'AdminPanel should not contain mock name "Rohan Mehra"');
  assert(!content.includes('Sneha Deshmukh'), 'AdminPanel should not contain mock name "Sneha Deshmukh"');
  assert(!content.includes('Aman Verma'), 'AdminPanel should not contain mock name "Aman Verma"');
  
  // Should NOT contain hardcoded KPI numbers
  assert(!content.includes('4,820'), 'AdminPanel should not contain hardcoded member count');
  assert(!content.includes('₹24,05,180'), 'AdminPanel should not contain hardcoded revenue');
  assert(!content.includes('1,940'), 'AdminPanel should not contain hardcoded session count');
  
  // Should NOT contain hardcoded mock report entries
  assert(!content.includes('Vikram S.'), 'AdminPanel should not contain mock report user');
  assert(!content.includes('Ananya R.'), 'AdminPanel should not contain mock reporter');
  assert(!content.includes('Requested private hotel room'), 'AdminPanel should not contain mock report reason');
  assert(!content.includes('Asking for outside WhatsApp'), 'AdminPanel should not contain mock report reason');
  
  // Should use real API service for reports
  assert(content.includes('reportService'), 'AdminPanel should use reportService');
  assert(content.includes('bookingService'), 'AdminPanel should use bookingService');
  assert(content.includes('userService.getPendingKyc'), 'AdminPanel should fetch KYC from API');
}

// Test that AuthModal has no hardcoded photo
function verifyAuthModalNoHardcodedPhoto() {
  const content = readFile(getComponentPath('auth/AuthModal.tsx'));
  
  // Should NOT contain hardcoded Unsplash URL for profile photo
  assert(!content.includes('photo-1534528741775-53994a69daeb'), 'AuthModal should not have hardcoded photo URL');
  
  // Should show initials placeholder instead
  assert(content.includes('fullName.charAt(0)'), 'AuthModal should show user initial');
}

// Test that AuthModal shows email as "Pending" not "Active"
function verifyAuthModalEmailPending() {
  const content = readFile(getComponentPath('auth/AuthModal.tsx'));
  
  // Find the email verification section in step 3 (registration)
  const step3Start = content.indexOf('registerStep === 3');
  const emailSection = content.substring(step3Start, step3Start + 1000);
  
  // Should NOT show "Active" for email in step 3
  assert(!emailSection.includes('Active'), 'Email should not show as "Active" in step 3');
  assert(emailSection.includes('Pending'), 'Email should show as "Pending" in step 3');
}

// Test that AppContext doesn't auto-seed chat messages
function verifyAppContextNoAutoSeed() {
  const content = readFile(getContextPath('AppContext.tsx'));
  
  // Should NOT contain auto-seeded welcome message
  assert(!content.includes('Thanks for booking'), 'AppContext should not auto-seed welcome message');
  assert(!content.includes('Looking forward to our meetup'), 'AppContext should not auto-seed chat');
  assert(!content.includes('sender_id: newBooking.buddy_id'), 'AppContext should not create fake buddy message');
}

// Test that BuddySearch has pagination
function verifyBuddySearchPagination() {
  const content = readFile(getComponentPath('buddies/BuddySearch.tsx'));
  
  // Should have pagination state
  assert(content.includes('currentPage'), 'BuddySearch should have currentPage state');
  assert(content.includes('totalPages'), 'BuddySearch should have totalPages state');
  assert(content.includes('perPage'), 'BuddySearch should have perPage constant');
  
  // Should have pagination UI
  assert(content.includes('Previous'), 'BuddySearch should have Previous button');
  assert(content.includes('Next'), 'BuddySearch should have Next button');
}

// Test that BuddySearch backend filters by approved status
function verifyBuddySearchBackendFilter() {
  const content = readFile(getServerPath('services/buddyService.ts'));
  
  // Should filter by approved verification status
  assert(content.includes("verification_status', 'approved'"), 'BuddyService should filter by approved status');
}

// Test that Footer doesn't have dead links
function verifyFooterNoDeadLinks() {
  const content = readFile(getComponentPath('layout/Footer.tsx'));
  
  // Should NOT have handleLegalClick that sets legalPageSlug (dead - no 'legal' tab)
  assert(!content.includes('handleLegalClick'), 'Footer should not have dead legal click handler');
  
  // Should NOT reference non-existent slugs that have no handler
  const deadSlugs = ['community-guidelines', 'prohibited-services', 'safety-policy'];
  deadSlugs.forEach(slug => {
    assert(!content.includes(slug), `Footer should not have dead link to '${slug}'`);
  });
}

// ========== Tests ==========

test('AdminPanel has no mock buddy names (Rohan Mehra, Sneha Deshmukh, Aman Verma)', () => {
  verifyAdminPanelNoMockData();
});

test('AdminPanel has no hardcoded KPI stats (4820, 2405180, 1940)', () => {
  const content = readFile(getComponentPath('dashboard/AdminPanel.tsx'));
  assert(!content.includes("'buddy-new-1'"), 'No mock verification queue IDs');
});

test('AdminPanel uses real API services (reportService, bookingService, userService)', () => {
  const content = readFile(getComponentPath('dashboard/AdminPanel.tsx'));
  assert(content.includes('reportService.getReports'), 'Uses reportService.getReports');
  assert(content.includes('bookingService.getBookings'), 'Uses bookingService.getBookings');
  assert(content.includes('userService.getPendingKyc'), 'Uses userService.getPendingKyc');
});

test('AuthModal has no hardcoded profile photo (Unsplash URL)', () => {
  verifyAuthModalNoHardcodedPhoto();
});

test('AuthModal shows email as "Pending" not "Active"', () => {
  verifyAuthModalEmailPending();
});

test('AppContext does not auto-seed welcome chat messages', () => {
  verifyAppContextNoAutoSeed();
});

test('BuddySearch has pagination (currentPage, totalPages, perPage)', () => {
  verifyBuddySearchPagination();
});

test('BuddySearch backend filters by verification_status approved', () => {
  verifyBuddySearchBackendFilter();
});

test('Footer has no dead links (no handleLegalClick, no dead slugs)', () => {
  verifyFooterNoDeadLinks();
});

// ========== Run tests ==========
console.log('\n=== High-Priority Fixes Regression Tests ===\n');

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
