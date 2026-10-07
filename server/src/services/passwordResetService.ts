import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { z } from 'zod';
import { BadRequest } from '../middleware/errorHandler.js';
import { hashPassword } from '../utils/password.js';
import { generateResetToken, hashToken } from '../utils/resetToken.js';
import { emailService } from './emailServiceFacade.js';

// ========== Validation Schemas ==========

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
}).strict();

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters').max(128),
}).strict();

// ========== Controllers ==========

/**
 * POST /api/auth/forgot-password
 * Request a password reset link.
 * Always returns the same generic message regardless of whether email exists.
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    const supabase = getSupabase();

    // Find user by email
    const { data: user } = await supabase
      .from('users')
      .select('id, email, is_active')
      .eq('email', input.email.toLowerCase())
      .single();

    // Generic response regardless of whether user exists
    const genericMessage = 'If an account exists for this email, you will receive a password reset link.';

    // If no user found or account inactive, return generic message (don't reveal)
    if (!user || !user.is_active) {
      res.status(200).json({ message: genericMessage });
      return;
    }

    // Generate reset token
    const { rawToken, tokenHash, expiresAt } = generateResetToken();

    // Store hashed token in database
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('[FORGOT_PASSWORD] Failed to store reset token:', insertError.message);
      // Still return generic message to avoid leaking info
      res.status(200).json({ message: genericMessage });
      return;
    }

    // Send email with raw token (queued for async delivery)
    // Email failure does not prevent password reset flow
    emailService.sendPasswordResetEmail(user.email, rawToken).catch((err) => {
      console.error('[FORGOT_PASSWORD] Failed to queue reset email:', err);
    });

    res.status(200).json({ message: genericMessage });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password using a valid reset token.
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = resetPasswordSchema.parse(req.body);
    const supabase = getSupabase();

    // Hash the provided token to look it up
    const tokenHash = hashToken(input.token);

    // Find the token record
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();

    // Generic error for invalid token
    const invalidTokenError = BadRequest('Invalid or expired reset token. Please request a new password reset.');

    if (tokenError || !tokenRecord) {
      throw invalidTokenError;
    }

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      // Delete expired token
      await supabase.from('password_reset_tokens').delete().eq('id', tokenRecord.id);
      throw invalidTokenError;
    }

    // Check if token has already been used
    if (tokenRecord.used_at) {
      throw invalidTokenError;
    }

    // Get the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('id', tokenRecord.user_id)
      .single();

    if (userError || !user || !user.is_active) {
      throw invalidTokenError;
    }

    // Hash the new password
    const newPasswordHash = hashPassword(input.new_password);

    // Update user's password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', user.id);

    if (updateError) {
      console.error('[RESET_PASSWORD] Failed to update password:', updateError.message);
      throw new Error('Failed to reset password. Please try again.');
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenRecord.id);

    // Revoke all refresh tokens for this user (force re-login)
    await supabase
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('revoked_at', null);

    res.status(200).json({
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
}

export { forgotPasswordSchema, resetPasswordSchema };
