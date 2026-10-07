/**
 * Standalone Telegram poller for YorBuddy callback system.
 * Keeps running and polls getUpdates for callback_query events.
 * Designed to be started as a persistent background process.
 *
 * Usage:
 *   npx tsx src/scripts/telegramPollerDaemon.ts          # start poller, no preview
 *   npx tsx src/scripts/telegramPollerDaemon.ts --send   # start poller + send preview
 */

import 'dotenv/config';
import { handleCallback, listPendingApprovals, sendApprovalPreview, handleModifyText } from '../services/telegramApprovalService.js';
import { getDailyPost } from '../services/facebookContentService.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

let lastUpdateId = 0;
let isPolling = false;
let pollingInterval: ReturnType<typeof setInterval> | null = null;
let keepAliveTimer: NodeJS.Timeout | null = null;
let previewSent = false;
void previewSent;

async function fetchUpdates(): Promise<any[]> {
  if (!TELEGRAM_BOT_TOKEN) { console.error('[POLLER] No bot token'); return []; }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&limit=10&timeout=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) { console.error(`[POLLER] HTTP ${res.status}`); return []; }
    const data = (await res.json()) as { ok: boolean; result?: any[]; description?: string };
    if (!data.ok) { console.error(`[POLLER] API: ${data.description}`); return []; }
    return data.result || [];
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message?.includes('timeout')) return [];
    console.error(`[POLLER] Fetch: ${err.message}`);
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
      console.log(`[POLLER] Unauthorized chat ${chatIdNum}, acking only`);
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cq.id, text: 'Not authorized' }),
      }).catch(() => {});
      if (update.update_id) lastUpdateId = update.update_id;
      return;
    }

    const result = await handleCallback({
      id: cq.id, data: cq.data, from: cq.from,
      message: cq.message ? { message_id: cq.message.message_id, chat: { id: cq.message.chat.id } } : undefined,
    });
    console.log(`[POLLER] Callback result: action=${result.action}, success=${result.success}${result.error ? ', error=' + result.error : ''}`);

    if (update.update_id) lastUpdateId = update.update_id;
    return;
  }

  if (update.message && update.message.text) {
    const text = update.message.text;
    const chatId = String(update.message.chat.id);
    if (chatId !== TELEGRAM_CHAT_ID) { console.log(`[POLLER] Unauthorized message from ${chatId}`); return; }
    console.log(`[POLLER] Message: ${text.substring(0, 80)}`);

    const pendingList = listPendingApprovals();
    const modified = pendingList.find(p => p.status === 'modified' && String(p.telegramChatId) === chatId);
    if (modified?.approvalId) {
      const r = await handleModifyText(modified.approvalId, text);
      console.log(`[POLLER] Modify: ${r.success ? 'OK' : 'FAIL'} - ${r.message || r.error}`);
    }
  }
}

async function poll(): Promise<void> {
  if (isPolling) return;
  isPolling = true;
  try {
    const updates = await fetchUpdates();
    if (updates.length > 0) {
      console.log(`[POLLER] Got ${updates.length} update(s)`);
      for (const u of updates) {
        try { await processUpdate(u); }
        catch (e: any) { console.error(`[POLLER] Error: ${e.message}`); }
      }
    }
  } catch (e: any) { console.error(`[POLLER] Poll error: ${e.message}`); }
  finally { isPolling = false; }
}

function start(intervalMs = 3000): void {
  if (pollingInterval) { console.log('[POLLER] Already running'); return; }
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('[POLLER] Missing credentials'); process.exit(1);
  }
  console.log(`[POLLER] Starting (interval=${intervalMs}ms, PID=${process.pid})`);
  console.log(`[POLLER] Chat: ${TELEGRAM_CHAT_ID.substring(0, 8)}...`);

  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`)
    .then(r => r.json()).then((d: any) => console.log(d.ok ? '[POLLER] Webhook deleted' : `[POLLER] Webhook warn: ${d.description}`))
    .catch(e => console.warn(`[POLLER] Webhook delete: ${e.message}`));

  keepAliveTimer = setInterval(() => {}, 60000);
  try {
    poll();
  } catch (e: any) {
    console.error(`[POLLER] Fatal: poll() crashed: ${e.message}`);
    console.error(`[POLLER] Stack: ${e.stack}`);
  }
  pollingInterval = setInterval(poll, intervalMs);
}

function stop(): void {
  if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
  if (keepAliveTimer) { clearInterval(keepAliveTimer); keepAliveTimer = null; }
  console.log('[POLLER] Stopped');
}

process.on('SIGINT', () => { console.log('\n[POLLER] Shutting down'); stop(); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n[POLLER] Shutting down'); stop(); process.exit(0); });

async function sendPreview(): Promise<void> {
  console.log('[POLLER] Sending preview...');
  try {
    const content = getDailyPost();
    console.log(`[POLLER] Topic: ${content.topic} | Category: ${content.category}`);
    const result = await sendApprovalPreview(content, TELEGRAM_CHAT_ID);
    if (result.success) {
      console.log(`[POLLER] ✓ Preview sent! Approval ID: ${result.approvalId}`);
      previewSent = true;
    } else {
      console.error(`[POLLER] ✗ Preview failed: ${result.error}`);
    }
  } catch (e: any) { console.error(`[POLLER] Preview error: ${e.message}`); }
}

// CLI
const args = process.argv.slice(2);
const sendPreviewFlag = args.includes('--send') || args.includes('--send-preview');

console.log(`[POLLER] Mode: ${sendPreviewFlag ? 'poller + send preview' : 'poller only'}`);
start(3000);

if (sendPreviewFlag) {
  setTimeout(sendPreview, 3000);
}

console.log('[POLLER] Running. Press Ctrl+C to stop.');
