/**
 * Focused security probe for remediation steps:
 *   Step 1: Telegram webhook secret validation
 *   Step 2: Facebook route auth (authenticate + requireRole('admin'))
 *
 * Read-only — does not modify any data.
 */
const fs = require('fs');
const path = require('path');
const jwt = require(path.join(process.cwd(), 'node_modules/jsonwebtoken'));
const { createClient } = require(path.join(process.cwd(), 'node_modules/@supabase/supabase-js'));

// Load .env
const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const i = line.indexOf('=');
  if (i > 0) env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

const results = [];
function pass(name, detail) { results.push({ name, status: 'PASS', detail }); console.log('  PASS: ' + name + (detail ? ' - ' + detail : '')); }
function fail(name, detail, error) { results.push({ name, status: 'FAIL', detail, error: error?.message || String(error) }); console.log('  FAIL: ' + name + (detail ? ' - ' + detail : '') + (error ? ' | ' + error.message : '')); }

async function api(method, reqPath, body, token, extraHeaders) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch('http://localhost:3001' + reqPath, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

(async () => {
  // ── Step 1: Telegram webhook secret validation ──────────────────────────
  console.log('\n=== Step 1: Telegram webhook secret validation ===');

  // 1a: No secret header → 403
  try {
    const res = await api('POST', '/api/telegram/webhook', { update_id: 1 });
    if (res.status !== 403) throw new Error('Expected 403, got ' + res.status);
    pass('Webhook without secret header rejected', 'status=403');
  } catch (err) { fail('1a: No secret header', null, err); }

  // 1b: Wrong secret header → 403
  try {
    const res = await api('POST', '/api/telegram/webhook', { update_id: 1 }, null, {
      'X-Telegram-Bot-Api-Secret-Token': 'wrong-secret-token-12345'
    });
    if (res.status !== 403) throw new Error('Expected 403, got ' + res.status);
    pass('Webhook with wrong secret rejected', 'status=403');
  } catch (err) { fail('1b: Wrong secret', null, err); }

  // 1c: Correct secret header → 200 (or at least not 403)
  const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    try {
      const res = await api('POST', '/api/telegram/webhook', { update_id: 1, message: { message_id: 1, chat: { id: parseInt(env.TELEGRAM_CHAT_ID) || 0 }, from: { id: 1 }, text: '/status' } }, null, {
        'X-Telegram-Bot-Api-Secret-Token': webhookSecret
      });
      if (res.status === 403) throw new Error('Expected non-403, got 403');
      pass('Webhook with correct secret accepted', 'status=' + res.status);
    } catch (err) { fail('1c: Correct secret', null, err); }
  } else {
    console.log('  SKIP: 1c — TELEGRAM_WEBHOOK_SECRET not set in .env');
  }

  // 1d: Empty secret header → 403
  try {
    const res = await api('POST', '/api/telegram/webhook', { update_id: 1 }, null, {
      'X-Telegram-Bot-Api-Secret-Token': ''
    });
    if (res.status !== 403) throw new Error('Expected 403, got ' + res.status);
    pass('Webhook with empty secret rejected', 'status=403');
  } catch (err) { fail('1d: Empty secret', null, err); }

  // ── Step 2: Facebook route auth ─────────────────────────────────────────
  console.log('\n=== Step 2: Facebook route auth ===');

  // 2a: Unauthenticated → 401
  try {
    const res = await api('GET', '/api/facebook/status');
    if (res.status !== 401) throw new Error('Expected 401, got ' + res.status);
    pass('Facebook route unauthenticated rejected', 'status=401');
  } catch (err) { fail('2a: Unauthenticated', null, err); }

  // 2b: Normal user (non-admin) → 403
  try {
    const userToken = jwt.sign(
      { userId: 'b7b02ed0-778b-4596-910b-d32718b3db89', email: 'testuser@example.com', role: 'user', type: 'access' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m', issuer: 'yorbuddy-api' }
    );
    const res = await api('GET', '/api/facebook/status', null, userToken);
    if (res.status !== 403) throw new Error('Expected 403, got ' + res.status);
    pass('Facebook route rejected for normal user', 'status=403');
  } catch (err) { fail('2b: Normal user', null, err); }

  // 2c: Active admin → not 401/403 (200 or 503 depending on FB config)
  try {
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('role', 'admin')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!adminUser) throw new Error('No active admin found in database');

    const adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: 'admin', type: 'access' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m', issuer: 'yorbuddy-api' }
    );
    const res = await api('GET', '/api/facebook/status', null, adminToken);
    if (res.status === 401 || res.status === 403) throw new Error('Expected non-401/403, got ' + res.status);
    pass('Facebook route allowed for active admin', 'status=' + res.status);
  } catch (err) { fail('2c: Active admin', null, err); }

  // 2d: Disabled admin → 403
  try {
    const { data: disabledAdmin } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('role', 'admin')
      .eq('is_active', false)
      .limit(1)
      .single();

    if (!disabledAdmin) {
      console.log('  SKIP: 2d — No disabled admin found in database');
    } else {
      const disabledToken = jwt.sign(
        { userId: disabledAdmin.id, email: disabledAdmin.email, role: 'admin', type: 'access' },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m', issuer: 'yorbuddy-api' }
      );
      const res = await api('GET', '/api/facebook/status', null, disabledToken);
      if (res.status !== 403) throw new Error('Expected 403, got ' + res.status);
      pass('Facebook route rejected for disabled admin', 'status=403');
    }
  } catch (err) { fail('2d: Disabled admin', null, err); }

  // 2e: Invalid token → 401
  try {
    const res = await api('GET', '/api/facebook/status', null, 'invalid-token-here');
    if (res.status !== 401) throw new Error('Expected 401, got ' + res.status);
    pass('Facebook route rejected for invalid token', 'status=401');
  } catch (err) { fail('2e: Invalid token', null, err); }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n=== REMEDIATION TEST SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log('PASSED: ' + passed + '  FAILED: ' + failed);
  if (failed > 0) {
    console.log('\nFAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log('  [FAIL] ' + r.name + ': ' + r.error));
  }
  process.exit(failed > 0 ? 1 : 0);
})();
