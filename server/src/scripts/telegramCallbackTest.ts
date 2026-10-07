/**
 * Telegram Callback System Test
 * Tests: poller startup, answerCallbackQuery, APPROVE/MODIFY/REJECT handlers
 * 
 * Run: cd server && npx tsx src/scripts/telegramCallbackTest.ts
 */

import 'dotenv/config';
import { getTelegramChatId, verifyTelegramBot, answerCallbackQuery } from '../services/telegramService.js';
import { sendApprovalPreview, handleCallback, listPendingApprovals, getApprovalStats } from '../services/telegramApprovalService.js';
import { startTelegramPolling, stopTelegramPolling, isTelegramPolling } from '../services/telegramPoller.js';
import { getDailyPost } from '../services/facebookContentService.js';

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  YORBUDDY TELEGRAM CALLBACK SYSTEM TEST');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // 1. Environment check
  const chatId = getTelegramChatId();
  console.log('1. ENVIRONMENT CHECK');
  console.log(`   TELEGRAM_CHAT_ID: ${chatId ? chatId.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`   TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? 'SET ✓' : 'NOT SET ✗'}`);
  console.log(`   FACEBOOK_CRON_ENABLED: ${process.env.FACEBOOK_CRON_ENABLED || 'NOT SET (disabled) ✓'}`);
  console.log('');

  if (!chatId) {
    console.error('✗ FAIL: TELEGRAM_CHAT_ID is not set. Cannot proceed.');
    process.exit(1);
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('✗ FAIL: TELEGRAM_BOT_TOKEN is not set. Cannot proceed.');
    process.exit(1);
  }

  // 2. Verify bot
  console.log('2. BOT VERIFICATION');
  try {
    const botInfo = await verifyTelegramBot();
    if (botInfo.success) {
      console.log(`   Bot: @${botInfo.botInfo?.username || '?'} (ID: ${botInfo.botInfo?.id || '?'}) ✓`);
    } else {
      console.error(`   ✗ Bot verification failed: ${botInfo.error}`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`   ✗ Bot verification error: ${err.message}`);
    process.exit(1);
  }
  console.log('');

  // 3. Test answerCallbackQuery directly
  console.log('3. TEST answerCallbackQuery');
  const testCallbackId = `test_${Date.now()}`;
  try {
    const result = await answerCallbackQuery(testCallbackId, 'Test acknowledgment');
    if (result.success) {
      console.log('   answerCallbackQuery: WORKING ✓');
    } else {
      console.log(`   answerCallbackQuery: FAILED - ${result.error}`);
    }
  } catch (err: any) {
    console.log(`   answerCallbackQuery: ERROR - ${err.message}`);
  }
  console.log('');

  // 4. Test handleCallback with simulated data (no approval exists yet)
  console.log('4. TEST handleCallback (no approval - should get "not found")');
  try {
    const result = await handleCallback({
      id: `test_${Date.now()}_cb`,
      data: 'approve:nonexistent_id',
      from: { id: 123456, first_name: 'Test User' },
      message: { message_id: 1, chat: { id: parseInt(chatId) } },
    });
    console.log(`   Action: ${result.action}`);
    console.log(`   Success: ${result.success}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  } catch (err: any) {
    console.log(`   Error: ${err.message}`);
  }
  console.log('');

  // 5. Test handleCallback with invalid format
  console.log('5. TEST handleCallback (invalid format)');
  try {
    const result = await handleCallback({
      id: `test_${Date.now()}_cb2`,
      data: 'invalid_format',
      from: { id: 123456, first_name: 'Test User' },
      message: { message_id: 1, chat: { id: parseInt(chatId) } },
    });
    console.log(`   Action: ${result.action}`);
    console.log(`   Success: ${result.success}`);
  } catch (err: any) {
    console.log(`   Error: ${err.message}`);
  }
  console.log('');

  // 6. Test duplicate callback prevention
  console.log('6. TEST duplicate callback prevention');
  try {
    const cbId = `test_${Date.now()}_duplicate`;
    const result1 = await handleCallback({
      id: cbId,
      data: 'reject:test_dupe',
      from: { id: 123456, first_name: 'Test User' },
      message: { message_id: 1, chat: { id: parseInt(chatId) } },
    });
    const result2 = await handleCallback({
      id: cbId,
      data: 'reject:test_dupe',
      from: { id: 123456, first_name: 'Test User' },
      message: { message_id: 1, chat: { id: parseInt(chatId) } },
    });
    console.log(`   First call: ${result1.action} (success: ${result1.success})`);
    console.log(`   Second call: ${result2.action} (success: ${result2.success})`);
    console.log(`   Duplicate prevention: ${result2.action === 'duplicate_ignored' ? 'WORKING ✓' : 'FAILED ✗'}`);
  } catch (err: any) {
    console.log(`   Error: ${err.message}`);
  }
  console.log('');

  // 7. Start poller
  console.log('7. POLLER STARTUP');
  console.log('   Starting Telegram long-polling (3s interval)...');
  startTelegramPolling(3000);
  await new Promise(r => setTimeout(r, 2000));
  console.log(`   Poller running: ${isTelegramPolling() ? 'YES ✓' : 'NO ✗'}`);
  console.log(`   Pending approvals in memory: ${listPendingApprovals().length}`);
  console.log('');

  // 8. Send test preview
  console.log('8. SENDING TEST PREVIEW (NO AUTO-PUBLISH)');
  try {
    const content = getDailyPost();
    console.log(`   Topic: ${content.topic}`);
    console.log(`   Category: ${content.category}`);
    
    const result = await sendApprovalPreview(content, chatId);
    if (result.success) {
      console.log(`   ✓ Preview sent! Approval ID: ${result.approvalId}`);
      console.log(`   ✓ Waiting for callback... (polling active)`);
    } else {
      console.error(`   ✗ Failed to send preview: ${result.error}`);
    }
  } catch (err: any) {
    console.error(`   ✗ Error sending preview: ${err.message}`);
  }
  console.log('');

  // 9. Final status
  console.log('9. CURRENT STATUS');
  const stats = getApprovalStats();
  console.log(`   Total approvals: ${stats.total}`);
  console.log(`   Pending: ${stats.pending}`);
  console.log(`   Approved: ${stats.approved}`);
  console.log(`   Rejected: ${stats.rejected}`);
  console.log(`   Modified: ${stats.modified}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  TEST COMPLETE — POLLER IS RUNNING');
  console.log('  Check your Telegram chat for the preview.');
  console.log('  Tap APPROVE / MODIFY / REJECT to test callbacks.');
  console.log('  Watch server logs for callback reception.');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('Poller is active. Send Ctrl+C to stop.');

  process.on('SIGINT', () => {
    console.log('\\nStopping poller...');
    stopTelegramPolling();
    process.exit(0);
  });

  // Keep process alive using stdin resume (standard Node.js pattern)
  process.stdin.resume();
  console.log('STDIN resumed. Process staying alive.');
  console.log('PID:', process.pid, '- send Ctrl+C or kill to stop.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  stopTelegramPolling();
  process.exit(1);
});
