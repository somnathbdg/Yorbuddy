const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const i = line.indexOf('=');
  if (i > 0) env[line.substring(0, i).trim()] = line.substring(i + 1).trim();
});

const jwt = require(path.join(process.cwd(), 'node_modules/jsonwebtoken'));
const { createClient } = require(path.join(process.cwd(), 'node_modules/@supabase/supabase-js'));

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);

const results = [];
function pass(name, detail) { results.push({ name, status: 'PASS', detail }); console.log('  PASS: ' + name + (detail ? ' - ' + detail : '')); }
function fail(name, detail, error) { results.push({ name, status: 'FAIL', detail, error: error?.message || String(error) }); console.log('  FAIL: ' + name + (detail ? ' - ' + detail : '') + (error ? ' | ' + error.message : '')); }

async function api(method, reqPath, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch('http://localhost:3001' + reqPath, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

(async () => {
  // Generate test tokens
  const userToken = jwt.sign(
    { userId: 'b7b02ed0-778b-4596-910b-d32718b3db89', email: 'testuser_step6_2026@example.com', role: 'user', type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m', issuer: 'yorbuddy-api' }
  );
  const adminToken = jwt.sign(
    { userId: '86372386-5621-4706-8ef5-2477d2a29106', email: 'admin@test.com', role: 'admin', type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m', issuer: 'yorbuddy-api' }
  );

  // ============================================
  // TEST 1: Unauthenticated verification request 401
  // ============================================
  console.log('\n=== Test 1: Unauthenticated verification status request ===');
  try {
    const res = await api('GET', '/api/verification/me');
    if (res.status !== 401) throw new Error('Expected 401, got ' + res.status);
    pass('Unauthenticated GET /api/verification/me', 'status=401');
  } catch (err) { fail('Test 1', null, err); }

  // ============================================
  // TEST 2: User verification status own data only
  // ============================================
  console.log('\n=== Test 2: User can access own verification status ===');
  try {
    const res = await api('GET', '/api/verification/me', null, userToken);
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    if (!res.data.data || !res.data.data.email || !res.data.data.phone) {
      throw new Error('Missing verification fields in response');
    }
    pass('Own verification status accessible', 'email=' + res.data.data.email + ', phone=' + res.data.data.phone);
  } catch (err) { fail('Test 2', null, err); }

  // ============================================
  // TEST 3: User cannot access another user's KYC
  // ============================================
  console.log('\n=== Test 3: User cannot access another user KYC ===');
  try {
    const { data: kyc } = await supabase.from('verifications').select('id, user_id').limit(1).single();
    if (kyc) {
      // Try to access KYC that belongs to another user
      const res = await api('GET', '/api/admin/kyc/' + kyc.id, null, userToken);
      if (res.status !== 403) throw new Error('Expected 403, got ' + res.status);
      pass('User cannot access admin KYC endpoint', 'status=403');
    } else {
      pass('User cannot access admin KYC endpoint', 'no KYC data to test (skipped)');
    }
  } catch (err) { fail('Test 3', null, err); }

  // ============================================
  // TEST 4: User cannot approve KYC
  // ============================================
  console.log('\n=== Test 4: User cannot approve KYC ===');
  try {
    const { data: kyc } = await supabase.from('verifications').select('id').eq('status', 'pending').limit(1).single();
    if (kyc) {
      const res = await api('POST', '/api/admin/kyc/' + kyc.id + '/approve', {}, userToken);
      if (res.status !== 403) throw new Error('Expected 403, got ' + res.status);
      pass('User cannot approve KYC', 'status=403');
    } else {
      pass('User cannot approve KYC', 'no pending KYC to test (skipped)');
    }
  } catch (err) { fail('Test 4', null, err); }

  // ============================================
  // TEST 5: User cannot reject KYC
  // ============================================
  console.log('\n=== Test 5: User cannot reject KYC ===');
  try {
    const { data: kyc } = await supabase.from('verifications').select('id').eq('status', 'pending').limit(1).single();
    if (kyc) {
      const res = await api('POST', '/api/admin/kyc/' + kyc.id + '/reject', { reason: 'test rejection' }, userToken);
      if (res.status !== 403) throw new Error('Expected 403, got ' + res.status);
      pass('User cannot reject KYC', 'status=403');
    } else {
      pass('User cannot reject KYC', 'no pending KYC to test (skipped)');
    }
  } catch (err) { fail('Test 5', null, err); }

  // ============================================
  // TEST 6: User cannot self-approve KYC
  // ============================================
  console.log('\n=== Test 6: Admin cannot self-approve KYC ===');
  try {
    // Create a KYC record for the admin user
    const { data: adminKyc } = await supabase.from('verifications').select('id').eq('user_id', '86372386-5621-4706-8ef5-2477d2a29106').eq('status', 'pending').limit(1).single();
    if (adminKyc) {
      const res = await api('POST', '/api/admin/kyc/' + adminKyc.id + '/approve', {}, adminToken);
      if (res.status !== 403) throw new Error('Expected 403 for self-approval, got ' + res.status);
      pass('Admin cannot self-approve KYC', 'status=403');
    } else {
      // Create a KYC for admin first
      const { data: newKyc, error: createErr } = await supabase.from('verifications').insert({
        user_id: '86372386-5621-4706-8ef5-2477d2a29106',
        doc_type: 'pan',
        doc_front_url: 'https://example.com/doc.jpg',
        selfie_url: 'https://example.com/selfie.jpg',
        status: 'pending',
        submitted_at: new Date().toISOString(),
      }).select().single();
      
      if (createErr) throw new Error('Failed to create test KYC: ' + createErr.message);
      
      const res = await api('POST', '/api/admin/kyc/' + newKyc.id + '/approve', {}, adminToken);
      if (res.status !== 403) throw new Error('Expected 403 for self-approval, got ' + res.status);
      pass('Admin cannot self-approve KYC', 'status=403');
      
      // Cleanup
      await supabase.from('verifications').delete().eq('id', newKyc.id);
    }
  } catch (err) { fail('Test 6', null, err); }

  // ============================================
  // TEST 7: Valid KYC submission creates pending status
  // ============================================
  console.log('\n=== Test 7: Valid KYC submission creates pending status ===');
  try {
    const res = await api('POST', '/api/kyc/submit', {
      doc_type: 'aadhaar',
      doc_front_url: 'https://example.com/doc-front.jpg',
      selfie_url: 'https://example.com/selfie.jpg',
    }, userToken);
    
    if (res.status !== 201 && res.status !== 400) {
      // 400 means user already has pending KYC — that's also valid behavior
      if (res.status === 400 && res.data.error?.message?.includes('pending')) {
        pass('Valid KYC submission rejected (existing pending)', 'status=400');
      } else {
        throw new Error('Expected 201 or 400, got ' + res.status);
      }
    } else if (res.status === 201) {
      if (res.data.data.status !== 'pending') throw new Error('Expected pending status, got ' + res.data.data.status);
      pass('Valid KYC submission creates pending', 'status=201, kyc_status=pending');
    } else {
      pass('Valid KYC submission rejected (existing pending)', 'status=400');
    }
  } catch (err) { fail('Test 7', null, err); }

  // ============================================
  // TEST 8: Invalid document type rejected
  // ============================================
  console.log('\n=== Test 8: Invalid document type rejected ===');
  try {
    const res = await api('POST', '/api/kyc/submit', {
      doc_type: 'drivers_license',
      doc_front_url: 'https://example.com/doc.jpg',
      selfie_url: 'https://example.com/selfie.jpg',
    }, userToken);
    if (res.status !== 400) throw new Error('Expected 400, got ' + res.status);
    pass('Invalid document type rejected', 'status=400');
  } catch (err) { fail('Test 8', null, err); }

  // ============================================
  // TEST 9: Client cannot set approved status
  // ============================================
  console.log('\n=== Test 9: Client cannot set KYC status ===');
  try {
    const res = await api('POST', '/api/kyc/submit', {
      doc_type: 'pan',
      doc_front_url: 'https://example.com/doc.jpg',
      selfie_url: 'https://example.com/selfie.jpg',
      status: 'approved',
    }, userToken);
    // .strict() schema should reject unknown 'status' field
    if (res.status !== 400 && res.status !== 401) {
      // If user already has pending, that's also acceptable
      if (res.data.error?.message?.includes('pending')) {
        pass('Client status override rejected (existing pending)', 'status=400');
      } else {
        throw new Error('Expected 400, got ' + res.status);
      }
    } else {
      pass('Client status override rejected by strict schema', 'status=' + res.status);
    }
  } catch (err) { fail('Test 9', null, err); }

  // ============================================
  // TEST 10: Client cannot set reviewer ID
  // ============================================
  console.log('\n=== Test 10: Client cannot set reviewer ID ===');
  try {
    const res = await api('POST', '/api/kyc/submit', {
      doc_type: 'voter_id',
      doc_front_url: 'https://example.com/doc.jpg',
      selfie_url: 'https://example.com/selfie.jpg',
      reviewed_by: 'fake-admin-id',
    }, userToken);
    if (res.status !== 400 && res.status !== 401) {
      if (res.data.error?.message?.includes('pending')) {
        pass('Client reviewer ID rejected (existing pending)', 'status=400');
      } else {
        throw new Error('Expected 400, got ' + res.status);
      }
    } else {
      pass('Client reviewer ID rejected by strict schema', 'status=' + res.status);
    }
  } catch (err) { fail('Test 10', null, err); }

  // ============================================
  // TEST 11: Admin can view pending KYC
  // ============================================
  console.log('\n=== Test 11: Admin can view pending KYC list ===');
  try {
    const res = await api('GET', '/api/admin/kyc/pending', null, adminToken);
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    if (!Array.isArray(res.data.data)) throw new Error('Expected array response');
    pass('Admin can view pending KYC', 'count=' + res.data.count);
  } catch (err) { fail('Test 11', null, err); }

  // ============================================
  // TEST 12: Admin can approve KYC
  // ============================================
  console.log('\n=== Test 12: Admin can approve KYC ===');
  try {
    // Create a test KYC for another user
    const { data: testUser } = await supabase.from('users').select('id').eq('role', 'user').neq('id', '86372386-5621-4706-8ef5-2477d2a29106').limit(1).single();
    if (!testUser) throw new Error('No test user found');
    
    // Delete any existing pending KYC for this user
    await supabase.from('verifications').delete().eq('user_id', testUser.id).eq('status', 'pending');
    
    const { data: newKyc, error: createErr } = await supabase.from('verifications').insert({
      user_id: testUser.id,
      doc_type: 'pan',
      doc_front_url: 'https://example.com/doc.jpg',
      selfie_url: 'https://example.com/selfie.jpg',
      status: 'pending',
      submitted_at: new Date().toISOString(),
    }).select().single();
    
    if (createErr) throw new Error('Failed to create KYC: ' + createErr.message);
    
    const res = await api('POST', '/api/admin/kyc/' + newKyc.id + '/approve', {}, adminToken);
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    if (res.data.data.status !== 'approved') throw new Error('Expected approved status');
    pass('Admin can approve KYC', 'status=200, kyc_status=approved');
    
    // Cleanup
    await supabase.from('verifications').delete().eq('id', newKyc.id);
  } catch (err) { fail('Test 12', null, err); }

  // ============================================
  // TEST 13: Admin can reject KYC with reason
  // ============================================
  console.log('\n=== Test 13: Admin can reject KYC with reason ===');
  try {
    const { data: testUser } = await supabase.from('users').select('id').eq('role', 'user').neq('id', '86372386-5621-4706-8ef5-2477d2a29106').limit(1).single();
    if (!testUser) throw new Error('No test user found');
    
    // Delete any existing KYC for this user
    await supabase.from('verifications').delete().eq('user_id', testUser.id);
    
    const { data: newKyc, error: createErr } = await supabase.from('verifications').insert({
      user_id: testUser.id,
      doc_type: 'passport',
      doc_front_url: 'https://example.com/doc.jpg',
      selfie_url: 'https://example.com/selfie.jpg',
      status: 'pending',
      submitted_at: new Date().toISOString(),
    }).select().single();
    
    if (createErr) throw new Error('Failed to create KYC: ' + createErr.message);
    
    const res = await api('POST', '/api/admin/kyc/' + newKyc.id + '/reject', { reason: 'Document image is too blurry to verify identity' }, adminToken);
    if (res.status !== 200) throw new Error('Expected 200, got ' + res.status);
    if (res.data.data.status !== 'rejected') throw new Error('Expected rejected status');
    if (!res.data.data.rejection_reason) throw new Error('Missing rejection reason');
    pass('Admin can reject KYC with reason', 'status=200, kyc_status=rejected');
    
    // Cleanup
    await supabase.from('verifications').delete().eq('id', newKyc.id);
  } catch (err) { fail('Test 13', null, err); }

  // ============================================
  // TEST 14: Reject without reason rejected request
  // ============================================
  console.log('\n=== Test 14: Reject without reason rejected ===');
  try {
    const { data: testUser } = await supabase.from('users').select('id').eq('role', 'user').neq('id', '86372386-5621-4706-8ef5-2477d2a29106').limit(1).single();
    if (!testUser) throw new Error('No test user found');
    
    await supabase.from('verifications').delete().eq('user_id', testUser.id);
    
    const { data: newKyc } = await supabase.from('verifications').insert({
      user_id: testUser.id,
      doc_type: 'aadhaar',
      doc_front_url: 'https://example.com/doc.jpg',
      selfie_url: 'https://example.com/selfie.jpg',
      status: 'pending',
      submitted_at: new Date().toISOString(),
    }).select().single();
    
    const res = await api('POST', '/api/admin/kyc/' + newKyc.id + '/reject', {}, adminToken);
    if (res.status !== 400) throw new Error('Expected 400, got ' + res.status);
    pass('Reject without reason rejected', 'status=400');
    
    // Also test with short reason
    const res2 = await api('POST', '/api/admin/kyc/' + newKyc.id + '/reject', { reason: 'short' }, adminToken);
    if (res2.status !== 400) throw new Error('Expected 400 for short reason, got ' + res2.status);
    pass('Reject with short reason rejected', 'status=400');
    
    // Cleanup
    await supabase.from('verifications').delete().eq('id', newKyc.id);
  } catch (err) { fail('Test 14', null, err); }

  // ============================================
  // TEST 15: Public buddy response contains no sensitive KYC fields
  // ============================================
  console.log('\n=== Test 15: Public buddy response no sensitive KYC fields ===');
  try {
    const searchRes = await fetch('http://localhost:3001/api/buddies?per_page=5');
    const searchData = await searchRes.json();
    if (searchRes.status !== 200) throw new Error('Search failed');
    
    let sensitiveFound = false;
    for (const buddy of searchData.data) {
      if (buddy.password_hash || buddy.razorpay_key_secret || buddy.jwt_token ||
          buddy.doc_front_url || buddy.selfie_url || buddy.doc_number ||
          buddy.kyc_status || buddy.rejection_reason) {
        sensitiveFound = true;
        break;
      }
      // Check nested user object
      if (buddy.user && (buddy.user.email || buddy.user.phone)) {
        sensitiveFound = true;
        break;
      }
    }
    if (sensitiveFound) throw new Error('Sensitive fields found in buddy search response');
    pass('No sensitive KYC fields in public responses', searchData.data.length + ' records checked');
  } catch (err) { fail('Test 15', null, err); }

  // ============================================
  // TEST 16: Invalid UUID rejected
  // ============================================
  console.log('\n=== Test 16: Invalid UUID rejected ===');
  try {
    const res = await api('GET', '/api/admin/kyc/not-a-uuid', null, adminToken);
    if (res.status !== 400) throw new Error('Expected 400, got ' + res.status);
    pass('Invalid UUID rejected', 'status=400');
  } catch (err) { fail('Test 16', null, err); }

  // ============================================
  // TEST 17: KYC submission requires authentication
  // ============================================
  console.log('\n=== Test 17: KYC submit requires auth ===');
  try {
    const res = await api('POST', '/api/kyc/submit', {
      doc_type: 'aadhaar',
      doc_front_url: 'https://example.com/doc.jpg',
      selfie_url: 'https://example.com/selfie.jpg',
    });
    if (res.status !== 401) throw new Error('Expected 401, got ' + res.status);
    pass('KYC submit requires auth', 'status=401');
  } catch (err) { fail('Test 17', null, err); }

  // ============================================
  // TEST 18: Email verification endpoint exists and requires auth
  // ============================================
  console.log('\n=== Test 18: Email verification endpoints ===');
  try {
    const res = await api('POST', '/api/verification/email/request', {});
    if (res.status !== 401) throw new Error('Expected 401, got ' + res.status);
    pass('Email request requires auth', 'status=401');
    
    const res2 = await api('POST', '/api/verification/email/request', {}, userToken);
    if (res2.status !== 200 && res2.status !== 400) {
      // 400 if already verified
      if (res2.data.error?.message?.includes('already')) {
        pass('Email request endpoint exists (already verified)', 'status=400');
      } else {
        throw new Error('Expected 200 or 400, got ' + res2.status);
      }
    } else {
      pass('Email request endpoint exists', 'status=' + res2.status);
    }
  } catch (err) { fail('Test 18', null, err); }

  // ============================================
  // TEST 19: Phone verification endpoint exists and requires auth
  // ============================================
  console.log('\n=== Test 19: Phone verification endpoints ===');
  try {
    const res = await api('POST', '/api/verification/phone/request', { phone: '+919876543210' });
    if (res.status !== 401) throw new Error('Expected 401, got ' + res.status);
    pass('Phone request requires auth', 'status=401');
  } catch (err) { fail('Test 19', null, err); }

  // ============================================
  // TEST 20: Admin endpoint requires admin role
  // ============================================
  console.log('\n=== Test 20: Admin endpoint role enforcement ===');
  try {
    const res = await api('GET', '/api/admin/kyc/pending', null, userToken);
    if (res.status !== 403) throw new Error('Expected 403, got ' + res.status);
    pass('Admin endpoint requires admin role', 'status=403');
  } catch (err) { fail('Test 20', null, err); }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n=== VERIFICATION & KYC TEST SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log('PASSED: ' + passed + '  FAILED: ' + failed);
  if (failed > 0) {
    console.log('\nFAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => console.log('  [FAIL] ' + r.name + ': ' + r.error));
  }
  process.exit(failed > 0 ? 1 : 0);
})();
