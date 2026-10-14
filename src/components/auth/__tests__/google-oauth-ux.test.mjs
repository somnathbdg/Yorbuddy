/**
 * Regression tests for the Google OAuth frontend UX work (P1).
 *
 * Run with: node src/components/auth/__tests__/google-oauth-ux.test.mjs
 *
 * Source-level assertions, matching the style of the other frontend suites in
 * this repo (there is no DOM harness available here).
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** src/components/auth/<rel> */
const readAuth = (rel) => readFileSync(join(__dirname, '..', rel), 'utf8');
/** src/<rel> */
const readSrc = (rel) => readFileSync(join(__dirname, '..', '..', '..', rel), 'utf8');
/** server/src/<rel> */
const readServer = (rel) =>
  readFileSync(join(__dirname, '..', '..', '..', '..', 'server', 'src', rel), 'utf8');

const authModal = readAuth('AuthModal.tsx');
const callback = readAuth('GoogleCallback.tsx');
const screens = readAuth('GoogleAuthScreens.tsx');
const authService = readSrc('services/auth.ts');
const googleAuthRoute = readServer('routes/googleAuth.ts');
const googleAuthService = readServer('services/googleAuthService.ts');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

/** Extract the body of the pre-redirect click handler. */
function googleSignInHandlerBlock() {
  const start = authModal.indexOf('const handleGoogleSignIn');
  assert(start !== -1, 'AuthModal must define handleGoogleSignIn');
  const end = authModal.indexOf('};', start);
  assert(end !== -1, 'handleGoogleSignIn must be a complete statement');
  return authModal.slice(start, end);
}

// ========== 1. Branded pre-redirect overlay ==========

test('AuthModal renders the branded OAuth overlay through a portal', () => {
  assert(authModal.includes('OAuthRedirectOverlay'), 'AuthModal must use OAuthRedirectOverlay');
  assert(authModal.includes('createPortal'), 'Overlay must be rendered via createPortal');
  assert(authModal.includes('isRedirectingToGoogle'), 'AuthModal must track the redirect state');
});

test('Overlay shows YorBuddy brand + the "Connecting securely to Google" message', () => {
  assert(screens.includes('Connecting securely to Google'), 'Overlay copy missing');
  assert(screens.includes('Yor<span className="text-gradient">Buddy</span>'), 'Brand lockup missing');
  assert(screens.includes('from-blue-600'), 'Brand gradient missing');
  assert(screens.includes('from-blue-600 via-blue-500 to-pink-500'), 'Brand logo gradient missing');
});

test('Overlay uses brand styles already defined in index.css', () => {
  assert(screens.includes('logo-glow'), 'Should reuse the logo-glow brand class');
  assert(screens.includes('text-gradient'), 'Should reuse the text-gradient brand class');
});

// ========== 2. Navigation is not delayed ==========

test('Overlay is painted synchronously before the real navigation', () => {
  const block = googleSignInHandlerBlock();
  const flushAt = block.indexOf('flushSync');
  const navAt = block.indexOf('window.location.href');
  assert(flushAt !== -1, 'Handler must commit the overlay with flushSync');
  assert(navAt !== -1, 'Handler must issue the real navigation');
  assert(flushAt < navAt, 'Overlay must be committed before navigating');
});

test('Handler does not delay navigation with timers or awaits', () => {
  const block = googleSignInHandlerBlock();
  assert(!block.includes('setTimeout'), 'Handler must not defer navigation with setTimeout');
  assert(!block.includes('requestAnimationFrame'), 'Handler must not defer navigation');
  assert(!block.includes('await'), 'Handler must not await before navigating');
  assert(!block.includes('setInterval'), 'Handler must not poll');
});

test('Both Google buttons route through the same handler', () => {
  assert(count(authModal, 'onClick={handleGoogleSignIn}') === 2, 'Both Google buttons must use handleGoogleSignIn');
  assert(count(authModal, 'window.location.href = `${API_BASE_URL}/auth/google`') === 1, 'Navigation must live in one place');
});

// ========== 3. No iframe / popup embedding ==========

test('OAuth is never opened in an iframe or popup', () => {
  for (const [name, src] of [
    ['AuthModal.tsx', authModal],
    ['GoogleCallback.tsx', callback],
    ['GoogleAuthScreens.tsx', screens],
  ]) {
    assert(!src.includes('<iframe'), `${name} must not use an iframe`);
    assert(!src.includes('window.open'), `${name} must not use a popup`);
  }
});

// ========== 4. Callback states: loading / success / error ==========

test('Callback defines explicit loading, success and error states', () => {
  assert(callback.includes("type CallbackStatus = 'exchanging' | 'success' | 'error'"), 'Status union missing');
  assert(callback.includes("tone=\"loading\""), 'Loading state missing');
  assert(callback.includes("tone=\"success\""), 'Success state missing');
  assert(callback.includes("tone=\"error\""), 'Error state missing');
  assert(screens.includes("tone: 'loading' | 'success' | 'error'"), 'Status screen tones missing');
});

test('Callback surfaces the signed-in account on success', () => {
  assert(callback.includes('Signed in as'), 'Success screen must name the signed-in account');
});

test('Callback explains a cold start while still waiting', () => {
  assert(callback.includes('may be waking up from sleep'), 'Cold-start hint missing on the callback screen');
});

// ========== 5. Timeout + friendly error + Try Again ==========

test('Exchange has an explicit timeout budget', () => {
  assert(callback.includes('EXCHANGE_TIMEOUT_MS'), 'Exchange timeout constant missing');
  assert(callback.includes('{ timeout: EXCHANGE_TIMEOUT_MS }'), 'Timeout must be passed to the exchange call');
  assert(
    authService.includes('options?: { timeout?: number }'),
    'exchangeGoogleCode must accept a per-request timeout',
  );
});

test('Network failure and timeout produce a friendly, retryable error', () => {
  assert(callback.includes('classifyExchangeFailure'), 'Error classification missing');
  assert(callback.includes('We could not reach YorBuddy'), 'Network failure message missing');
  assert(callback.includes("recovery: 'retry'"), 'Network failure must be retryable');
  assert(callback.includes('>Try Again<') || callback.includes('Try Again'), 'Try Again action missing');
});

test('Rate limiting and expired codes get their own guidance', () => {
  assert(callback.includes('status === 429'), 'Must handle the 429 rate-limit response');
  assert(callback.includes('Too many sign-in attempts'), 'Rate-limit message missing');
  assert(callback.includes("recovery: 'wait'"), 'Rate limit must not invite an immediate retry');
  assert(callback.includes("recovery: 'restart'"), 'Expired code must offer a restart');
});

// ========== 6. Retry safety: no duplicate requests, no loops ==========

test('Exchange is single-flight (no duplicate requests)', () => {
  assert(callback.includes('isExchangingRef'), 'Single-flight guard missing');
  assert(callback.includes('if (isExchangingRef.current) return;'), 'Single-flight guard not enforced');
});

test('Exchange starts exactly once on mount', () => {
  assert(callback.includes('hasStartedRef'), 'Mount-once guard missing');
  assert(callback.includes('if (hasStartedRef.current) return;'), 'Mount-once guard not enforced');
});

test('There is no automatic retry and no polling', () => {
  assert(!callback.includes('setInterval'), 'Callback must not poll');
  assert(!/setTimeout\([^)]*exchangeGoogleCode/.test(callback), 'Exchange must never be retried on a timer');
  assert(!/setTimeout\([^)]*location\.href/.test(callback), 'Navigation must never be triggered on a timer');
  assert(!callback.includes('while ('), 'Callback must not loop');
  assert(!callback.includes('for ('), 'Callback must not loop');
});

test('Restarting the OAuth flow is manual only (single navigation site)', () => {
  assert(count(callback, 'window.location.href') === 1, 'There must be exactly one location.href assignment');
  assert(callback.includes('restartGoogleSignIn'), 'Restart action missing');
  const start = callback.indexOf('const restartGoogleSignIn');
  const block = callback.slice(start, callback.indexOf('}, []);', start));
  assert(block.includes('/auth/google'), 'Restart must go to the backend OAuth entry point');
});

test('Success continues into the app once and cleans the one-time code', () => {
  assert(callback.includes('hasContinuedRef'), 'Continue-once guard missing');
  assert(callback.includes('window.history.replaceState'), 'One-time code must be removed from the URL');
});

// ========== 7. Security controls preserved ==========

test('Frontend still uses the configured API base URL (no hardcoded host)', () => {
  assert(authModal.includes('API_BASE_URL'), 'AuthModal must use API_BASE_URL');
  assert(callback.includes('API_BASE_URL'), 'Callback must use API_BASE_URL');
  assert(!authModal.includes('onrender.com'), 'No hardcoded backend host in AuthModal');
  assert(!callback.includes('onrender.com'), 'No hardcoded backend host in the callback');
});

test('Token storage path is unchanged', () => {
  assert(authService.includes("localStorage.setItem('yorbuddy_access_token'"), 'Access token key changed');
  assert(authService.includes("localStorage.setItem('yorbuddy_refresh_token'"), 'Refresh token key changed');
  assert(callback.includes('authService.exchangeGoogleCode'), 'Callback must exchange through authService');
});

test('No secrets or credentials added to the new frontend files', () => {
  for (const [name, src] of [
    ['AuthModal.tsx', authModal],
    ['GoogleCallback.tsx', callback],
    ['GoogleAuthScreens.tsx', screens],
  ]) {
    assert(!/client_secret/i.test(src), `${name} must not reference a client secret`);
    assert(!/GOCSPX-/.test(src), `${name} must not contain a Google secret`);
  }
});

test('Backend OAuth security controls are untouched', () => {
  assert(googleAuthRoute.includes('oauthLimiter'), 'OAuth rate limiting must remain');
  for (const route of [
    "router.get('/', oauthLimiter",
    "router.get('/callback', oauthLimiter",
    "router.post('/exchange', oauthLimiter",
  ]) {
    assert(googleAuthRoute.includes(route), `Rate limiter missing on ${route}`);
  }
  assert(googleAuthService.includes('validateState(state)'), 'State validation must remain');
  assert(googleAuthService.includes('verifier.verify(publicKey, signature)'), 'ID token signature check must remain');
  assert(googleAuthService.includes('isGoogleOAuthConfigured'), 'Config check must remain');
});

// ========== 8. Cold-start limitation is documented honestly ==========

test('Cold-start limitation is documented and not over-claimed', () => {
  const readme = readFileSync(
    join(__dirname, '..', '..', '..', '..', 'server', 'README.md'),
    'utf8',
  );
  assert(readme.includes('Free-tier cold start'), 'README must document the cold-start limitation');
  assert(readme.includes('cannot remove Render'), 'README must state the overlay cannot remove Render\'s page');
  assert(
    readme.includes('No frontend-only change can make a stopped backend respond'),
    'README must state the frontend cannot fix the cold start',
  );
  assert(screens.includes('cannot replace a response served by the host'), 'Overlay must document its own limit');
});

// ========== Run ==========

console.log('\n=== Google OAuth Frontend UX Tests ===\n');

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
