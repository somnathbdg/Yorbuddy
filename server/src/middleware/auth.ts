import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { AuthUser } from '../types/auth.js';
import { Unauthorized, Forbidden } from './errorHandler.js';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Middleware to authenticate requests via JWT access token.
 * Attaches `req.user` when authenticated.
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
 * Must be used after `authenticate` middleware.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(Unauthorized('Authentication required.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(Forbidden('Insufficient permissions.'));
    }
    next();
  };
}

/**
 * Middleware to ensure the authenticated user's account is active.
 */
export function requireActiveUser(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(Unauthorized('Authentication required.'));
  }
  if (!req.user.is_active) {
    return next(Forbidden('Your account has been deactivated.'));
  }
  next();
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
