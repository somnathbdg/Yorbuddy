/**
 * ============================================================================
 * Admin / KYC Route Resolution Regression Test
 * ============================================================================
 *
 * Guards against route shadowing on the /api/admin and /api/kyc prefixes.
 *
 * Context: verificationRoutes is mounted at /api/verification, /api/kyc and
 * /api/admin. Because the router ends with a `/:id` catch-all, the ordering of
 * the literal routes inside it matters:
 *
 *   GET  /api/admin/stats             -> getAdminStats      (NOT getKycById)
 *   GET  /api/admin/verified-buddies  -> getVerifiedBuddies (NOT getKycById)
 *   GET  /api/admin/kyc/pending       -> getPendingKyc      (NOT getKycById)
 *   GET  /api/admin/kyc/:id           -> getKycById
 *   GET  /api/kyc/status              -> getMyKycStatus     (NOT getKycById)
 *   GET  /api/verification/me         -> getMyVerificationStatus
 *
 * The distinguishing signal: getKycById validates :id as a UUID and returns
 * 400 VALIDATION_ERROR for a non-UUID. The literal handlers return 200/401/403.
 * So a literal route that gets swallowed by the catch-all shows up as a 400
 * "Invalid KYC ID format" — exactly the regression this test detects.
 *
 * Run: cd server && node test-admin-routes.cjs
 */

const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const i = line.indexOf('=');
  if (i > 0) env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
});

const jwt = require(path.join(__dirname, 'node_modules/jsonwebtoken'));
const { createClient } = require(path.join(__dirname, 'node_modules/@supabase/supabase-js'));

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
const BASE = 'http://127.0.0.1:3001/api';

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(name, detail) { passed++; console.log(`  PASS: ${name}${detail ? ' - ' + detail : ''}`); }
function fail(name, detail) { failed++; console.log(`  FAIL: ${name}${detail ? ' - ' + detail : ''}`); }
function skip(name, detail) { skipped++; console.log(`  SKIP: ${name}${detail ? ' - ' + detail : ''}`); }

async function api(method, p, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + p, { method, headers });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

function mintToken(userId, email, role) {
  return jwt.sign(
    { userId, email, role, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m', issuer: 'yorbuddy-api' }
  );
}

/** True when the response is the KYC :id catch-all rejecting a non-UUID. */
function isKycIdCatchAll(r) {
  return r.status === 400
    && r.data?.error?.code === 'VALIDATION_ERROR'
    && JSON.stringify(r.data).includes('Invalid KYC ID format');
}

(async () => {
  console.log('\n=== ADMIN / KYC ROUTE RESOLUTION TESTS ===\n');

  const { data: admin } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('role', 'admin')
    .eq('is_active', true)
    .limit(1)
    .single();

  const { data: normal } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('role', 'user')
    .eq('is_active', true)
    .limit(1)
    .single();

  const adminTok = admin ? mintToken(admin.id, admin.email, 'admin') : null;
  const userTok = normal ? mintToken(normal.id, normal.email, 'user') : null;

  if (!adminTok) {
    skip('admin-route tests', 'no active admin row available');
  } else {
    // ---------- Literal admin routes must NOT hit the :id catch-all ----------
    console.log('1. Literal /api/admin/* routes resolve to their own handlers');

    const cases = [
      ['/admin/stats', 'getAdminStats'],
      ['/admin/verified-buddies', 'getVerifiedBuddies'],
      ['/admin/kyc/pending', 'getPendingKyc'],
    ];

    for (const [p, handler] of cases) {
      const r = await api('GET', p, adminTok);
      if (isKycIdCatchAll(r)) {
        fail(`${p} -> ${handler}`, 'SHADOWED: swallowed by /:id catch-all (400 Invalid KYC ID format)');
      } else if (r.status === 200) {
        pass(`${p} -> ${handler}`, 'status=200, not shadowed');
      } else {
        fail(`${p} -> ${handler}`, `expected 200, got ${r.status}`);
      }
    }

    // ---------- The :id route must still work for a real UUID ----------
    console.log('\n2. /api/admin/kyc/:id still resolves to getKycById');
    const fakeUuid = '00000000-0000-4000-8000-000000000000';
    const rId = await api('GET', `/admin/kyc/${fakeUuid}`, adminTok);
    if (rId.status === 404) {
      pass('/admin/kyc/<uuid> -> getKycById', 'status=404 (record not found, handler reached)');
    } else if (rId.status === 200) {
      pass('/admin/kyc/<uuid> -> getKycById', 'status=200');
    } else if (isKycIdCatchAll(rId)) {
      fail('/admin/kyc/<uuid>', 'valid UUID rejected by :id validation');
    } else {
      fail('/admin/kyc/<uuid>', `unexpected status=${rId.status}`);
    }

    // ---------- Non-UUID still 400 (validation intact) ----------
    console.log('\n3. Non-UUID on the :id route still returns 400');
    const rBad = await api('GET', '/admin/kyc/not-a-uuid', adminTok);
    if (rBad.status === 400 && rBad.data?.error?.code === 'VALIDATION_ERROR') {
      pass('/admin/kyc/not-a-uuid -> 400 validation', 'status=400');
    } else {
      fail('/admin/kyc/not-a-uuid', `expected 400, got ${rBad.status}`);
    }
  }

  // ---------- /api/kyc and /api/verification literals ----------
  console.log('\n4. /api/kyc and /api/verification literal routes resolve');
  if (!userTok) {
    skip('user-prefix route tests', 'no active role=user row available');
  } else {
    const rStatus = await api('GET', '/kyc/status', userTok);
    if (isKycIdCatchAll(rStatus)) {
      fail('/kyc/status -> getMyKycStatus', 'SHADOWED by /:id catch-all');
    } else if (rStatus.status === 200) {
      pass('/kyc/status -> getMyKycStatus', 'status=200, not shadowed');
    } else {
      fail('/kyc/status', `expected 200, got ${rStatus.status}`);
    }

    const rMe = await api('GET', '/verification/me', userTok);
    if (rMe.status === 200) {
      pass('/verification/me -> getMyVerificationStatus', 'status=200');
    } else {
      fail('/verification/me', `expected 200, got ${rMe.status}`);
    }
  }

  // ---------- Authorization still enforced on the admin prefix ----------
  console.log('\n5. Authorization still enforced after mounting change');
  if (!userTok) {
    skip('non-admin denial on admin prefix', 'no active role=user row available');
  } else {
    const r = await api('GET', '/admin/stats', userTok);
    if (r.status === 403) {
      pass('non-admin GET /admin/stats -> 403', 'status=403');
    } else {
      fail('non-admin GET /admin/stats', `expected 403, got ${r.status}`);
    }
  }

  const rAnon = await api('GET', '/admin/stats', null);
  if (rAnon.status === 401) {
    pass('anonymous GET /admin/stats -> 401', 'status=401');
  } else {
    fail('anonymous GET /admin/stats', `expected 401, got ${rAnon.status}`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}`);
  process.exit(failed > 0 ? 1 : 0);
})();
