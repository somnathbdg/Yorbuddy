import { Router } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getBuddyProfile,
  updateBuddyProfile,
} from '../services/userService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/users/me
 * Get the authenticated user's full profile.
 */
router.get('/me', authenticate, getUserProfile);

/**
 * PATCH /api/users/me
 * Update the authenticated user's profile.
 */
router.patch('/me', authenticate, updateUserProfile);

/**
 * GET /api/users/me/buddy
 * Get the authenticated user's buddy profile (if they are a buddy).
 */
router.get('/me/buddy', authenticate, getBuddyProfile);

/**
 * PATCH /api/users/me/buddy
 * Update the authenticated user's buddy profile.
 */
router.patch('/me/buddy', authenticate, updateBuddyProfile);

export default router;
