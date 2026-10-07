/**
 * Test script for Telegram Approval Workflow
 * 
 * Generates a daily post, sends it to Telegram with approval buttons
 * without enabling the daily cron.
 * 
 * Usage: node dist/scripts/telegramApprovalTest.js
 */

import 'dotenv/config';
import { sendApprovalPreview } from '../services/telegramApprovalService.js';
import { getDailyPost } from '../services/facebookContentService.js';
import { getTelegramChatId } from '../services/telegramService.js';

async function main() {
  console.log('============================================');
  console.log('  YORBUDDY TELEGRAM APPROVAL TEST');
  console.log('============================================');
  console.log('');

  const chatId = getTelegramChatId();
  console.log('Target chat:', chatId || '(not set)');

  if (!chatId) {
    console.error('ERROR: TELEGRAM_CHAT_ID is not set');
    process.exit(1);
  }

  console.log('');
  console.log('1. Generating daily post content...');
  const content = getDailyPost();
  console.log('   Topic:', content.topic);
  console.log('   Category:', content.category);
  console.log('');

  console.log('2. Sending to Telegram with approval buttons...');
  const result = await sendApprovalPreview(content, chatId);

  console.log('   Result:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('');
    console.log('3. Approval ID:', result.approvalId);
    console.log('');
    console.log('============================================');
    console.log('  TEST COMPLETE');
    console.log('============================================');
    console.log('');
    console.log('Check your Telegram chat.');
    console.log('Tap APPROVE / MODIFY / REJECT to test the workflow.');
  } else {
    console.error('FAILED:', result.error);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
