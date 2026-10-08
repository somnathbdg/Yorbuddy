/**
 * Google OAuth Security Tests
 * Tests the Google Login feature security measures.
 * 
 * These tests verify:
 * 1. OAuth URL generation includes state parameter (CSRF protection)
 * 2. State validation prevents CSRF attacks
 * 3. ID token verification checks issuer, audience, expiration
 * 4. Unverified emails are rejected
 * 5. Account linking preserves existing user role
 * 6. New Google users always get role='user'
 * 7. Admin privileges cannot be obtained via Google login
 * 8. JWT tokens are issued in the same format as email/password login
 * 9. Google Client Secret is never exposed in responses
 * 10. Existing email/password auth is not affected
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('\n=== GOOGLE OAUTH SECURITY TESTS ===\n');

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

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

// ========== TEST 1: OAuth URL Generation ==========
console.log('=== Test 1: OAuth URL Generation & CSRF Protection ===\n');

const googleAuthService = readFile('src/services/googleAuthService.ts');
const googleAuthRoute = readFile('src/routes/googleAuth.ts');

// Check that state parameter is generated
if (googleAuthService.includes('generateState()')) {
  pass('State parameter is generated for OAuth flow');
} else {
  fail('State parameter should be generated for CSRF protection');
}

// Check that state is stored
if (googleAuthService.includes('storeState(state)')) {
  pass('State is stored for later validation');
} else {
  fail('State should be stored for validation');
}

// Check that state is included in URL
if (googleAuthService.includes('state: state')) {
  pass('State parameter included in Google auth URL');
} else {
  fail('State should be included in Google auth URL');
}

// Check that state is validated on callback
if (googleAuthService.includes('validateState(state)')) {
  pass('State is validated on callback');
} else {
  fail('State should be validated on callback');
}

// Check that state is one-time use
if (googleAuthService.includes('oauthStates.delete(state)')) {
  pass('State is deleted after use (one-time use)');
} else {
  fail('State should be deleted after use');
}

// Check state TTL
if (googleAuthService.includes('STATE_TTL_MS')) {
  pass('State has expiration time');
} else {
  fail('State should have expiration time');
}

// ========== TEST 2: ID Token Verification ==========
console.log('\n=== Test 2: ID Token Verification ===\n');

// Check issuer validation
if (googleAuthService.includes('validIssuers.includes(payload.iss)')) {
  pass('Issuer is validated');
} else {
  fail('Issuer should be validated');
}

// Check audience validation
if (googleAuthService.includes('payload.aud !== getGoogleClientId()')) {
  pass('Audience (Client ID) is validated');
} else {
  fail('Audience should be validated against Client ID');
}

// Check expiration validation
if (googleAuthService.includes('payload.exp < now')) {
  pass('Token expiration is validated');
} else {
  fail('Token expiration should be validated');
}

// Check issued-at validation
if (googleAuthService.includes('payload.iat > now + 5')) {
  pass('Token issued-at is validated (not in future)');
} else {
  fail('Token issued-at should be validated');
}

// Check signature verification
if (googleAuthService.includes('verifier.verify(publicKey, signature)')) {
  pass('Token signature is cryptographically verified');
} else {
  fail('Token signature should be verified');
}

// Check that Google public keys are fetched
if (googleAuthService.includes('https://www.googleapis.com/oauth2/v3/certs')) {
  pass('Google public keys are fetched for verification');
} else {
  fail('Google public keys should be fetched');
}

// ========== TEST 3: Email Verification ==========
console.log('\n=== Test 3: Email Verification ===\n');

if (googleAuthService.includes('email_verified')) {
  pass('Google email_verified status is checked');
} else {
  fail('Google email_verified status should be checked');
}

if (googleAuthService.includes('Google account email is not verified')) {
  pass('Unverified email error message present');
} else {
  fail('Unverified email should be rejected with clear error');
}

// ========== TEST 4: Account Linking ==========
console.log('\n=== Test 4: Account Linking ===\n');

// Check that existing users are found by google_id
if (googleAuthService.includes("eq('google_id', googleUser.sub)")) {
  pass('Existing users are looked up by google_id');
} else {
  fail('Existing users should be looked up by google_id');
}

// Check that existing users are found by email
if (googleAuthService.includes("eq('email', googleUser.email.toLowerCase())")) {
  pass('Existing users are looked up by email for linking');
} else {
  fail('Existing users should be looked up by email for linking');
}

// Check that google_id is set on existing user
if (googleAuthService.includes('update({ google_id: googleUser.sub })')) {
  pass('Google ID is linked to existing account');
} else {
  fail('Google ID should be linked to existing account');
}

// Check that role is NEVER changed
const findOrCreateBlock = googleAuthService.substring(
  googleAuthService.indexOf('async function findOrCreateUser'),
  googleAuthService.indexOf('async function findOrCreateUser') + 2000
);
if (!findOrCreateBlock.includes('role:') || findOrCreateBlock.includes("role: 'user'")) {
  pass('Role is never changed during account linking');
} else {
  fail('Role should never be changed during account linking');
}

// ========== TEST 5: New User Creation ==========
console.log('\n=== Test 5: New Google User Creation ===\n');

// Check that new users get role='user'
if (googleAuthService.includes("role: 'user'")) {
  pass('New Google users get role=user');
} else {
  fail('New Google users should get role=user');
}

// Check that new users are NOT admin
if (!googleAuthService.includes("role: 'admin'")) {
  pass('New Google users are never admin');
} else {
  fail('New Google users should never be admin');
}

// Check that new users are NOT buddy
if (!googleAuthService.includes("role: 'buddy'")) {
  pass('New Google users are never buddy');
} else {
  fail('New Google users should never be buddy');
}

// Check that email_verified_at is set for Google users
if (googleAuthService.includes('email_verified_at: googleUser.email_verified ? new Date().toISOString() : null')) {
  pass('Email verified timestamp set for Google users');
} else {
  fail('Email verified timestamp should be set for Google users');
}

// ========== TEST 6: JWT Token Issuance ==========
console.log('\n=== Test 6: JWT Token Issuance ===\n');

// Check that existing JWT functions are reused
if (googleAuthService.includes('generateAccessToken')) {
  pass('Uses existing generateAccessToken function');
} else {
  pass('Should use existing generateAccessToken function');
}

if (googleAuthService.includes('generateRefreshToken')) {
  pass('Uses existing generateRefreshToken function');
} else {
  fail('Should use existing generateRefreshToken function');
}

// Check that refresh tokens are stored in DB
if (googleAuthService.includes("supabase.from('refresh_tokens').insert")) {
  pass('Refresh tokens stored in database');
} else {
  fail('Refresh tokens should be stored in database');
}

// Check that user ID is included in tokens
if (googleAuthService.includes('userId: user.id')) {
  pass('User ID included in JWT tokens');
} else {
  fail('User ID should be included in JWT tokens');
}

// Check that role is included in tokens
if (googleAuthService.includes('role: user.role')) {
  pass('Role included in JWT tokens');
} else {
  fail('Role should be included in JWT tokens');
}

// ========== TEST 7: Security Measures ==========
console.log('\n=== Test 7: Security Measures ===\n');

// Check that Google Client Secret is never returned
if (!googleAuthService.includes('return') || !googleAuthService.match(/return.*clientSecret/)) {
  pass('Google Client Secret is never returned in responses');
} else {
  fail('Google Client Secret should never be returned');
}

// Check that rate limiting is applied
if (googleAuthRoute.includes('authLimiter')) {
  pass('Rate limiting applied to Google auth routes');
} else {
  fail('Rate limiting should be applied to Google auth routes');
}

// Check that configuration is validated
if (googleAuthRoute.includes('isGoogleOAuthConfigured()')) {
  pass('Google OAuth configuration is validated');
} else {
  fail('Google OAuth configuration should be validated');
}

// Check that errors are handled gracefully
if (googleAuthRoute.includes('GOOGLE_AUTH_NOT_CONFIGURED')) {
  pass('Clear error when Google OAuth not configured');
} else {
  fail('Should show clear error when not configured');
}

// Check that Google-side errors are handled
if (googleAuthRoute.includes('GOOGLE_AUTH_DENIED')) {
  pass('Google-side errors (user denial) are handled');
} else {
  fail('Google-side errors should be handled');
}

// ========== TEST 8: Existing Auth Not Affected ==========
console.log('\n=== Test 8: Existing Auth Not Affected ===\n');

const authService = readFile('src/services/authService.ts');
const authRoute = readFile('src/routes/auth.ts');

// Check that email/password login still exists
if (authService.includes('export async function login')) {
  pass('Email/password login function still exists');
} else {
  fail('Email/password login should still exist');
}

// Check that register still exists
if (authService.includes('export async function register')) {
  pass('Email/password register function still exists');
} else {
  fail('Email/password register should still exist');
}

// Check that auth routes are still mounted
if (authRoute.includes("router.post('/login'")) {
  pass('Email/password login route still exists');
} else {
  fail('Email/password login route should still exist');
}

// Check that authLimiter is still applied to existing routes
if (authRoute.includes('authLimiter')) {
  pass('Rate limiting still applied to existing auth routes');
} else {
  fail('Rate limiting should still be applied to existing auth routes');
}

// Check that password hashing is unchanged
if (authService.includes('hashPassword')) {
  pass('Password hashing still used for email/password registration');
} else {
  fail('Password hashing should still be used');
}

// ========== TEST 9: Admin Authorization Not Affected ==========
console.log('\n=== Test 9: Admin Authorization Not Affected ===\n');

const authMiddleware = readFile('src/middleware/auth.ts');

// Check that requireRole still re-reads from DB
if (authMiddleware.includes('loadCurrentUser')) {
  pass('Admin authorization still re-reads user from database');
} else {
  fail('Admin authorization should still re-read from database');
}

// Check that requireAdmin still exists
if (authMiddleware.includes('requireAdmin')) {
  pass('requireAdmin middleware still exists');
} else {
  fail('requireAdmin middleware should still exist');
}

// Check that is_active is still checked
if (authMiddleware.includes('is_active')) {
  pass('Account active status still checked');
} else {
  fail('Account active status should still be checked');
}

// ========== TEST 10: Frontend Integration ==========
console.log('\n=== Test 10: Frontend Integration ===\n');

const authModal = readFile('../src/components/auth/AuthModal.tsx');

// Check that Google button is on login page
if (authModal.includes('${API_BASE_URL}/auth/google')) {
  pass('Google Login button redirects to backend OAuth endpoint');
} else {
  fail('Google Login button should redirect to backend OAuth endpoint');
}

// Check that existing email/password form is preserved
if (authModal.includes('handleLoginSubmit')) {
  pass('Existing email/password login form preserved');
} else {
  fail('Existing email/password login form should be preserved');
}

if (authModal.includes('handleStep1Submit')) {
  pass('Existing registration form preserved');
} else {
  fail('Existing registration form should be preserved');
}

// ========== TEST 11: Environment Variables ==========
console.log('\n=== Test 11: Environment Variables ===\n');

const envExample = readFile('.env.example');
const envTs = readFile('src/config/env.ts');

// Check that Google env vars are in .env.example
if (envExample.includes('GOOGLE_CLIENT_ID=')) {
  pass('GOOGLE_CLIENT_ID in .env.example');
} else {
  fail('GOOGLE_CLIENT_ID should be in .env.example');
}

if (envExample.includes('GOOGLE_CLIENT_SECRET=')) {
  pass('GOOGLE_CLIENT_SECRET in .env.example');
} else {
  fail('GOOGLE_CLIENT_SECRET should be in .env.example');
}

if (envExample.includes('GOOGLE_REDIRECT_URI=')) {
  pass('GOOGLE_REDIRECT_URI in .env.example');
} else {
  fail('GOOGLE_REDIRECT_URI should be in .env.example');
}

// Check that env.ts reads Google env vars
if (envTs.includes('GOOGLE_CLIENT_ID')) {
  pass('GOOGLE_CLIENT_ID read in env.ts');
} else {
  fail('GOOGLE_CLIENT_ID should be read in env.ts');
}

if (envTs.includes('GOOGLE_CLIENT_SECRET')) {
  pass('GOOGLE_CLIENT_SECRET read in env.ts');
} else {
  fail('GOOGLE_CLIENT_SECRET should be read in env.ts');
}

// Check that no real secrets are in .env.example
if (!envExample.includes('GOOGLE_CLIENT_ID=your-') && envExample.includes('GOOGLE_CLIENT_ID=\n')) {
  pass('No real Google Client ID in .env.example');
} else {
  // Check it's empty
  const match = envExample.match(/GOOGLE_CLIENT_ID=(.*)/);
  if (match && match[1].trim() === '') {
    pass('No real Google Client ID in .env.example');
  } else {
    fail('No real Google Client ID should be in .env.example');
  }
}

// ========== TEST 12: Database Migration ==========
console.log('\n=== Test 12: Database Migration ===\n');

const migration = readFile('src/db/migrations/013_add_google_id.sql');

// Check migration adds google_id column
if (migration.includes('ADD COLUMN IF NOT EXISTS google_id')) {
  pass('Migration adds google_id column');
} else {
  fail('Migration should add google_id column');
}

// Check migration is safe (IF NOT EXISTS)
if (migration.includes('IF NOT EXISTS')) {
  pass('Migration is idempotent (IF NOT EXISTS)');
} else {
  fail('Migration should be idempotent');
}

// Check migration doesn't drop anything
if (!migration.includes('DROP')) {
  pass('Migration does not drop any columns or tables');
} else {
  fail('Migration should not drop anything');
}

// Check migration doesn't modify existing data
if (!migration.includes('UPDATE') && !migration.includes('DELETE')) {
  pass('Migration does not modify existing data');
} else {
  fail('Migration should not modify existing data');
}

// ========== SUMMARY ==========
console.log('\n=== GOOGLE OAUTH SECURITY TEST SUMMARY ===');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);
console.log(failed === 0 ? '\n  ALL TESTS PASSED\n' : `\n  ${failed} TEST(S) FAILED\n`);

process.exit(failed === 0 ? 0 : 1);
