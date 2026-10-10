import { Router, Request, Response } from 'express';
import { generateGoogleAuthUrl, handleGoogleCallback, isGoogleOAuthConfigured, storePendingAuth, retrievePendingAuth } from '../services/googleAuthService.js';
import { oauthLimiter } from '../middleware/security.js';

const router = Router();

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow by redirecting to Google's consent screen.
 * 
 * Rate limited by authLimiter (5 req/10 min per IP in production).
 */
router.get('/', oauthLimiter, async (_req: Request, res: Response) => {
  try {
    if (!isGoogleOAuthConfigured()) {
      return res.status(503).json({
        error: {
          code: 'GOOGLE_AUTH_NOT_CONFIGURED',
          message: 'Google Login is not configured. Please contact support.',
        },
      });
    }

    const { url } = generateGoogleAuthUrl();
    return res.redirect(url);
  } catch (err: any) {
    return res.status(500).json({
      error: {
        code: 'GOOGLE_AUTH_ERROR',
        message: err.message || 'Failed to initiate Google Login.',
      },
    });
  }
});

/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback from Google.
 * Exchanges code for tokens, verifies identity, issues JWT.
 * Redirects to frontend with a one-time exchange code.
 * 
 * Rate limited by authLimiter (5 req/10 min per IP in production).
 */
router.get('/callback', oauthLimiter, async (req: Request, res: Response) => {
  try {
    if (!isGoogleOAuthConfigured()) {
      return res.status(503).json({
        error: {
          code: 'GOOGLE_AUTH_NOT_CONFIGURED',
          message: 'Google Login is not configured.',
        },
      });
    }

    const { code, state, error: googleError } = req.query;

    // Handle Google-side errors (user denied access, etc.)
    if (googleError) {
      return res.status(400).json({
        error: {
          code: 'GOOGLE_AUTH_DENIED',
          message: 'Google Login was cancelled or denied.',
        },
      });
    }

    const result = await handleGoogleCallback(
      code as string | undefined,
      state as string | undefined,
      req,
    );

    // Store result and redirect to frontend with one-time code
    const exchangeCode = storePendingAuth(result);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/auth/callback?code=${exchangeCode}`);
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    const code = err.code || 'GOOGLE_AUTH_ERROR';
    const message = err.message || 'Google Login failed.';

    return res.status(statusCode).json({
      error: {
        code,
        message,
      },
    });
  }
});

/**
 * POST /api/auth/google/exchange
 * Exchanges a one-time code for auth tokens.
 * Code is single-use and expires after 60 seconds.
 */
router.post('/exchange', oauthLimiter, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({
        error: {
          code: 'GOOGLE_AUTH_ERROR',
          message: 'Exchange code is required.',
        },
      });
    }

    const result = retrievePendingAuth(code);
    if (!result) {
      return res.status(400).json({
        error: {
          code: 'GOOGLE_AUTH_ERROR',
          message: 'Invalid or expired exchange code.',
        },
      });
    }

    return res.status(200).json({
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isNewUser: result.isNewUser,
      },
      message: result.isNewUser
        ? 'Account created successfully via Google Login.'
        : 'Logged in successfully via Google.',
    });
  } catch (err: any) {
    return res.status(500).json({
      error: {
        code: 'GOOGLE_AUTH_ERROR',
        message: err.message || 'Token exchange failed.',
      },
    });
  }
});

export default router;
