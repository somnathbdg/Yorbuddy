/**
 * Standalone Telegram poller for YorBuddy callback system.
 * Keeps running and polls getUpdates for callback_query events.
 * Designed to be started as a background process.
 *
 * Run: npx tsx src/scripts/telegramPersistentPoller.ts [--send-preview|--status]
 */

import 'dotenv/config';
import { handleCallback, listPendingApprovals, getApprovalStats, sendApprovalPreview, getPendingApproval, handleModifyText } from '../services/telegramApprovalService.js';
import { sendTelegramMessage, getTelegramChatId, sendPhotoWithKeyboard } from '../services/telegramService.js';
import { getDailyPost } from '../services/facebookContentService.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

let lastUpdateId = 0;
let isPolling = false;
let pollingInterval: ReturnType<typeof setInterval> | null = null;
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

async function fetchUpdates(): Promise<any[]> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[POLLER] TELEGRAM_BOT_TOKEN not set');
    return [];
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&limit=10&timeout=10`;
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`[POLLER] HTTP ${response.status}: ${response.statusText}`);
      return [];
    }

    const data = (await response.json()) as {
      ok: boolean;
      result?: any[];
      description?: string;
    };

    if (!data.ok) {
      console.error(`[POLLER] API error: ${data.description}`);
      return [];
    }

    return data.result || [];
  } catch (err: any) {
    if (err.name === 'AbortError' || err.code === 'ABORT_ERR' || err.message?.includes('timeout')) {
      return [];
    }
    console.error(`[POLLER] Fetch error: ${err.message}`);
    return [];
  }
}

async function processUpdate(update: any): Promise<void> {
  if (update.callback_query) {
    const cq = update.callback_query;
    const action = cq.data?.split(':')[0] || 'unknown';
    console.log(`[POLLER] Callback received: action=${action}, callbackId=${cq.id}`);

    const chatIdNum = cq.message?.chat?.id;
    if (chatIdNum !== undefined && String(chatIdNum) !== TELEGRAM_CHAT_ID) {
      console.log(`[POLLER] Callback from unauthorized chat ${chatIdNum}, ignoring`);
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cq.id, text: 'Not authorized' }),
      }).catch(() => {});
      if (update.update_id) lastUpdateId = update.update_id;
      return;
    }

    const result = await handleCallback({
      id: cq.id,
      data: cq.data,
      from: cq.from,
      message: cq.message ? { message_id: cq.message.message_id, chat: { id: cq.message.chat.id } } : undefined,
    });

    console.log(`[POLLER] Callback result: action=${result.action}, success=${result.success}`);
    if (result.error) console.log(`[POLLER] Callback error: ${result.error}`);

    if (update.update_id) {
      lastUpdateId = update.update_id;
    }
    return;
  }

  if (update.message && update.message.text) {
    const text = update.message.text;
    const chatIdNum = update.message.chat.id;
    const chatId = String(chatIdNum);

    if (chatId !== TELEGRAM_CHAT_ID) {
      console.log(`[POLLER] Message from unauthorized chat ${chatId}, ignoring`);
      return;
    }

    console.log(`[POLLER] Message from chat ${chatId}: ${text.substring(0, 80)}`);

    const pendingList = listPendingApprovals();
    const modifiedPending = pendingList.find(
      p => p.status === 'modified' && String(p.telegramChatId) === chatId
    );

    if (modifiedPending && modifiedPending.approvalId) {
      const result = await handleModifyText(modifiedPending.approvalId, text);
      console.log(`[POLLER] Modify result: ${result.success ? 'success' : 'failed'} - ${result.message || result.error}`);
    }
  }
}

async function poll(): Promise<void> {
  if (isPolling) return;
  isPolling = true;

  try {
    const updates = await fetchUpdates();
    if (updates.length > 0) {
      console.log(`[POLLER] Received ${updates.length} update(s)`);
      for (const update of updates) {
        try {
          await processUpdate(update);
        } catch (err: any) {
          console.error(`[POLLER] Process error: ${err.message}`);
        }
      }
    }
  } catch (err: any) {
    console.error(`[POLLER] Poll error: ${err.message}`);
  } finally {
    isPolling = false;
  }
}

function startPolling(intervalMs = 3000): void {
  if (pollingInterval) {
    console.log('[POLLER] Already running');
    return;
  }

  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[POLLER] Cannot start: TELEGRAM_BOT_TOKEN not set');
    return;
  }
  if (!TELEGRAM_CHAT_ID) {
    console.error('[POLLER] Cannot start: TELEGRAM_CHAT_ID not set');
    return;
  }

  console.log(`[POLLER] Starting persistent long-polling (interval: ${intervalMs}ms)`);
  console.log(`[POLLER] Chat ID: ${TELEGRAM_CHAT_ID.substring(0, 8)}...`);
  console.log(`[POLLER] PID: ${process.pid}`);

  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`)
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        console.log('[POLLER] Webhook deleted, polling ready');
      } else {
        console.warn('[POLLER] Webhook delete warning:', data.description);
      }
    })
    .catch(err => console.warn('[POLLER] Webhook delete error:', err.message));

  keepAliveInterval = setInterval(() => {}, 60000);
  poll();
  pollingInterval = setInterval(poll, intervalMs);
}

function stopPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  console.log('[POLLER] Polling stopped');
}

process.on('SIGINT', () => {
  console.log('\n[POLLER] Shutting down...');
  stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[POLLER] Shutting down...');
  stopPolling();
  process.exit(0);
});

function printStatus(): void {
  console.log('--- POLLER STATUS ---');
  console.log(`PID: ${process.pid}`);
  console.log(`Running: ${pollingInterval !== null}`);
  console.log(`Pending approvals: ${listPendingApprovals().length}`);
  const stats = getApprovalStats();
  console.log(`Total: ${stats.total}, Pending: ${stats.pending}, Approved: ${stats.approved}, Rejected: ${stats.rejected}, Modified: ${stats.modified}`);
  console.log('---------------------');
}

async function sendNewPreview(): Promise<void> {
  console.log('[POLLER] Sending new approval preview...');
  try {
    const content = getDailyPost();
    console.log(`[POLLER] Topic: ${content.topic}`);
    const result = await sendApprovalPreview(content, TELEGRAM_CHAT_ID);
    if (result.success) {
      console.log(`[POLLER] Preview sent! Approval ID: ${result.approvalId}`);
    } else {
      console.error(`[POLLER] Failed to send preview: ${result.error}`);
    }
  } catch (err: any) {
    console.error(`[POLLER] Error sending preview: ${err.message}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--status')) {
  printStatus();
  stopPolling();
  process.exit(0);
}

// Always ensure a keep-alive interval
keepAliveInterval = setInterval(() => {}, 60000);

if (args.includes('--send-preview')) {
  startPolling();
  setTimeout(sendNewPreview, 2000);
  console.log('[POLLER] Keep-alive active. Press Ctrl+C to stop.');
} else {
  startPolling();
  console.log('[POLLER] Polling active. Waiting for callbacks...');
  console.log('[POLLER] Use --status to check status, --send-preview to send a new preview.');
}
