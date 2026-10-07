/**
 * Interactive Telegram Approval Test with Polling
 * 
 * This script:
 * 1. Starts the Telegram long-polling listener
 * 2. Sends a new approval preview with buttons
 * 3. Waits for user to tap APPROVE/MODIFY/REJECT
 * 4. Processes the callback in real-time
 * 
 * Usage: node dist/scripts/telegramApprovalInteractive.js
 */

import 'dotenv/config';
import { sendApprovalPreview } from '../services/telegramApprovalService.js';
import { startTelegramPolling, stopTelegramPolling } from '../services/telegramPoller.js';
import { getDailyPost } from '../services/facebookContentService.js';

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  YorBuddy Telegram Approval Interactive Test');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // Step 1: Start polling
  console.log('1. Starting Telegram polling listener...');
  startTelegramPolling(2000);
  console.log('   Polling started (2s interval)');
  console.log('');

  // Step 2: Generate and send preview
  console.log('2. Sending approval preview to Telegram...');
  const content = getDailyPost();
  console.log('   Topic:', content.topic);
  console.log('   Category:', content.category);
  console.log('');

  const result = await sendApprovalPreview(content);

  if (!result.success) {
    console.error('   Failed to send preview:', result.error);
    process.exit(1);
  }

  console.log('   Approval ID:', result.approvalId);
  console.log('   Sent to chat:', process.env.TELEGRAM_CHAT_ID || '(not set)');
  console.log('');

  console.log('═══════════════════════════════════════════════════');
  console.log('  WAITING FOR TELEGRAM CALLBACK');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('Tap APPROVE, MODIFY, or REJECT in your Telegram chat.');
  console.log('The callback will be processed automatically.');
  console.log('');
  console.log('Press Ctrl+C to exit.');
  console.log('');

  // Keep alive
  await new Promise(() => {}); // wait forever
}

main().catch((err) => {
  console.error('Error:', err);
  stopTelegramPolling();
  process.exit(1);
});
