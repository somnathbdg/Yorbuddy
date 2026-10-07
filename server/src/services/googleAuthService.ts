import { getSupabase } from '../config/database.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { Conflict, Unauthorized, BadRequest } from '../middleware/errorHandler.js';
import crypto from 'crypto';

// ========== Types ==========

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token: string;
}

interface GoogleUserInfo {
  sub: string;           // Google's unique user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

interface GoogleAuthResult {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    is_membership_paid: boolean;
    created_at: string;
  };
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
}

// ========== Configuration ==========

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || '';
}

function getGoogleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || '';
}

function getGoogleRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';
}

// ========== State Management (CSRF Protection) ==========

// In-memory state store for OAuth CSRF protection.
// In production with multiple instances, use Redis instead.
const oauthStates = new Map<string, { createdAt: number }>();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

function storeState(state: string): void {
  oauthStates.set(state, { createdAt: Date.now() });
}

function validateState(state: string | undefined): boolean {
  if (!state) return false;
  const record = oauthStates.get(state);
  if (!record) return false;
  
  // Check expiration
  if (Date.now() - record.createdAt > STATE_TTL_MS) {
    oauthStates.delete(state);
    return false;
  }
  
  // One-time use: delete after validation
  oauthStates.delete(state);
  return true;
}

// Cleanup expired states periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, record] of oauthStates.entries()) {
    if (now - record.createdAt > STATE_TTL_MS) {
      oauthStates.delete(state);
    }
  }
}, 60 * 1000); // Run every minute

// ========== Pending Auth Results (for one-time code exchange) ==========

const pendingAuthResults = new Map<string, { result: GoogleAuthResult; createdAt: number }>();
const PENDING_AUTH_TTL_MS = 60 * 1000; // 60 seconds

function generateExchangeCode(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function storePendingAuth(result: GoogleAuthResult): string {
  const code = generateExchangeCode();
  pendingAuthResults.set(code, { result, createdAt: Date.now() });
  return code;
}

export function retrievePendingAuth(code: string): GoogleAuthResult | null {
  const record = pendingAuthResults.get(code);
  if (!record) return null;

  // Check expiration
  if (Date.now() - record.createdAt > PENDING_AUTH_TTL_MS) {
    pendingAuthResults.delete(code);
    return null;
  }

  // One-time use: delete after retrieval
  pendingAuthResults.delete(code);
  return record.result;
}

// Cleanup expired pending auth results periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, record] of pendingAuthResults.entries()) {
    if (now - record.createdAt > PENDING_AUTH_TTL_MS) {
      pendingAuthResults.delete(code);
    }
  }
}, 30 * 1000); // Run every 30 seconds

// ========== Google Auth URL Generation ==========

export function generateGoogleAuthUrl(): { url: string; state: string } {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID in environment.');
  }

  const state = generateState();
  storeState(state);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    access_type: 'online',
    prompt: 'select_account',
  });

  return {
    url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
    state,
  };
}

// ========== Token Exchange ==========

async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured.');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

// ========== ID Token Verification ==========

/**
 * Verify the Google ID token by fetching Google's public keys and validating
 * the JWT signature, issuer, audience, and expiration.
 * 
 * This is the most secure approach as it validates the token cryptographically.
 */
async function verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
  // Decode without verification first to get the header
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw Unauthorized('Invalid Google ID token format.');
  }

  let header: { alg: string; kid: string };
  let payload: { iss: string; aud: string; exp: number; iat: number; sub: string; email: string; email_verified: boolean; name: string; picture?: string };

  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  } catch {
    throw Unauthorized('Invalid Google ID token encoding.');
  }

  // Validate algorithm
  if (header.alg !== 'RS256') {
    throw Unauthorized('Invalid Google ID token algorithm.');
  }

  // Validate issuer
  const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];
  if (!validIssuers.includes(payload.iss)) {
    throw Unauthorized('Invalid Google ID token issuer.');
  }

  // Validate audience (must match our client ID)
  if (payload.aud !== getGoogleClientId()) {
    throw Unauthorized('Invalid Google ID token audience.');
  }

  // Validate expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw Unauthorized('Google ID token has expired.');
  }

  // Validate issued-at (must not be in the future, with 5 second tolerance)
  if (payload.iat > now + 5) {
    throw Unauthorized('Google ID token issued in the future.');
  }

  // Verify the signature using Google's public keys
  const keysResponse = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!keysResponse.ok) {
    throw new Error('Failed to fetch Google public keys.');
  }

  const keys = await keysResponse.json() as { keys: Array<{ kid: string; n: string; e: string; alg: string }> };
  const key = keys.keys.find(k => k.kid === header.kid);
  
  if (!key) {
    throw Unauthorized('Google ID token signing key not found.');
  }

  // Import the public key and verify the signature
  const { createVerify } = await import('crypto');
  
  // Build the PEM public key from JWK components
  const publicKey = createPublicKeyFromJWK(key);
  
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  
  const signature = Buffer.from(parts[2], 'base64url');
  const isValid = verifier.verify(publicKey, signature);
  
  if (!isValid) {
    throw Unauthorized('Google ID token signature verification failed.');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
    name: payload.name,
    picture: payload.picture,
  };
}

/**
 * Create a PEM-encoded RSA public key from a JWK (JSON Web Key).
 */
function createPublicKeyFromJWK(jwk: { n: string; e: string }): string {
  // Decode base64url components
  const n = Buffer.from(jwk.n, 'base64url');
  const e = Buffer.from(jwk.e, 'base64url');

  // Convert exponent to DER format
  let expHex = e.toString('hex');
  if (expHex.length % 2 !== 0) expHex = '0' + expHex;
  
  // Build DER-encoded RSA public key
  const der = Buffer.concat([
    Buffer.from('30820122300d06092a864886f70d01010105000382010f00', 'hex'), // AlgorithmIdentifier
    Buffer.from('3082010a0282010100', 'hex'), // BIT STRING header
    n, // modulus
    Buffer.from('0203', 'hex'), // INTEGER header for exponent
    e, // exponent
  ]);

  const pem = `-----BEGIN PUBLIC KEY-----\n${der.toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
  return pem;
}

// ========== User Lookup / Creation ==========

async function findOrCreateUser(googleUser: GoogleUserInfo): Promise<{ user: any; isNewUser: boolean }> {
  const supabase = getSupabase();

  // First, try to find by google_id
  const { data: existingByGoogleId, error: googleIdError } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleUser.sub)
    .single();

  if (existingByGoogleId && !googleIdError) {
    return { user: existingByGoogleId, isNewUser: false };
  }

  // Then, try to find by email (account linking)
  const { data: existingByEmail, error: emailError } = await supabase
    .from('users')
    .select('*')
    .eq('email', googleUser.email.toLowerCase())
    .single();

  if (existingByEmail && !emailError) {
    // Link Google account to existing user
    const { data: linkedUser, error: linkError } = await supabase
      .from('users')
      .update({ google_id: googleUser.sub })
      .eq('id', existingByEmail.id)
      .select()
      .single();

    if (linkError) {
      throw new Error('Failed to link Google account.');
    }

    return { user: linkedUser, isNewUser: false };
  }

  // Create new user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      email: googleUser.email.toLowerCase(),
      full_name: googleUser.name,
      google_id: googleUser.sub,
      role: 'user', // ALWAYS 'user' — never admin or buddy
      is_active: true,
      is_membership_paid: false,
      email_verified_at: googleUser.email_verified ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (createError) {
    if (createError.code === '23505') {
      throw Conflict('An account with this email already exists.');
    }
    throw createError;
  }

  return { user: newUser, isNewUser: true };
}

// ========== Token Issuance ==========

async function issueTokens(user: any, req: any): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const { token: refreshToken, tokenId } = generateRefreshToken(user.id);

  // Store refresh token (7 days expiry)
  const supabase = getSupabase();
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await supabase.from('refresh_tokens').insert({
    user_id: user.id,
    token_hash: tokenId,
    expires_at: refreshExpires.toISOString(),
    ip_address: req.ip || null,
    user_agent: req.get('user-agent') || null,
  });

  return { accessToken, refreshToken };
}

// ========== Main Handler ==========

export async function handleGoogleCallback(
  code: string | undefined,
  state: string | undefined,
  req: any,
): Promise<GoogleAuthResult> {
  // Validate state parameter (CSRF protection)
  if (!validateState(state)) {
    throw Unauthorized('Invalid or expired OAuth state parameter.');
  }

  if (!code) {
    throw BadRequest('Authorization code is required.');
  }

  // Exchange code for tokens
  const tokenResponse = await exchangeCodeForTokens(code);

  // Verify the ID token
  const googleUser = await verifyIdToken(tokenResponse.id_token);

  // Additional validation: email must be verified by Google
  if (!googleUser.email_verified) {
    throw Unauthorized('Google account email is not verified.');
  }

  // Find or create user
  const { user, isNewUser } = await findOrCreateUser(googleUser);

  // Check if account is active
  if (!user.is_active) {
    throw Unauthorized('Your account has been deactivated. Contact support.');
  }

  // Issue JWT tokens
  const { accessToken, refreshToken } = await issueTokens(user, req);

  return {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      is_membership_paid: user.is_membership_paid,
      created_at: user.created_at,
    },
    accessToken,
    refreshToken,
    isNewUser,
  };
}

// ========== Configuration Check ==========

export function isGoogleOAuthConfigured(): boolean {
  return !!(getGoogleClientId() && getGoogleClientSecret());
}
