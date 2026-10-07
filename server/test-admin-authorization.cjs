/**
 * ============================================================================
 * Admin Authorization Hardening Tests
 * ============================================================================
 *
 * Proves that authorization is decided from the CURRENT database record, not
 * from the JWT role claim:
 *
 *   1. normal user cannot access admin endpoints
 *   2. admin can access admin endpoints
 *   3. a revoked (demoted) admin cannot keep using a stale token
 *   4. a deactivated admin cannot keep using a stale token
 *
 * Requirement for tests 3 and 4: an EXISTING admin account, supplied via
 *   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
 * Those tests mutate the admin's role/is_active and then RESTORE the original
 * values. They are skipped when credentials are absent.
 *
 * The demote/deactivate steps write to the database. They are guarded by an
 * explicit opt-in so this file never mutates a database by accident:
 *   ALLOW_ADMIN_MUTATION_TESTS=true
 *
 * Run: cd server && node test-admin-authorization.cjs
 */

const crypto = require('crypto');
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
const ALLOW_MUTATION = process.env.ALLOW_ADMIN_MUTATION_TESTS === 'true';

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(name, detail) {
  passed++;
  console.log(`  PASS: ${name}${detail ? ' - ' + detail : ''}`);
}
function fail(name, detail) {
  failed++;
  console.log(`  FAIL: ${name}${detail ? ' - ' + detail : ''}`);
}
function skip(name, detail) {
  skipped++;
  console.log(`  SKIP: ${name}${detail ? ' - ' + detail : ''}`);
}

async function api(method, p, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + p, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

/** Mint an access token with arbitrary claims (used to simulate a stale token). */
function mintToken(userId, email, role) {
  return jwt.sign(
    { userId, email, role, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m', issuer: 'yorbuddy-api' }
  );
}

(async () => {
  console.log('\n=== ADMIN AUTHORIZATION HARDENING TESTS ===\n');

  // ---------------- Test 1: unauthenticated ----------------
  console.log('1. Unauthenticated access to admin endpoints');
  try {
    const r = await api('GET', '/admin/stats', null, null);
    if (r.status === 401) pass('no token -> 401', `status=${r.status}`);
    else fail('no token -> 401', `expected 401, got ${r.status}`);
  } catch (e) { fail('unauthenticated check', e.message); }

  // ---------------- Test 2: normal user denied ----------------
  console.log('\n2. Normal user cannot access admin endpoints');
  try {
    const { data: normal } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('role', 'user')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!normal) {
      skip('normal user denied', 'no active role=user row available');
    } else {
      const tok = mintToken(normal.id, normal.email, 'user');
      const r = await api('GET', '/admin/stats', null, tok);
      if (r.status === 403) pass('role=user -> 403', `status=${r.status}`);
      else fail('role=user -> 403', `expected 403, got ${r.status}`);
    }
  } catch (e) { fail('normal user denied', e.message); }

  // ---------------- Test 3: forged admin claim rejected ----------------
  console.log('\n3. Forged admin role claim is ignored (DB is authoritative)');
  try {
    const { data: normal } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('role', 'user')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!normal) {
      skip('forged admin claim', 'no active role=user row available');
    } else {
      // Token SAYS admin; database says user. Database must win.
      const forged = mintToken(normal.id, normal.email, 'admin');
      const r = await api('GET', '/admin/stats', null, forged);
      if (r.status === 403) {
        pass('token claims admin but DB role=user -> 403', `status=${r.status}`);
      } else {
        fail('forged admin claim rejected', `SECURITY: expected 403, got ${r.status}`);
      }
    }
  } catch (e) { fail('forged admin claim', e.message); }

  // ---------------- Test 4: real admin allowed ----------------
  console.log('\n4. Admin can access admin endpoints');
  try {
    const { data: admin } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('role', 'admin')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!admin) {
      skip('admin allowed', 'no active role=admin row available');
    } else {
      const tok = mintToken(admin.id, admin.email, 'admin');
      const r = await api('GET', '/admin/stats', null, tok);
      if (r.status === 200) pass('role=admin -> 200', 'status=200');
      else fail('admin allowed', `expected 200, got ${r.status}`);
    }
  } catch (e) { fail('admin allowed', e.message); }

  // ---------------- Test 5: stale token after demotion ----------------
  console.log('\n5. Demoted admin cannot keep using a stale token');
  if (!ALLOW_MUTATION) {
    skip('stale token after demotion', 'set ALLOW_ADMIN_MUTATION_TESTS=true to enable (mutates then restores a role)');
  } else {
    let admin = null;
    let originalRole = null;
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, role, is_active')
        .eq('role', 'admin')
        .eq('is_active', true)
        .limit(1)
        .single();
      admin = data;
      if (!admin) throw new Error('no active admin row available');
      originalRole = admin.role;

      // Token issued WHILE the account was still an admin.
      const staleToken = mintToken(admin.id, admin.email, 'admin');

      // Confirm it works before the change.
      const before = await api('GET', '/admin/stats', null, staleToken);
      if (before.status !== 200) throw new Error(`precondition failed: expected 200, got ${before.status}`);

      // Demote in the database.
      const { error } = await supabase
        .from('users')
        .update({ role: 'user' })
        .eq('id', admin.id);
      if (error) throw error;

      // Same token must now be refused.
      const after = await api('GET', '/admin/stats', null, staleToken);
      if (after.status === 403) {
        pass('demoted admin, stale token -> 403', `status=${after.status}`);
      } else {
        fail('demoted admin rejected', `SECURITY: expected 403, got ${after.status}`);
      }
    } catch (e) {
      fail('stale token after demotion', e.message);
    } finally {
      if (admin && originalRole) {
        const { error } = await supabase.from('users').update({ role: originalRole }).eq('id', admin.id);
        console.log(error ? `  WARN: restore failed - ${error.message}` : '  (restored original role)');
      }
    }
  }

  // ---------------- Test 6: stale token after deactivation ----------------
  console.log('\n6. Deactivated admin cannot keep using a stale token');
  if (!ALLOW_MUTATION) {
    skip('stale token after deactivation', 'set ALLOW_ADMIN_MUTATION_TESTS=true to enable (mutates then restores is_active)');
  } else {
    let admin = null;
    let originalActive = null;
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, role, is_active')
        .eq('role', 'admin')
        .eq('is_active', true)
        .limit(1)
        .single();
      admin = data;
      if (!admin) throw new Error('no active admin row available');
      originalActive = admin.is_active;

      const staleToken = mintToken(admin.id, admin.email, 'admin');

      const before = await api('GET', '/admin/stats', null, staleToken);
      if (before.status !== 200) throw new Error(`precondition failed: expected 200, got ${before.status}`);

      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', admin.id);
      if (error) throw error;

      const after = await api('GET', '/admin/stats', null, staleToken);
      if (after.status === 403 || after.status === 401) {
        pass('deactivated admin, stale token -> 401/403', `status=${after.status}`);
      } else {
        fail('deactivated admin rejected', `SECURITY: expected 401/403, got ${after.status}`);
      }
    } catch (e) {
      fail('stale token after deactivation', e.message);
    } finally {
      if (admin && originalActive !== null) {
        const { error } = await supabase.from('users').update({ is_active: originalActive }).eq('id', admin.id);
        console.log(error ? `  WARN: restore failed - ${error.message}` : '  (restored is_active)');
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}`);
  if (!ALLOW_MUTATION) {
    console.log('\nNote: tests 5 and 6 (the stale-token cases) were skipped.');
    console.log('Run with ALLOW_ADMIN_MUTATION_TESTS=true to exercise them.');
  }
  process.exit(failed > 0 ? 1 : 0);
})();
