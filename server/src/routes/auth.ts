import { Router } from 'express';
import { register, login, refresh, logout, getCurrentUser } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account.
 */
router.post('/register', authLimiter, register);

/**
 * POST /api/auth/login
 * Authenticate with email and password.
 */
router.post('/login', authLimiter, login);

/**
 * POST /api/auth/refresh
 * Refresh access token using a valid refresh token.
 */
router.post('/refresh', authLimiter, refresh);

/**
 * POST /api/auth/logout
 * Revoke refresh token and end session.
 */
router.post('/logout', logout);

/**
 * GET /api/auth/me
 * Get the currently authenticated user's profile.
 */
router.get('/me', authenticate, getCurrentUser);

export default router;
