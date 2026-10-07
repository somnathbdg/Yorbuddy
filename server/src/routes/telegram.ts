/**
 * Telegram Webhook Handler for YorBuddy Facebook Approval Workflow
 *
 * This module exports TWO routers with different trust levels:
 *
 *   1. telegramWebhookRouter  (PUBLIC, mounted at /api/telegram)
 *      - POST /webhook  — receives updates from Telegram.
 *      - NOT behind JWT auth (Telegram cannot present a Bearer token), so it is
 *        authenticated instead by Telegram's secret-token header:
 *          X-Telegram-Bot-Api-Secret-Token == TELEGRAM_WEBHOOK_SECRET
 *      - Fails CLOSED when the secret is not configured (no secret => reject),
 *        matching the Razorpay webhook pattern.
 *
 *   2. telegramAdminRouter    (ADMIN ONLY, mounted at /api/telegram)
 *      - setup-webhook, DELETE webhook, bot-info, poller-status.
 *      - Behind the shared authenticate + requireRole('admin') middleware, so
 *        the role is re-read from the database on every request (a deactivated
 *        or demoted admin is rejected immediately).
 *
 * Handles:
 * - Callback queries from inline keyboard buttons
 * - Text messages for MODIFY workflow
 * - /start and /status commands
 */

import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { handleCallback, resendApprovalPreview, getApprovalStats, listPendingApprovals, processedCallbacks, handleModifyText } from '../services/telegramApprovalService.js';
import { verifyTelegramBot, getTelegramChatId } from '../services/telegramService.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { telegramLimiter } from '../middleware/security.js';

/**
 * Read the configured Telegram webhook secret.
 * Never logged, never returned in a response.
 */
function getTelegramWebhookSecret(): string {
  return process.env.TELEGRAM_WEBHOOK_SECRET || '';
}

/**
 * Constant-time comparison of the incoming secret-token header against the
 * configured secret. Returns false when the secret is unset (fail closed).
 */
function isValidWebhookSecret(provided: string | undefined): boolean {
  const expected = getTelegramWebhookSecret();
  if (!expected) return false;
  if (typeof provided !== 'string' || provided.length === 0) return false;

  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    // Still spend comparable time so the failure path does not leak length.
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

// ============================================================================
// 1. PUBLIC webhook router — secret-token authenticated (not JWT)
// ============================================================================

const webhookRouter = Router();

/**
 * POST /api/telegram/webhook
 * Receive updates from Telegram.
 *
 * Auth: X-Telegram-Bot-Api-Secret-Token header must match
 *       TELEGRAM_WEBHOOK_SECRET. Rejected (403) when unset or mismatched.
 */
webhookRouter.post('/webhook', telegramLimiter, async (req: Request, res: Response) => {
  try {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'] as string | undefined;

    if (!getTelegramWebhookSecret()) {
      console.error('[TELEGRAM WEBHOOK] TELEGRAM_WEBHOOK_SECRET not configured. Webhook rejected.');
      return res.status(403).json({ ok: false, error: 'Webhook not configured' });
    }

    if (!isValidWebhookSecret(secretHeader)) {
      console.log('[TELEGRAM WEBHOOK] Rejected request with invalid secret token');
      return res.status(403).json({ ok: false, error: 'Invalid webhook secret' });
    }

    const update = req.body;

    // Handle callback queries (button presses)
    if (update.callback_query) {
      const callback = update.callback_query;
      const configuredChatId = getTelegramChatId();
      // Validate chat ID
      const chatId = callback.message?.chat?.id;
      if (configuredChatId && chatId !== undefined && String(chatId) !== configuredChatId) {
        console.log(`[TELEGRAM WEBHOOK] Callback from unauthorized chat ${chatId}, ignoring`);
        // Acknowledge to remove the loading state on the client
        const { answerCallbackQuery } = await import('../services/telegramService.js');
        await answerCallbackQuery(callback.id, '❌ Not authorized');
        return res.status(200).json({ ok: true });
      }

      // Dedup: prevent processing the same callback twice
      if (processedCallbacks.has(callback.id)) {
        console.log(`[TELEGRAM WEBHOOK] Duplicate callback ${callback.id}, ignoring`);
        return res.status(200).json({ ok: true, result: { action: 'duplicate_ignored' } });
      }
      processedCallbacks.add(callback.id);

      const result = await handleCallback({
        id: callback.id,
        data: callback.data,
        from: callback.from,
        message: callback.message,
      });
      console.log('[TELEGRAM] Callback handled:', result.action);
      return res.status(200).json({ ok: true, result });
    }

    // Handle text messages (for MODIFY workflow)
    if (update.message && update.message.text) {
      const text = update.message.text;
      const userId = update.message.from.id;
      const chatId = String(update.message.chat.id);
      const configuredChatId = getTelegramChatId();

      // Only process messages from the configured chat
      if (configuredChatId && chatId !== configuredChatId) {
        console.log(`[TELEGRAM WEBHOOK] Message from unauthorized chat ${chatId}, ignoring`);
        return res.status(200).json({ ok: true });
      }

      // Handle commands
      if (text === '/start') {
        return res.status(200).json({
          ok: true,
          message: 'YorBuddy Approval Bot is running!'
        });
      }

      if (text === '/status') {
        const stats = getApprovalStats();
        return res.status(200).json({
          ok: true,
          stats,
          pending: listPendingApprovals().filter(a => a.status === 'pending').slice(0, 5)
        });
      }

      // Handle approval resend command
      if (text.startsWith('/resend_')) {
        const approvalId = text.replace('/resend_', '');
        const result = await resendApprovalPreview(approvalId);
        return res.status(200).json(result);
      }

      // Handle token renewal notification
      if (text.startsWith('/token_expired')) {
        return res.status(200).json({
          ok: true,
          message: 'Please renew the Facebook token and restart the server.'
        });
      }

      // Handle MODIFY workflow: user sends revised content
      // Check if there's a pending approval in 'modified' status for this chat
      const pendingList = listPendingApprovals();
      const modifiedPending = pendingList.find(
        p => p.status === 'modified' && String(p.telegramChatId) === chatId
      );

      if (modifiedPending && modifiedPending.approvalId) {
        const result = await handleModifyText(modifiedPending.approvalId, text);
        if (result.success) {
          console.log(`[TELEGRAM WEBHOOK] Modified pending ${modifiedPending.approvalId}: ${result.message}`);
          return res.status(200).json({
            ok: true,
            action: 'modified',
            approvalId: modifiedPending.approvalId,
            message: result.message,
          });
        } else {
          console.log(`[TELEGRAM WEBHOOK] Modify failed: ${result.error}`);
          return res.status(200).json({
            ok: true,
            action: 'modify_failed',
            error: result.error,
          });
        }
      }

      // Default: acknowledge message
      console.log(`[TELEGRAM] Message from ${userId}: ${text.substring(0, 50)}...`);
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[TELEGRAM] Webhook error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 2. ADMIN management router — authenticate + requireRole('admin')
// ============================================================================

const adminRouter = Router();

// Every management route requires an admin, checked against the CURRENT
// database record (not the JWT claim).
adminRouter.use(authenticate, requireRole('admin'));

/**
 * POST /api/telegram/setup-webhook
 * Set up the Telegram webhook URL.
 * When TELEGRAM_WEBHOOK_SECRET is configured it is registered with Telegram as
 * the secret_token so inbound updates carry the validating header.
 */
adminRouter.post('/setup-webhook', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not set' });
    }

    if (!url) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

    const secret = getTelegramWebhookSecret();
    if (!secret) {
      return res.status(400).json({
        error: 'TELEGRAM_WEBHOOK_SECRET is not set. Refusing to register a webhook without secret validation.',
      });
    }

    const webhookUrl =
      `https://api.telegram.org/bot${token}/setWebhook` +
      `?url=${encodeURIComponent(url)}` +
      `&secret_token=${encodeURIComponent(secret)}`;
    const response = await fetch(webhookUrl);
    const data = await response.json();

    return res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/telegram/bot-info
 * Get bot info
 */
adminRouter.get('/bot-info', async (_req: Request, res: Response) => {
  try {
    const botInfo = await verifyTelegramBot();
    res.json(botInfo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/telegram/webhook
 * Delete the Telegram webhook (switch to getUpdates/polling)
 */
adminRouter.delete('/webhook', async (_req: Request, res: Response) => {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN is not set' });
    }
    const url = `https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`;
    const response = await fetch(url);
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/telegram/poller-status
 * Check if Telegram bot and chat are configured
 */
adminRouter.get('/poller-status', (_req: Request, res: Response) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = getTelegramChatId();
  res.json({
    botConfigured: !!token,
    chatConfigured: !!chatId,
    chatId: chatId ? `${chatId.substring(0, 6)}...` : null,
    pollerRunning: false,
  });
});

export { webhookRouter as telegramWebhookRouter, adminRouter as telegramAdminRouter };
export default adminRouter;
