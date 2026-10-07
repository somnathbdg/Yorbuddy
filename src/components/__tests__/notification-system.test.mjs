/**
 * Regression Tests: Notification System
 *
 * Run with: cd src/components/__tests__ && node notification-system.test.mjs
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

function getContextPath(relativePath) {
  return join(__dirname, '..', '..', 'context', relativePath);
}

function getServerPath(relativePath) {
  return join(__dirname, '..', '..', '..', 'server', 'src', relativePath);
}

function getInitialDataPath() {
  return join(__dirname, '..', '..', 'data', 'initialData.ts');
}

function getServicePath(relativePath) {
  return join(__dirname, '..', '..', 'services', relativePath);
}

function readFile(filePath) {
  return readFileSync(filePath, 'utf8');
}

// ========== Tests ==========

test('Notifications initialize as empty array (no mock data)', () => {
  const content = readFile(getContextPath('AppContext.tsx'));
  assert(content.includes('useState<Notification[]>([])'), 'Notifications must start as empty array');
});

test('No INITIAL_NOTIFICATIONS import used in state initialization', () => {
  const content = readFile(getContextPath('AppContext.tsx'));
  const stateInit = content.match(/const \[notifications, setNotifications\] = useState<Notification\[\]>\(([^)]+)\)/);
  assert(stateInit && stateInit[1].trim() === '[]', 'Notifications state must be initialized with empty array');
});

test('notificationService imported in AppContext', () => {
  const content = readFile(getContextPath('AppContext.tsx'));
  assert(content.includes("import { notificationService } from '../services/notification'"), 'Must import notificationService');
});

test('Notifications fetched on login via API', () => {
  const content = readFile(getContextPath('AppContext.tsx'));
  assert(content.includes('fetchNotifications'), 'Must have fetchNotifications function');
  assert(content.includes('notificationService.getNotifications'), 'Must call API to fetch notifications');
});

test('Notifications cleared on logout', () => {
  const content = readFile(getContextPath('AppContext.tsx'));
  assert(content.includes('if (!isAuthenticated)'), 'Must check auth state');
  assert(content.includes('setNotifications([])'), 'Must clear notifications on logout');
});

test('No stale ₹499 notification in initialData', () => {
  const content = readFile(getInitialDataPath());
  assert(!content.includes('Lifetime Membership Active'), 'Must not have "Lifetime Membership Active" notification');
  assert(!content.includes('₹499 one-time'), 'Must not have ₹499 price reference');
});

test('Booking notification created from actual event', () => {
  const content = readFile(getContextPath('AppContext.tsx'));
  assert(content.includes('notificationService.createNotification'), 'Must call createNotification for booking');
  assert(content.includes("type: 'booking_accepted'"), 'Must create booking_accepted notification type');
});

test('Membership notification uses actual plan/amount', () => {
  const content = readFile(getContextPath('AppContext.tsx'));
  assert(content.includes('order.plan_name'), 'Must use actual plan name from order');
  assert(content.includes('order.amount / 100'), 'Must use actual amount from order');
});

test('Review notification created from actual event', () => {
  const content = readFile(getContextPath('AppContext.tsx'));
  assert(content.includes("type: 'review_received'"), 'Must create review_received notification type');
  assert(content.includes('Failed to persist review notification'), 'Must handle review notification persistence');
});

test('Mark all as read updates database', () => {
  const content = readFile(getContextPath('AppContext.tsx'));
  assert(content.includes('notificationService.markAllRead'), 'Must call API to mark all as read');
});

test('Backend notification service exists', () => {
  const content = readFile(getServerPath('services/notificationService.ts'));
  assert(content.includes('getNotifications'), 'Backend must have getNotifications');
  assert(content.includes('createNotification'), 'Backend must have createNotification');
  assert(content.includes('markAllNotificationsRead'), 'Backend must have markAllNotificationsRead');
});

test('Backend notification routes require auth', () => {
  const content = readFile(getServerPath('routes/notifications.ts'));
  assert(content.includes('router.use(authenticate)'), 'All notification routes must require auth');
});

test('Backend notification service scopes by user_id', () => {
  const content = readFile(getServerPath('services/notificationService.ts'));
  assert(content.includes('.eq(\'user_id\', userId)'), 'Queries must filter by user_id');
});

test('Frontend notification service exists', () => {
  const content = readFile(getServicePath('notification.ts'));
  assert(content.includes('getNotifications'), 'Frontend service must have getNotifications');
  assert(content.includes('markAllRead'), 'Frontend service must have markAllRead');
});

test('App registers notification routes', () => {
  const content = readFile(getServerPath('app.ts'));
  assert(content.includes("app.use('/api/notifications', notificationRoutes)"), 'Must register notification routes');
});

// ========== Run tests ==========
console.log('\n=== Notification System Regression Tests ===\n');

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
