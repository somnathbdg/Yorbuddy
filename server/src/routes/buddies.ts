import { Router } from 'express';
import {
  searchBuddies,
  getBuddyById,
} from '../services/buddyService.js';

const router = Router();

/**
 * GET /api/buddies
 * Search and filter buddies.
 */
router.get('/', searchBuddies);

/**
 * GET /api/buddies/:id
 * Get a specific buddy's public profile.
 */
router.get('/:id', getBuddyById);

export default router;
