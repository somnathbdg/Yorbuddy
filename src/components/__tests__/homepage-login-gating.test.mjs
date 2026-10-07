/**
 * Regression Tests: Homepage Login Gating
 *
 * Run with: cd src/components/__tests__ && node homepage-login-gating.test.mjs
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

function readFile(filePath) {
  return readFileSync(filePath, 'utf8');
}

// ========== Tests ==========

test('FeaturedBuddies.tsx imports isAuthenticated from useApp', () => {
  const content = readFile(getComponentPath('home/FeaturedBuddies.tsx'));
  assert(content.includes('isAuthenticated'), 'Must import isAuthenticated');
});

test('FeaturedBuddies.tsx checks isAuthentication before rendering buddy data', () => {
  const content = readFile(getComponentPath('home/FeaturedBuddies.tsx'));
  // Must have early return for logged-out users
  assert(content.includes('if (!isAuthenticated)'), 'Must check isAuthenticated');
  assert(content.includes('Login to Discover Verified Buddies'), 'Must show login CTA');
});

test('FeaturedBuddies.tsx logged-out state shows NO real buddy data', () => {
  const content = readFile(getComponentPath('home/FeaturedBuddies.tsx'));
  
  // Find the logged-out block (before the main return)
  const loggedOutBlock = content.substring(
    content.indexOf('if (!isAuthenticated)'),
    content.indexOf('return (')
  );
  
  // Should NOT contain buddy-specific data references in logged-out block
  assert(!loggedOutBlock.includes('buddy.user.full_name'), 'Logged-out block must not reference buddy names');
  assert(!loggedOutBlock.includes('buddy.profile.photo_url'), 'Logged-out block must not reference photos');
  assert(!loggedOutBlock.includes('buddy.buddyProfile.rating'), 'Logged-out block must not reference ratings');
  assert(!loggedOutBlock.includes('buddy.buddyProfile.hourly_rate'), 'Logged-out block must not reference rates');
  assert(!loggedOutBlock.includes('buddy.profile.interests'), 'Logged-out block must not reference interests');
  assert(!loggedOutBlock.includes('View Profile'), 'Logged-out block must not have View Profile button');
  assert(!loggedOutBlock.includes('Book Buddy'), 'Logged-out block must not have Book Buddy button');
});

test('FeaturedBuddies.tsx logged-out state shows lock icon and CTA', () => {
  const content = readFile(getComponentPath('home/FeaturedBuddies.tsx'));
  
  // Find the logged-out block
  const loggedOutBlock = content.substring(
    content.indexOf('if (!isAuthenticated)'),
    content.indexOf('return (')
  );
  
  // Should contain CTA elements
  assert(content.includes('Lock'), 'Must import Lock icon');
  assert(content.includes('Login to Discover Verified Buddies'), 'Must show login heading');
  assert(content.includes('Login to Explore'), 'Must show login button');
  assert(content.includes("setActiveTab('find-buddy')"), 'Must redirect to find-buddy on click');
});

test('FeaturedBuddies.tsx logged-in state shows real buddy data', () => {
  const content = readFile(getComponentPath('home/FeaturedBuddies.tsx'));
  
  // Find the logged-in block (after the isAuthenticated check)
  const loggedInStart = content.indexOf('return (');
  const loggedInBlock = content.substring(loggedInStart);
  
  // Must contain real buddy data references
  assert(loggedInBlock.includes('buddy.user.full_name'), 'Logged-in must show buddy names');
  assert(loggedInBlock.includes('buddy.profile.photo_url'), 'Logged-in must show photos');
  assert(loggedInBlock.includes('buddy.buddyProfile.rating'), 'Logged-in must show ratings');
  assert(loggedInBlock.includes('buddy.buddyProfile.hourly_rate'), 'Logged-in must show rates');
  assert(loggedInBlock.includes('View Profile'), 'Logged-in must have View Profile');
  assert(loggedInBlock.includes('Book Buddy'), 'Logged-in must have Book Buddy');
});

test('Hero.tsx imports isAuthenticated from useApp', () => {
  const content = readFile(getComponentPath('home/Hero.tsx'));
  assert(content.includes('isAuthenticated'), 'Must import isAuthenticated');
});

test('Hero.tsx checks isAuthenticated for floating chip', () => {
  const content = readFile(getComponentPath('home/Hero.tsx'));
  assert(content.includes('isAuthenticated ?'), 'Must conditionally render based on auth');
});

test('Hero.tsx logged-out state shows login CTA instead of real profile', () => {
  const content = readFile(getComponentPath('home/Hero.tsx'));
  
  // Find the logged-out chip (the : (...) part after isAuthenticated ?)
  const ternaryStart = content.indexOf('isAuthenticated ?');
  const loggedOutStart = content.indexOf(': (', ternaryStart);
  const loggedOutEnd = content.indexOf('{/* Floating Safety Chip', loggedOutStart);
  const loggedOutChip = content.substring(loggedOutStart, loggedOutEnd);
  
  // Should NOT contain real profile data
  assert(!loggedOutChip.includes('Neha, 25'), 'Logged-out chip must not show "Neha, 25"');
  assert(!loggedOutChip.includes('₹600/hr'), 'Logged-out chip must not show rate');
  
  // Should contain CTA
  assert(loggedOutChip.includes('Login to Discover'), 'Logged-out must show CTA');
  assert(loggedOutChip.includes('Join YorBuddy'), 'Logged-out must show join link');
});

test('Hero.tsx logged-in state shows generic CTA (no mock data)', () => {
  const content = readFile(getComponentPath('home/Hero.tsx'));
  
  // Find the logged-in chip (before the : in ternary)
  const loggedInStart = content.indexOf('isAuthenticated ?');
  const loggedInEnd = content.indexOf(': (');
  const loggedInChip = content.substring(loggedInStart, loggedInEnd);
  
  // Must NOT contain mock profile data
  assert(!loggedInChip.includes('Neha, 25'), 'Logged-in chip must not show fake name');
  assert(!loggedInChip.includes('₹600/hr'), 'Logged-in chip must not show fake rate');
  assert(!loggedInChip.includes('Pune • ⭐ 4.9 (128)'), 'Logged-in chip must not show fake rating');
  
  // Must contain generic YorBuddy CTA
  assert(loggedInChip.includes('Verified Buddies') || loggedInChip.includes('Find a Buddy'), 'Logged-in must show generic CTA');
});

test('Backend /api/buddies requires authentication', () => {
  const content = readFile(getServerPath('routes/buddies.ts'));
  
  // Must import authenticate middleware
  assert(content.includes("import { authenticate }"), 'Must import authenticate');
  
  // Must apply authenticate to GET / route
  assert(content.includes("router.get('/', authenticate"), 'GET / must require auth');
  
  // Must apply authenticate to GET /:id route
  assert(content.includes("router.get('/:id', authenticate"), 'GET /:id must require auth');
});

test('Backend /api/buddies filters by approved verification_status', () => {
  const content = readFile(getServerPath('services/buddyService.ts'));
  
  // Must filter by approved status
  assert(content.includes("verification_status', 'approved'"), 'Must filter by approved status');
});

test('No flash of buddy data during auth initialization', () => {
  const content = readFile(join(__dirname, '..', '..', 'App.tsx'));
  
  // Must show loading screen during initialization
  assert(content.includes('isInitializing'), 'Must have isInitializing state');
  assert(content.includes('Loading YorBuddy'), 'Must show loading screen');
  
  // Loading screen should render BEFORE auth check completes
  const loadingBlock = content.substring(
    content.indexOf('if (isInitializing)'),
    content.indexOf('// Password reset page')
  );
  assert(loadingBlock.includes('Loading YorBuddy'), 'Loading screen must show during init');
});

test('FeaturedBuddies preserves design (gradient background, centered layout)', () => {
  const content = readFile(getComponentPath('home/FeaturedBuddies.tsx'));
  
  // Must have YorBuddy design elements
  assert(content.includes('bg-gradient-to-br from-blue-50 via-white to-pink-50'), 'Must have gradient background');
  assert(content.includes('rounded-3xl'), 'Must have rounded corners');
  assert(content.includes('text-center'), 'Must be centered');
  assert(content.includes('shadow-lg shadow-blue-500/25'), 'Must have shadow');
});

// ========== Run tests ==========
console.log('\n=== Homepage Login Gating Regression Tests ===\n');

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
