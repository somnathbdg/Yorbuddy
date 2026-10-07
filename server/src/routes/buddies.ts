import { Router } from 'express';
import {
  searchBuddies,
  getBuddyById,
} from '../services/buddyService.js';
import { authenticate } from '../middleware/auth.js';
import { requireMembership } from '../middleware/membership.js';
import { requireVerification } from '../middleware/verification.js';

const router = Router();

/**
 * GET /api/buddies
 * Search and filter buddies. Requires authentication AND active membership AND full verification.
 */
router.get('/', authenticate, requireMembership, requireVerification, searchBuddies);

/**
 * GET /api/buddies/:id
 * Get a specific buddy's public profile. Requires authentication AND active membership AND full verification.
 */
router.get('/:id', authenticate, requireMembership, requireVerification, getBuddyById);

export default router;
