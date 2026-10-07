/**
 * Telegram Long Polling Update Consumer for YorBuddy
 * 
 * Since no webhook URL is configured (local dev), this polls getUpdates
 * to receive callback_query events from inline keyboard buttons.
 * 
 * Integrates with existing telegramApprovalService.handleCallback()
 */

import { handleCallback } from './telegramApprovalService.js';
import { sendTelegramMessage } from './telegramService.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let isPolling = false;
let lastUpdateId = 0;

interface TelegramUpdateResponse {
  ok: boolean;
  result?: any[];
}

/**
 * Fetch pending updates from Telegram
 */
async function fetchUpdates(): Promise<any[]> {
  if (!TELEGRAM_BOT_TOKEN) return [];

  const offset = lastUpdateId > 0 ? lastUpdateId + 1 : 0;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&limit=10&timeout=10`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as TelegramUpdateResponse;
    if (data.ok && data.result) {
      return data.result;
    }
    return [];
  } catch (err: any) {
    console.error('[TELEGRAM] Fetch error:', err.message);
    return [];
  }
}

/**
 * Process a single update
 */
async function processUpdate(update: any): Promise<void> {
  // Handle callback_query (inline keyboard button press)
  if (update.callback_query) {
    const cq = update.callback_query;
    console.log(`[TELEGRAM] Callback received: action=${cq.data?.split(':')[0]}, callbackId=${cq.id}`);

    // Validate chat ID (Telegram sends numeric chat.id, TELEGRAM_CHAT_ID is a string)
    const chatIdNum = cq.message?.chat?.id;
    if (chatIdNum !== undefined && String(chatIdNum) !== TELEGRAM_CHAT_ID) {
      console.log(`[TELEGRAM] Callback from unauthorized chat ${chatIdNum}, ignoring`);
      // Still acknowledge the callback to remove the loading state on the client
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cq.id, text: 'Not authorized' }),
      }).catch(() => {});
      return;
    }

    // Update last seen ID only after successful processing
    // (moved below to prevent losing updates on processing errors)

    // Forward to approval service — callbackId is always a string from Telegram
    const callbackId = String(cq.id);
    try {
      await handleCallback({
        id: callbackId,
        data: cq.data,
        from: cq.from,
        message: cq.message,
      });
      // Advance lastUpdateId only after successful processing
      if (update.update_id) {
        lastUpdateId = update.update_id;
      }
    } catch (err: any) {
      console.error('[TELEGRAM] Callback processing error:', err.message);
      // Acknowledge anyway to remove loading state
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId, text: 'Error processing request' }),
      }).catch(() => {});
      if (update.update_id) {
        lastUpdateId = update.update_id;
      }
    }
    return;
  }

  // Handle text messages (for MODIFY workflow or commands)
  if (update.message && update.message.text) {
    const text = update.message.text;
    const chatId = String(update.message.chat.id);

    // Validate chat ID
    if (chatId !== TELEGRAM_CHAT_ID) {
      return;
    }

    // Handle /status command
    if (text === '/status') {
      await sendTelegramMessage('🤖 Bot is running. Waiting for approval...', chatId);
      return;
    }

    console.log(`[TELEGRAM] Message: ${text.substring(0, 50)}`);
  }
}

/**
 * Polling loop
 */
async function poll(): Promise<void> {
  if (isPolling) return; // prevent overlapping polls
  isPolling = true;

  try {
    const updates = await fetchUpdates();

    for (const update of updates) {
      try {
        await processUpdate(update);
      } catch (err: any) {
        console.error('[TELEGRAM] Process error:', err.message);
      }
    }
  } catch (err: any) {
    console.error('[TELEGRAM] Poll error:', err.message);
  } finally {
    isPolling = false;
  }
}

/**
 * Start the Telegram polling loop
 */
export function startTelegramPolling(intervalMs: number = 3000): void {
  if (pollingInterval) {
    console.log('[TELEGRAM] Polling already running');
    return;
  }

  if (!TELEGRAM_BOT_TOKEN) {
    console.log('[TELEGRAM] Polling not started: TELEGRAM_BOT_TOKEN not set');
    return;
  }

  console.log(`[TELEGRAM] Starting long-polling (interval: ${intervalMs}ms)`);

  // Delete any existing webhook to ensure getUpdates works
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`)
    .then(r => r.json() as Promise<{ ok: boolean; description?: string }>)
    .then(data => {
      if (data.ok) {
        console.log('[TELEGRAM] Existing webhook deleted, polling ready');
      } else {
        console.warn('[TELEGRAM] Webhook delete warning:', data.description);
      }
    })
    .catch(err => console.warn('[TELEGRAM] Webhook delete error:', err.message));

  // Initial poll immediately
  poll();

  // Schedule recurring polls
  pollingInterval = setInterval(poll, intervalMs);
}

/**
 * Stop the polling loop
 */
export function stopTelegramPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('[TELEGRAM] Polling stopped');
  }
}

/**
 * Check if polling is active
 */
export function isTelegramPolling(): boolean {
  return pollingInterval !== null;
}
