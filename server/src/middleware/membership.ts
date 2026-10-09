import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { Forbidden } from './errorHandler.js';
import { checkUserMembership } from '../services/membershipService.js';

/**
 * Middleware to require an active verified paid membership.
 * Must be used after `authenticate` middleware.
 * Admin users bypass this check.
 *
 * Membership is considered active when:
 *  - There is a memberships row with status='success'
 *  - AND (expiry_date IS NULL OR expiry_date > NOW())
 *
 * The FREE_ACCESS_10D plan is auto-assigned on registration (₹0, 10 days).
 * Paid plans (TRIAL_1D ₹99, WEEK_1 ₹499, MONTH_1 ₹1,999) count as
 * verified paid membership once their Razorpay payment has been confirmed.
 */
export async function requireMembership(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      return next(Forbidden('Authentication required.'));
    }

    // Admins bypass membership checks
    if (req.user.role === 'admin') {
      return next();
    }

    const supabase = getSupabase();
    const { isActive } = await checkUserMembership(supabase, req.user.id);

    if (!isActive) {
      return next(
        Forbidden('Active YorBuddy membership required to view buddy profiles. Purchase a plan to unlock.')
      );
    }

    next();
  } catch (err) {
    next(err);
  }
}
