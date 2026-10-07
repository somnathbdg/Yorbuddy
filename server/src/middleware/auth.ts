import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { AuthUser } from '../types/auth.js';
import { Unauthorized, Forbidden } from './errorHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * ============================================================================
 * Authentication & Authorization Middleware
 * ============================================================================
 *
 * authenticate()   — verifies the JWT and populates req.user from the TOKEN.
 * requireRole()    — authorization: re-reads the user row from the database and
 *                    compares the CURRENT role. The JWT role claim is never
 *                    trusted for authorization decisions.
 * requireAdmin()   — convenience wrapper for requireRole('admin').
 *
 * Why authorization re-reads the database:
 *   A JWT is a snapshot. If an account is deactivated, demoted from admin, or
 *   deleted after the token was issued, the token keeps its original claims
 *   until it expires (access tokens live 15 minutes). Trusting the claim means
 *   a revoked admin keeps full admin access for the rest of the token lifetime.
 *   requireRole() therefore treats the claim as a hint only and re-checks the
 *   authoritative record server-side.
 *
 * authenticate() intentionally does NOT hit the database: it runs on every
 * authenticated request, and the routes that need freshness apply requireRole()
 * or requireActiveUser() on top of it.
 * ============================================================================
 */

/** Shape of the user columns needed for authorization decisions. */
interface CurrentUserRecord {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  full_name: string | null;
}

/**
 * Load the authoritative user record for authorization.
 * Returns null when the user no longer exists.
 */
async function loadCurrentUser(userId: string): Promise<CurrentUserRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, is_active, full_name')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as CurrentUserRecord;
}

/**
 * Middleware to authenticate requests via JWT access token.
 * Attaches `req.user` when authenticated.
 *
 * NOTE: req.user.role here is the value baked into the token. Do NOT use it
 * for authorization — use requireRole()/requireAdmin(), which re-read the
 * database.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(Unauthorized('Authentication required. Provide a Bearer token.'));
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      full_name: '',
      is_active: true,
    } as AuthUser;
    next();
  } catch (err) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      return next(Unauthorized('Access token expired. Please refresh your session.'));
    }
    return next(Unauthorized('Invalid authentication token.'));
  }
}

/**
 * Middleware to require specific roles after authentication.
 *
 * The role is resolved from the CURRENT database record, not from the JWT
 * claim, so role changes and deactivations take effect immediately.
 *
 * Must be used after `authenticate` middleware.
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(Unauthorized('Authentication required.'));
      }

      const current = await loadCurrentUser(req.user.id);

      // User deleted since the token was issued.
      if (!current) {
        return next(Unauthorized('Account no longer exists.'));
      }

      // Account deactivated since the token was issued.
      if (!current.is_active) {
        return next(Forbidden('Your account has been deactivated.'));
      }

      // Refresh req.user so downstream handlers see authoritative values.
      req.user = {
        id: current.id,
        email: current.email,
        role: current.role as AuthUser['role'],
        full_name: current.full_name || '',
        is_active: current.is_active,
      } as AuthUser;

      if (!allowedRoles.includes(current.role)) {
        return next(Forbidden('Insufficient permissions.'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware to require an administrator, verified against the database.
 * Must be used after `authenticate` middleware.
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to ensure the authenticated user's account is active.
 * Re-reads the database so a deactivation takes effect immediately rather than
 * waiting for the access token to expire.
 */
export async function requireActiveUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      return next(Unauthorized('Authentication required.'));
    }

    const current = await loadCurrentUser(req.user.id);
    if (!current) {
      return next(Unauthorized('Account no longer exists.'));
    }
    if (!current.is_active) {
      return next(Forbidden('Your account has been deactivated.'));
    }

    req.user = {
      id: current.id,
      email: current.email,
      role: current.role as AuthUser['role'],
      full_name: current.full_name || '',
      is_active: current.is_active,
    } as AuthUser;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Check if the auth migration has been applied.
 * Called once at startup to warn if database schema needs updating.
 */
export async function checkAuthSchema(): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('users')
      .select('password_hash')
      .limit(0);
    
    if (error && error.message.includes('password_hash')) {
      console.warn('');
      console.warn('  ╔══════════════════════════════════════════════════════════════╗');
      console.warn('  ║  DATABASE MIGRATION REQUIRED                                ║');
      console.warn('  ║                                                              ║');
      console.warn('  ║  The password_hash column is missing from users table.     ║');
      console.warn('  ║  Run the following in Supabase SQL Editor:                  ║');
      console.warn('  ║                                                              ║');
      console.warn('  ║  1. Open: Supabase Dashboard > SQL Editor                   ║');
      console.warn('  ║  2. Copy: server/src/db/migrations/001_add_auth_password.sql║');
      console.warn('  ║  3. Run the query                                           ║');
      console.warn('  ║                                                              ║');
      console.warn('  ╚══════════════════════════════════════════════════════════════╝');
      console.warn('');
      return false;
    }
    return true;
  } catch (err) {
    console.error('[AUTH] Schema check failed:', err);
    return false;
  }
}
