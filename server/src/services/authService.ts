import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { Conflict, Unauthorized, BadRequest } from '../middleware/errorHandler.js';
import { assignFreeAccess } from './membershipService.js';
import { normalizeIndianPhone } from '../utils/phone.js';
import { z } from 'zod';
import { aiFriendRegistrationSchema, buildAiFriendUserInsert, compensateAiFriendRegistration, finalizeAiFriendRegistration } from './aiFriendRegistration.js';

// ========== Input Validation Schemas ==========

const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  full_name: z.string().min(1, 'Full name is required').max(100),
  phone: z.string().min(1, 'Mobile number is required').max(20),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional(),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']).optional(),
  city: z.string().max(100).optional(),
  role: z.enum(['user']).optional(), // Only 'user' allowed via public registration
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ========== Helper Functions ==========

async function findUserByEmail(email: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
  return data;
}

async function storeRefreshToken(userId: string, tokenId: string, expiresAt: Date, req: Request) {
  const supabase = getSupabase();
  const { error } = await supabase.from('refresh_tokens').insert({
    user_id: userId,
    token_hash: tokenId, // Store the token ID (already random/unguessable)
    expires_at: expiresAt.toISOString(),
    ip_address: req.ip || null,
    user_agent: req.get('user-agent') || null,
  });
  if (error) throw error;
}

async function revokeRefreshToken(tokenId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', tokenId);
  return !error;
}

async function isRefreshTokenValid(tokenId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('id, expires_at, revoked_at')
    .eq('token_hash', tokenId)
    .single();
  if (error || !data) return false;
  if (data.revoked_at) return false;
  if (new Date(data.expires_at) < new Date()) return false;
  return true;
}

function sanitizeUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    dob: user.dob,
    gender: user.gender,
    role: user.role,
    is_active: user.is_active,
    is_membership_paid: user.is_membership_paid,
    membership_paid_at: user.membership_paid_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
    photo_url: user.photo_url || null,
  };
}

// ========== Controller Functions ==========

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);

    // Normalize the Indian mobile number before checking or storing it.
    const normalizedPhone = normalizeIndianPhone(input.phone);

    // Check email first, then phone. The database unique index remains the
    // race-safe backstop if two registration requests arrive simultaneously.
    const existing = await findUserByEmail(input.email);
    if (existing) {
      throw Conflict('An account with this email already exists.');
    }

    const supabase = getSupabase();
    const { data: existingPhone, error: phoneLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', normalizedPhone)
      .limit(1);

    if (phoneLookupError) throw phoneLookupError;
    if (existingPhone && existingPhone.length > 0) {
      throw Conflict('This mobile number is already registered. Please log in or use a different number.');
    }

    // Hash password
    const password_hash = hashPassword(input.password);

    // Create user in database
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: input.email.toLowerCase(),
        password_hash,
        full_name: input.full_name,
        phone: normalizedPhone,
        dob: input.dob || null,
        gender: input.gender || null,
        role: 'user', // Always force role to 'user' on public registration
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw Conflict('This email or mobile number is already registered. Please log in or use different details.');
      throw error;
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });
    const { token: refreshToken, tokenId } = generateRefreshToken(newUser.id);

    // Store refresh token (7 days expiry)
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await storeRefreshToken(newUser.id, tokenId, refreshExpires, req);

    // Auto-assign 10-day free access membership
    await assignFreeAccess(supabase, newUser.id);

    res.status(201).json({
      data: {
        user: sanitizeUser(newUser),
        accessToken,
        refreshToken,
      },
      message: 'Registration successful. 10-day Free Access has been activated.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * AI Friend-only quick registration.
 * Creates a normal user account without collecting Buddy profile/KYC fields.
 * Email and phone remain unverified until the existing OTP endpoints succeed.
 */
export async function registerAiFriend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = aiFriendRegistrationSchema.parse(req.body);
    const email = input.email.toLowerCase();
    const normalizedPhone = input.phone ? normalizeIndianPhone(input.phone) : null;

    if (await findUserByEmail(email)) {
      throw Conflict('An account with this email already exists. Please log in.');
    }

    const supabase = getSupabase();
    if (normalizedPhone) {
      const { data: existingPhone, error: phoneLookupError } = await supabase
        .from('users').select('id').eq('phone', normalizedPhone).limit(1);
      if (phoneLookupError) throw phoneLookupError;
      if (existingPhone && existingPhone.length > 0) {
        throw Conflict('This mobile number is already registered. Please log in or use a different number.');
      }
    }

    const { data: newUser, error } = await supabase.from('users').insert(buildAiFriendUserInsert({
      email,
      password_hash: hashPassword(input.password),
      full_name: input.full_name,
      phone: normalizedPhone,
    })).select().single();

    if (error) {
      if (error.code === '23505') throw Conflict('This email or mobile number is already registered.');
      throw error;
    }

    const registrationResult = await finalizeAiFriendRegistration({
      userId: newUser.id,
      createSession: async (setTokenId) => {
        const accessToken = generateAccessToken({ userId: newUser.id, email: newUser.email, role: newUser.role });
        const tokens = generateRefreshToken(newUser.id);
        setTokenId(tokens.tokenId);
        const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await storeRefreshToken(newUser.id, tokens.tokenId, refreshExpires, req);
        return {
          tokenId: tokens.tokenId,
          result: { user: sanitizeUser(newUser), accessToken, refreshToken: tokens.token },
        };
      },
      assignFreeAccess: () => assignFreeAccess(supabase, newUser.id),
      cleanup: (tokenId) => compensateAiFriendRegistration({
        userId: newUser.id,
        tokenId,
        deleteRefreshToken: async () => await supabase.from('refresh_tokens').delete().eq('user_id', newUser.id).eq('token_hash', tokenId),
        deleteFreeAccess: async () => await supabase.from('memberships').delete().eq('user_id', newUser.id).eq('plan_id', 'FREE_ACCESS_10D'),
        deleteUser: async () => await supabase.from('users').delete().eq('id', newUser.id),
      }),
    });

    res.status(201).json({
      data: registrationResult,
      message: 'AI Friend account created. Verify your email or mobile to continue.',
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);

    // Find user by email
    const user = await findUserByEmail(input.email);
    if (!user) {
      throw Unauthorized('Invalid email or password.');
    }

    // Check if account is active
    if (!user.is_active) {
      throw Unauthorized('Your account has been deactivated. Contact support.');
    }

    // Check if password hash exists
    if (!user.password_hash) {
      throw Unauthorized('This account uses phone OTP login. Please use the OTP flow.');
    }

    // Verify password
    const passwordValid = verifyPassword(input.password, user.password_hash);
    if (!passwordValid) {
      throw Unauthorized('Invalid email or password.');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const { token: refreshToken, tokenId } = generateRefreshToken(user.id);

    // Store refresh token
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await storeRefreshToken(user.id, tokenId, refreshExpires, req);

    res.status(200).json({
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
      },
      message: 'Login successful',
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw BadRequest('Refresh token is required.');
    }

    // Verify the refresh token JWT
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw Unauthorized('Invalid or expired refresh token.');
    }

    // Check if token is still valid in database (not revoked)
    const isValid = await isRefreshTokenValid(payload.tokenId);
    if (!isValid) {
      throw Unauthorized('Refresh token has been revoked or expired.');
    }

    // Get user from database
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.userId)
      .single();

    if (error || !user || !user.is_active) {
      throw Unauthorized('User not found or account deactivated.');
    }

    // Revoke the old refresh token (rotation)
    await revokeRefreshToken(payload.tokenId);

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const { token: newRefreshToken, tokenId: newTokenId } = generateRefreshToken(user.id);

    // Store new refresh token
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await storeRefreshToken(user.id, newTokenId, refreshExpires, req);

    res.status(200).json({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      message: 'Tokens refreshed successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await revokeRefreshToken(payload.tokenId);
      } catch {
        // Ignore invalid tokens during logout — user is logging out anyway
      }
    }

    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw Unauthorized('User not found.');
    }

    res.status(200).json({
      data: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
}
