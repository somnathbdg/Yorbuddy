import { Router } from 'express';
import {
  getPendingKyc,
  getKycById,
  approveKyc,
  rejectKyc,
  getAdminStats,
  getVerifiedBuddies,
} from '../services/verificationService.js';
import { authenticate, requireRole } from '../middleware/auth.js';

/**
 * ============================================================================
 * Admin Routes
 * ============================================================================
 *
 * Mounted at /api/admin. All routes require an admin role verified against the
 * CURRENT database record (see middleware/auth.ts requireRole).
 *
 * Layout — this split exists to avoid route shadowing:
 *
 *   /api/admin/stats                      -> getAdminStats
 *   /api/admin/verified-buddies           -> getVerifiedBuddies
 *   /api/admin/kyc/pending                -> getPendingKyc
 *   /api/admin/kyc/:id                    -> getKycById
 *   /api/admin/kyc/:id/approve            -> approveKyc
 *   /api/admin/kyc/:id/reject             -> rejectKyc
 *
 * The KYC routes live in their own sub-router mounted at /kyc, so the `/:id`
 * parameter route is scoped to /api/admin/kyc/* only. Previously every path in
 * the shared router was mounted directly at /api/admin, which meant an
 * unmatched path such as /api/admin/users was swallowed by the KYC `/:id`
 * route and returned a confusing 400 "Invalid KYC ID format" instead of a
 * clean 404.
 *
 * Within the KYC sub-router, literal paths are registered BEFORE the `/:id`
 * route so /kyc/pending is never captured as an id.
 * ============================================================================
 */

const router = Router();

// Every admin route requires an admin, checked against the database.
router.use(authenticate, requireRole('admin'));

// ---------- Dashboard ----------

// GET /api/admin/stats
router.get('/stats', getAdminStats);

// GET /api/admin/verified-buddies
router.get('/verified-buddies', getVerifiedBuddies);

// ---------- KYC review (sub-router scoped to /api/admin/kyc) ----------

const kycRouter = Router();

// GET /api/admin/kyc/pending
// Registered before /:id so 'pending' is not treated as an id.
kycRouter.get('/pending', getPendingKyc);

// GET /api/admin/kyc/:id
kycRouter.get('/:id', getKycById);

// POST /api/admin/kyc/:id/approve
kycRouter.post('/:id/approve', approveKyc);

// POST /api/admin/kyc/:id/reject
kycRouter.post('/:id/reject', rejectKyc);

router.use('/kyc', kycRouter);

export default router;
