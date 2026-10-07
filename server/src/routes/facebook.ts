/**
 * Facebook Automation API Routes for YorBuddy
 * 
 * Endpoints for admin panel integration and manual post management:
 * - GET /api/facebook/status          → Check connection status
 * - GET /api/facebook/preview         → Preview next scheduled post
 * - POST /api/facebook/publish        → Manually publish a post
 * - POST /api/facebook/schedule       → Schedule a custom post
 * - GET /api/facebook/posts           → List recent posts (insights)
 * - DELETE /api/facebook/posts/:id    → Delete a post
 */

import { Router, Request, Response } from 'express';
import {
  previewNextPost,
  triggerManualPost,
  publishDailyPost,
} from '../jobs/facebookAutomationJob.js';
import {
  checkConnection,
  verifyPost,
  deletePost,
  getPostInsights,
  publishPost,
} from '../services/facebookPublisher.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = Router();

// Require an authenticated admin. Authorization uses the shared, DB-backed
// middleware (authenticate + requireRole('admin')) so the role and is_active
// state are re-read from the database on every request. Previously this router
// defined its own inline check against the JWT claim and had no authenticate()
// in front of it, which both made every route unreachable (req.user was always
// undefined -> 403) and would have trusted a stale claim if a token were ever
// attached. See middleware/auth.ts.
router.use(authenticate, requireRole('admin'));

/**
 * GET /api/facebook/status
 * Check if Facebook connection is working
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const connection = await checkConnection();

    if (!connection.success) {
      return res.status(503).json({
        connected: false,
        error: connection.error,
      });
    }

    res.json({
      connected: true,
      pageId: connection.pageId,
      apiVersion: process.env.FACEBOOK_API_VERSION || 'v26.0',
    });
  } catch (err: any) {
    res.status(500).json({
      connected: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/facebook/preview
 * Preview the next scheduled post without publishing
 */
router.get('/preview', async (_req: Request, res: Response) => {
  try {
    const { content, formatted } = await previewNextPost();

    res.json({
      success: true,
      content,
      formatted,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/facebook/publish
 * Publish the next daily post immediately
 * Body: { confirm: true } — explicit confirmation required
 */
router.post('/publish', async (req: Request, res: Response) => {
  try {
    const { confirm, category, index } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Set confirm: true to publish.',
      });
    }

    let result;
    if (category) {
      result = await triggerManualPost(category, index);
    } else {
      result = await publishDailyPost();
    }

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      postId: result.postId,
      message: 'Post published successfully',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/facebook/custom
 * Publish a custom post (admin-authored content)
 * Body: { message: string, confirm: true }
 */
router.post('/custom', async (req: Request, res: Response) => {
  try {
    const { message, confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Set confirm: true to publish.',
      });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long (max 5000 characters)',
      });
    }

    const result = await publishPost(message.trim());

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      postId: result.postId,
      message: 'Custom post published successfully',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/facebook/verify/:postId
 * Verify a post exists on Facebook
 */
router.get('/verify/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const verification = await verifyPost(postId);

    res.json(verification);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/facebook/insights/:postId
 * Get post insights (impressions, reach, engagement)
 */
router.get('/insights/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const insights = await getPostInsights(postId);

    res.json(insights);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * DELETE /api/facebook/posts/:postId
 * Delete a post from the Facebook Page
 * Body: { confirm: true } — explicit confirmation required
 */
router.delete('/posts/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required. Set confirm: true to delete.',
      });
    }

    const result = await deletePost(postId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/facebook/telegram/status
 * Check if Telegram bot is configured and working
 */
router.get('/telegram/status', async (_req: Request, res: Response) => {
  try {
    const { verifyTelegramBot, getTelegramChatId } = await import('../services/telegramService.js');
    const botInfo = await verifyTelegramBot();
    const chatId = getTelegramChatId();

    if (!botInfo.success) {
      return res.status(503).json({
        connected: false,
        error: botInfo.error,
      });
    }

    res.json({
      connected: true,
      bot: {
        id: botInfo.botInfo?.id,
        name: botInfo.botInfo?.first_name,
        username: botInfo.botInfo?.username,
      },
      chatConfigured: !!chatId,
      chatId: chatId ? `${chatId.substring(0, 6)}...` : null,
    });
  } catch (err: any) {
    res.status(500).json({
      connected: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/facebook/telegram/test
 * Send a test notification to Telegram
 */
router.post('/telegram/test', async (_req: Request, res: Response) => {
  try {
    const { sendTelegramMessage } = await import('../services/telegramService.js');

    const result = await sendTelegramMessage(
      '🧪 <b>Test Notification</b>\n\nYorBuddy Facebook automation is connected to Telegram!'
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      messageId: result.messageId,
      message: 'Test notification sent',
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
