import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { Forbidden } from './errorHandler.js';
import { isUserVerified } from '../services/verificationService.js';

/**
 * Middleware to require a fully verified user (email + phone + KYC approved).
 * Must be used after `authenticate` middleware.
 * Admin users bypass this check.
 */
export async function requireVerification(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      return next(Forbidden('Authentication required.'));
    }

    // Admins bypass verification checks
    if (req.user.role === 'admin') {
      return next();
    }

    const supabase = getSupabase();
    const verified = await isUserVerified(supabase, req.user.id);

    if (!verified) {
      return next(
        Forbidden('Complete verification required. Please complete your email, phone, and KYC verification to access buddy profiles.')
      );
    }

    next();
  } catch (err) {
    next(err);
  }
}
