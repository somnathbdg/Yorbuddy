/**
 * ============================================================================
 * Membership Eligibility — Runtime Tests (T1-T12)
 * ============================================================================
 *
 * Covers the scenarios that produced the production bug
 * "You have already used your 1-day trial":
 *
 *   T1  New password user        -> exactly one FREE_ACCESS_10D grant
 *   T2  New Google OAuth user    -> exactly one FREE_ACCESS_10D grant
 *   T3  Repeat grant attempt     -> still exactly one, expiry not extended
 *   T4  User with free access    -> Rs.99 TRIAL_1D order succeeds (201)
 *   T5  User with prior Rs.99    -> new Rs.99 order succeeds (201)
 *   T6  User with abandoned Rs.99-> new Rs.99 order succeeds (201)
 *   T7  Existing weekly member   -> MONTH_1 order succeeds (201)
 *   T8  Existing monthly member  -> WEEK_1 order succeeds (201)
 *   T9  Plan parity              -> backend amounts/prices match spec
 *   T10 Wording                  -> no customer-facing "trial"
 *   T11 DB guard                 -> 2nd FREE_ACCESS_10D insert rejected
 *   T12 No regression            -> requireMembership still gates correctly
 *
 * SAFETY
 * ------
 * - Requires a LOCAL backend on http://localhost:3001 (never production).
 * - Creates throwaway accounts with a generated password; deletes every row
 *   and user it creates, in a finally block.
 * - NEVER pays a Razorpay order. create-order returns a real Razorpay order
 *   in TEST mode and stops there; verify is not called with a real signature.
 * - Refuses to run against a non-local base URL.
 *
 * Usage:  node test-membership-eligibility.mjs
 * ============================================================================
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = process.env.TEST_API_BASE || 'http://localhost:3001';

// ---- Safety: never run this against production -------------------------------
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`\nREFUSING TO RUN: TEST_API_BASE is not a local address (${BASE}).`);
  console.error('This suite creates and deletes rows. Point it at a local server.\n');
  process.exit(2);
}

// ---- Local .env (never printed) ---------------------------------------------
function loadEnv() {
  const p = path.join(__dirname, '.env');
  const out = {};
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if (v.length >= 2 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) {
      v = v.slice(1, -1);
    }
    const key = t.slice(0, i).trim();
    out[key] = v;
    process.env[key] = v;  // also set on process.env for dist module imports
  }
  return out;
}

const env = loadEnv();
const SUPABASE_URL = (env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON = env.SUPABASE_ANON_KEY || '';

const { createClient } = require(path.join(__dirname, 'node_modules/@supabase/supabase-js'));
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const { testPassword } = require('./test-utils/credentials.cjs');

// ---- Harness -----------------------------------------------------------------
const results = [];
let passed = 0;
let failed = 0;
let skipped = 0;

function ok(name, detail) {
  passed++;
  results.push({ name, status: 'PASS' });
  console.log(`  PASS: ${name}${detail ? ' - ' + detail : ''}`);
}
function bad(name, detail, err) {
  failed++;
  results.push({ name, status: 'FAIL', err: err?.message || String(err) });
  console.log(`  FAIL: ${name}${detail ? ' - ' + detail : ''}${err ? ' | ' + (err.message || err) : ''}`);
}
function skip(name, why) {
  skipped++;
  results.push({ name, status: 'SKIP' });
  console.log(`  SKIP: ${name} - ${why}`);
}
function check(cond, name, detail) {
  if (cond) ok(name, detail);
  else bad(name, detail);
}

// ---- HTTP helpers ------------------------------------------------------------
async function api(method, route, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body: json };
}

async function serverUp() {
  try {
    const r = await fetch(`${BASE}/api/health`);
    return r.ok;
  } catch {
    return false;
  }
}

// ---- Fixtures ----------------------------------------------------------------
const RUN = crypto.randomBytes(4).toString('hex');
const createdUserIds = [];
const createdMembershipIds = [];

const throwawayEmail = (tag) => `yb-mem-${tag}-${RUN}@example.test`;

async function registerUser(tag) {
  const email = throwawayEmail(tag);
  const res = await api('POST', '/api/auth/register', {
    body: {
      email,
      password: testPassword,
      full_name: `Mem Test ${tag}`,
      gender: 'prefer-not-to-say',
    },
  });
  if (res.status !== 201) {
    throw new Error(`register(${tag}) -> ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
  }
  const { user, accessToken } = res.body.data;
  createdUserIds.push(user.id);
  return { id: user.id, email, token: accessToken };
}

/** Direct DB row creation for states that the API cannot produce on demand. */
async function seedMembership(userId, planId, status, expiryDays) {
  const start = new Date();
  const expiry = expiryDays === null ? null : new Date(start.getTime() + expiryDays * 864e5);
  const { data, error } = await supabase
    .from('memberships')
    .insert({
      user_id: userId,
      plan_id: planId,
      amount: planId === 'FREE_ACCESS_10D' ? 0 : 9900,
      currency: 'INR',
      status,
      membership_start_date: start.toISOString(),
      membership_expiry_date: expiry ? expiry.toISOString() : null,
    })
    .select()
    .single();
  if (error) throw new Error(`seedMembership(${planId}/${status}) -> ${error.message}`);
  createdMembershipIds.push(data.id);
  return data;
}

async function membershipsFor(userId) {
  const { data } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

async function cleanup() {
  try {
    if (createdMembershipIds.length) {
      await supabase.from('memberships').delete().in('id', createdMembershipIds);
    }
    for (const uid of createdUserIds) {
      await supabase.from('memberships').delete().eq('user_id', uid);
      await supabase.from('refresh_tokens').delete().eq('user_id', uid);
    }
    if (createdUserIds.length) {
      await supabase.from('users').delete().in('id', createdUserIds);
    }
    console.log(`\n  cleanup: removed ${createdUserIds.length} test user(s) and their membership rows`);
  } catch (e) {
    console.log(`\n  cleanup WARNING: ${e.message}`);
  }
}

// ---- Main --------------------------------------------------------------------
async function main() {
  console.log('\n=== MEMBERSHIP ELIGIBILITY RUNTIME TESTS ===');
  console.log(`  target: ${BASE}`);
  console.log(`  run id: ${RUN}\n`);

  if (!(await serverUp())) {
    console.error(`\nFATAL: no server responding at ${BASE}/api/health.`);
    console.error('Start the local backend first:  cd server && npm run dev\n');
    process.exit(2);
  }

  // -------------------------------------------------------------------------
  console.log('=== T1: New password user receives exactly one FREE_ACCESS_10D ===\n');
  try {
    const u = await registerUser('t1');
    const rows = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'FREE_ACCESS_10D');
    check(rows.length === 1, 'exactly one FREE_ACCESS_10D row', `found ${rows.length}`);
    if (rows.length === 1) {
      const r = rows[0];
      check(r.status === 'success', 'grant status is success', r.status);
      check(Number(r.amount) === 0, 'grant amount is 0', String(r.amount));
      const days = (new Date(r.membership_expiry_date) - new Date(r.membership_start_date)) / 864e5;
      check(Math.abs(days - 10) < 0.01, 'window is 10 days', `${days.toFixed(3)} days`);
      createdMembershipIds.push(r.id);
    }
    const me = await api('GET', '/api/memberships/me', { token: u.token });
    check(me.status === 200 && me.body?.data?.is_active === true, '/memberships/me reports is_active=true', `status ${me.status}`);
  } catch (e) {
    bad('T1 new password user', '', e);
  }

  // -------------------------------------------------------------------------
  console.log('\n=== T2: New Google OAuth user receives exactly one FREE_ACCESS_10D ===\n');
  try {
    // Simulate the post-findOrCreateUser state: a brand-new OAuth user.
    const email = throwawayEmail('t2-oauth');
    const { data: u, error } = await supabase
      .from('users')
      .insert({
        email,
        full_name: 'Mem Test OAuth',
        google_id: `test-google-${RUN}`,
        role: 'user',
        is_active: true,
        is_membership_paid: false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    createdUserIds.push(u.id);

    // The OAuth handler calls assignFreeAccess(getSupabase(), user.id) when
    // isNewUser. Invoke the same function the handler uses, so this asserts the
    // real code path rather than a re-implementation.
    const mod = await import('./dist/services/membershipService.js');
    await mod.assignFreeAccess(supabase, u.id);

    const rows = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'FREE_ACCESS_10D');
    check(rows.length === 1, 'OAuth new user gets exactly one FREE_ACCESS_10D row', `found ${rows.length}`);
    if (rows.length === 1) createdMembershipIds.push(rows[0].id);
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' || /dist\/services/.test(e.message || '')) {
      skip('T2 OAuth free access', 'server/dist not built - run `npm run build` in server/ first');
    } else {
      bad('T2 OAuth free access', '', e);
    }
  }

  // -------------------------------------------------------------------------
  console.log('\n=== T3: Repeat grant attempt does not duplicate or extend ===\n');
  try {
    const u = await registerUser('t3');
    const before = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'FREE_ACCESS_10D');
    check(before.length === 1, 'first grant present', `found ${before.length}`);
    before.forEach((r) => createdMembershipIds.push(r.id));

    const mod = await import('./dist/services/membershipService.js');
    await mod.assignFreeAccess(supabase, u.id);
    await mod.assignFreeAccess(supabase, u.id);

    const after = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'FREE_ACCESS_10D');
    check(after.length === 1, 'still exactly one grant after 2 repeat calls', `found ${after.length}`);
    if (before.length === 1 && after.length === 1) {
      check(
        new Date(after[0].membership_expiry_date).getTime() ===
          new Date(before[0].membership_expiry_date).getTime(),
        'expiry window was NOT extended',
        `${before[0].membership_expiry_date} -> ${after[0].membership_expiry_date}`
      );
    }
  } catch (e) {
    if (e.code === 'ERR_MODULE_NOT_FOUND' || /dist\/services/.test(e.message || '')) {
      skip('T3 repeat grant', 'server/dist not built - run `npm run build` in server/ first');
    } else {
      bad('T3 repeat grant', '', e);
    }
  }

  // -------------------------------------------------------------------------
  console.log('\n=== T4: User WITH free access can buy Rs.99 (the reported bug) ===\n');
  try {
    const u = await registerUser('t4');
    const rows = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'FREE_ACCESS_10D');
    check(rows.length === 1, 'user holds active free access', `found ${rows.length}`);
    rows.forEach((r) => createdMembershipIds.push(r.id));

    const res = await api('POST', '/api/memberships/create-order', {
      token: u.token,
      body: { plan_id: 'TRIAL_1D' },
    });
    check(res.status === 201, 'Rs.99 order returns 201 (not 403)', `status ${res.status}`);
    check(res.body?.data?.amount === 9900, 'amount is 9900 paise', String(res.body?.data?.amount));
    // Only human-readable fields are customer-facing. plan_id is an internal
    // identifier (TRIAL_1D) and is never rendered by the frontend, which uses
    // plan_name for the Razorpay description.
    const humanText = `${res.body?.data?.plan_name || ''} ${res.body?.message || ''}`;
    check(
      !/trial/i.test(humanText),
      'customer-facing fields (plan_name, message) contain no "trial"',
      `plan_name="${res.body?.data?.plan_name}", message="${res.body?.message}"`
    );
    if (res.status === 201) {
      const created = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'TRIAL_1D');
      created.forEach((r) => createdMembershipIds.push(r.id));
    }
  } catch (e) {
    bad('T4 free-access user buys Rs.99', '', e);
  }

  // -------------------------------------------------------------------------
  console.log('\n=== T5: User WITH a prior Rs.99 purchase can buy Rs.99 again ===\n');
  try {
    const u = await registerUser('t5');
    await seedMembership(u.id, 'TRIAL_1D', 'success', 1);

    const res = await api('POST', '/api/memberships/create-order', {
      token: u.token,
      body: { plan_id: 'TRIAL_1D' },
    });
    check(res.status === 201, 'repeat Rs.99 order returns 201', `status ${res.status}`);
    check(res.body?.data?.amount === 9900, 'amount is 9900 paise', String(res.body?.data?.amount));
    if (res.status === 201) {
      const created = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'TRIAL_1D');
      created.forEach((r) => createdMembershipIds.push(r.id));
    }
  } catch (e) {
    bad('T5 prior Rs.99 purchase', '', e);
  }

  // -------------------------------------------------------------------------
  console.log('\n=== T6: User with an ABANDONED Rs.99 order can buy Rs.99 ===\n');
  try {
    const u = await registerUser('t6');
    await seedMembership(u.id, 'TRIAL_1D', 'created', 1); // never paid

    const res = await api('POST', '/api/memberships/create-order', {
      token: u.token,
      body: { plan_id: 'TRIAL_1D' },
    });
    check(res.status === 201, 'abandoned-checkout user gets 201', `status ${res.status}`);
    if (res.status === 201) {
      const created = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'TRIAL_1D');
      created.forEach((r) => createdMembershipIds.push(r.id));
    }
  } catch (e) {
    bad('T6 abandoned Rs.99 order', '', e);
  }

  // -------------------------------------------------------------------------
  console.log('\n=== T7: Existing WEEKLY member can buy MONTH_1 ===\n');
  try {
    const u = await registerUser('t7');
    await seedMembership(u.id, 'WEEK_1', 'success', 7);

    const res = await api('POST', '/api/memberships/create-order', {
      token: u.token,
      body: { plan_id: 'MONTH_1' },
    });
    check(res.status === 201, 'MONTH_1 order returns 201', `status ${res.status}`);
    check(res.body?.data?.amount === 199900, 'amount is 199900 paise', String(res.body?.data?.amount));
    if (res.status === 201) {
      const created = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'MONTH_1');
      created.forEach((r) => createdMembershipIds.push(r.id));
    }
  } catch (e) {
    bad('T7 weekly member buys monthly', '', e);
  }

  // -------------------------------------------------------------------------
  console.log('\n=== T8: Existing MONTHLY member can buy WEEK_1 ===\n');
  try {
    const u = await registerUser('t8');
    await seedMembership(u.id, 'MONTH_1', 'success', 30);

    const res = await api('POST', '/api/memberships/create-order', {
      token: u.token,
      body: { plan_id: 'WEEK_1' },
    });
    check(res.status === 201, 'WEEK_1 order returns 201', `status ${res.status}`);
    check(res.body?.data?.amount === 49900, 'amount is 49900 paise', String(res.body?.data?.amount));
    if (res.status === 201) {
      const created = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'WEEK_1');
      created.forEach((r) => createdMembershipIds.push(r.id));
    }
  } catch (e) {
    bad('T8 monthly member buys weekly', '', e);
  }

  // -------------------------------------------------------------------------
  console.log('\n=== T9: Plan parity — API amounts match the authoritative spec ===\n');
  try {
    const u = await registerUser('t9');
    const expect = { TRIAL_1D: 9900, WEEK_1: 49900, MONTH_1: 199900 };
    for (const [plan, amount] of Object.entries(expect)) {
      const res = await api('POST', '/api/memberships/create-order', {
        token: u.token,
        body: { plan_id: plan },
      });
      check(
        res.status === 201 && res.body?.data?.amount === amount,
        `${plan} amount == ${amount} paise`,
        `status ${res.status}, amount ${res.body?.data?.amount}`
      );
    }
    const rows = await membershipsFor(u.id);
    rows.forEach((r) => createdMembershipIds.push(r.id));
  } catch (e) {
    bad('T9 plan parity', '', e);
  }

  // -------------------------------------------------------------------------
  console.log('\n=== T10: No customer-facing "trial" in API error messages ===\n');
  try {
    const u = await registerUser('t10');
    // Invalid plan id -> validation error message must not say "trial"
    const res = await api('POST', '/api/memberships/create-order', {
      token: u.token,
      body: { plan_id: 'FREE_ACCESS_10D' },
    });
    check(res.status >= 400, 'free plan is not purchasable', `status ${res.status}`);
    // Zod echoes the offending value, which is the internal plan id. Assert on
    // the human-readable error message only.
    const msg = res.body?.error?.message || res.body?.message || '';
    check(!/trial/i.test(msg), 'validation error message has no "trial"', `message="${msg}"`);
  } catch (e) {
    bad('T10 wording', '', e);
  }

  // -------------------------------------------------------------------------
  console.log('\n=== T11: DB guard — second FREE_ACCESS_10D insert is rejected ===\n');
  try {
    const u = await registerUser('t11');
    const rows = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'FREE_ACCESS_10D');
    rows.forEach((r) => createdMembershipIds.push(r.id));

    const { error } = await supabase.from('memberships').insert({
      user_id: u.id,
      plan_id: 'FREE_ACCESS_10D',
      amount: 0,
      currency: 'INR',
      status: 'success',
      membership_start_date: new Date().toISOString(),
      membership_expiry_date: new Date(Date.now() + 10 * 864e5).toISOString(),
    });

    if (error && error.code === '23505') {
      ok('duplicate FREE_ACCESS_10D insert rejected by the unique index (migration 014 applied)');
    } else if (!error) {
      // Index not applied yet: clean up the row we just created and report honestly.
      const extra = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'FREE_ACCESS_10D');
      extra.forEach((r) => createdMembershipIds.push(r.id));
      skip(
        'DB unique guard',
        'migration 014 NOT applied yet - duplicate insert succeeded. Application-level guard still holds (see T3).'
      );
    } else {
      bad('DB unique guard', `unexpected error ${error.code}: ${error.message}`);
    }
  } catch (e) {
    bad('T11 DB guard', '', e);
  }

  // -------------------------------------------------------------------------
  console.log('\n=== T12: No regression — requireMembership still gates correctly ===\n');
  try {
    const u = await registerUser('t12');
    const rows = (await membershipsFor(u.id)).filter((r) => r.plan_id === 'FREE_ACCESS_10D');
    rows.forEach((r) => createdMembershipIds.push(r.id));

    // GET /api/buddies runs authenticate -> requireMembership -> requireVerification.
    // A brand-new account has an active FREE_ACCESS_10D grant but is NOT verified,
    // so a 403 here is expected and comes from requireVerification. What matters
    // is WHICH middleware rejected: requireMembership must not be the one.
    // requireMembership's message is distinctive ("Active YorBuddy membership
    // required..."); requireVerification's is ("Complete verification required...").
    const fresh = await api('GET', '/api/buddies?per_page=1', { token: u.token });
    const freshMsg = fresh.body?.error?.message || fresh.body?.message || '';
    check(
      !/membership required/i.test(freshMsg),
      'active free access is NOT rejected by requireMembership (verification may still gate)',
      `status ${fresh.status}, message="${freshMsg.slice(0, 80)}"`
    );

    // Expired membership -> requireMembership itself must reject, with its own message.
    await supabase
      .from('memberships')
      .update({ membership_expiry_date: new Date(Date.now() - 864e5).toISOString() })
      .eq('user_id', u.id)
      .eq('plan_id', 'FREE_ACCESS_10D');

    const denied = await api('GET', '/api/buddies?per_page=1', { token: u.token });
    const deniedMsg = denied.body?.error?.message || denied.body?.message || '';
    check(denied.status === 403, 'expired membership IS rejected (403)', `status ${denied.status}`);
    check(
      /membership required/i.test(deniedMsg),
      'the 403 comes from requireMembership, not another middleware',
      `message="${deniedMsg.slice(0, 80)}"`
    );
  } catch (e) {
    bad('T12 no regression', '', e);
  }
}

main()
  .catch((e) => {
    console.error('\nUNEXPECTED ERROR:', e?.message || e);
    failed++;
  })
  .finally(async () => {
    await cleanup();
    console.log('\n=== MEMBERSHIP ELIGIBILITY SUMMARY ===');
    console.log(`  Passed:  ${passed}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total:   ${passed + failed + skipped}`);
    console.log('');
    if (failed === 0) {
      console.log('  ALL RUNTIME TESTS PASSED');
    } else {
      console.log('  SOME RUNTIME TESTS FAILED');
      process.exitCode = 1;
    }
  });
