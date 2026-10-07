import { Router } from 'express';
import {
  requestEmailCode,
  verifyEmail,
  requestPhoneCode,
  verifyPhone,
  getMyVerificationStatus,
  submitKyc,
  getMyKycStatus,
} from '../services/verificationService.js';
import { authenticate } from '../middleware/auth.js';
import { verificationLimiter } from '../middleware/security.js';

/**
 * ============================================================================
 * User Verification & KYC Routes
 * ============================================================================
 *
 * Mounted at /api/verification and /api/kyc. Every route here operates on the
 * authenticated user's own data.
 *
 * Admin KYC review and dashboard routes live in routes/admin.ts, mounted at
 * /api/admin, so the admin `/:id` route is scoped to /api/admin/kyc/* and can
 * never shadow an unrelated path.
 * ============================================================================
 */

const router = Router();

// ========== User Verification Status ==========

// GET /api/verification/me
// Returns the current user's verification status (email, phone, KYC)
router.get('/me', authenticate, getMyVerificationStatus);

// ========== Email Verification ==========

// POST /api/verification/email/request
// Request a verification code to be sent to user's email
router.post('/email/request', authenticate, verificationLimiter, requestEmailCode);

// POST /api/verification/email/verify
// Verify email with the 6-digit code
router.post('/email/verify', authenticate, verificationLimiter, verifyEmail);

// ========== Phone Verification ==========

// POST /api/verification/phone/request
// Request a verification code to be sent to user's phone
router.post('/phone/request', authenticate, verificationLimiter, requestPhoneCode);

// POST /api/verification/phone/verify
// Verify phone with the 6-digit code
router.post('/phone/verify', authenticate, verificationLimiter, verifyPhone);

// ========== KYC (Know Your Customer) ==========

// POST /api/kyc/submit
// Submit KYC documents for admin review
router.post('/submit', authenticate, verificationLimiter, submitKyc);

// GET /api/kyc/status
// Get current user's KYC submission status
// (was /me but that collides with GET /verification/me)
router.get('/status', authenticate, getMyKycStatus);

export default router;

