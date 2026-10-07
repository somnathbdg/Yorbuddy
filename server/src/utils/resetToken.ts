import crypto from 'crypto';

/**
 * ============================================================================
 * Password Reset Token Utilities
 * ============================================================================
 * 
 * Security design:
 * - Raw token (random 32 bytes) is sent to user via email
 * - Only SHA-256 hash of token is stored in database
 * - Tokens expire after 1 hour
 * - Tokens are single-use (marked as used after password change)
 * 
 * ============================================================================
 */

const TOKEN_EXPIRY_HOURS = 1;

/**
 * Generate a cryptographically secure reset token.
 * Returns { rawToken, tokenHash, expiresAt }
 * The rawToken is sent to the user; only the hash is stored.
 */
export function generateResetToken(): { rawToken: string; tokenHash: string; expiresAt: Date } {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  return { rawToken, tokenHash, expiresAt };
}

/**
 * Hash a token for storage using SHA-256.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Verify a raw token against a stored hash.
 */
export function verifyToken(rawToken: string, storedHash: string): boolean {
  const computedHash = hashToken(rawToken);
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
}
