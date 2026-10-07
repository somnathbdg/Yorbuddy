/**
 * Telegram Approval Workflow for YorBuddy Facebook Automation
 * 
 * Integrates with existing services:
 * - facebookContentService: post content generation
 * - facebookImageGenerator: PNG image generation
 * - facebookPublisher: publish/verify/delete posts
 * - telegramService: send messages, photos, handle callbacks
 * 
 * Flow:
 * 1. Generate post + image → send to Telegram with APPROVE/MODIFY/REJECT buttons
 * 2. User taps button → handle callback
 * 3. APPROVE → publish to Facebook, send success notification
 * 4. MODIFY → prompt user for changes, re-preview
 * 5. REJECT → mark as rejected, send confirmation
 */

import { getDailyPost, FacebookPostContent } from './facebookContentService.js';
import { generatePostImage } from './facebookImageGenerator.js';
import { publishPostWithImage, verifyPost } from './facebookPublisher.js';
import {
  sendTelegramMessage,
  sendPhotoWithKeyboard,
  answerCallbackQuery,
  editMessageReplyMarkup,
  getTelegramChatId,
} from './telegramService.js';

// Pending approval state (in-memory; could be moved to DB for persistence)
interface PendingApproval {
  approvalId: string;
  content: FacebookPostContent;
  imagePath: string;
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  createdAt: Date;
  messageId?: number;
  telegramChatId: string;
  publishedPostId?: string;
}

// Store pending approvals in memory
const pendingApprovals: Map<string, PendingApproval> = new Map();

/**
 * Generate a unique approval ID
 */
function generateApprovalId(): string {
  return `approval_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Send a post preview to Telegram with approval buttons
 */
export async function sendApprovalPreview(
  content?: FacebookPostContent,
  chatId: string = getTelegramChatId()
): Promise<{
  success: boolean;
  approvalId?: string;
  messageId?: number;
  photoUploaded?: boolean;
  captionPresent?: boolean;
  approvalButtonsPresent?: boolean;
  error?: string;
}> {
  if (!chatId) {
    return { success: false, error: 'TELEGRAM_CHAT_ID is not set' };
  }

  try {
    // Generate content if not provided
    const postContent = content || getDailyPost();

    // Generate image
    const imagePath = await generatePostImage(postContent);

    // Build approval ID
    const approvalId = generateApprovalId();

    // Store pending approval
    const pending: PendingApproval = {
      approvalId,
      content: postContent,
      imagePath,
      status: 'pending',
      createdAt: new Date(),
      telegramChatId: chatId,
    };
    pendingApprovals.set(approvalId, pending);

    // Build caption for Telegram
    const caption = buildApprovalCaption(postContent);

    // Build inline keyboard
    const keyboard = [
      [
        { text: '✅ APPROVE', callback_data: `approve:${approvalId}` },
        { text: '✏️ MODIFY', callback_data: `modify:${approvalId}` },
      ],
      [
        { text: '❌ REJECT', callback_data: `reject:${approvalId}` },
      ],
    ];

    // Send photo with keyboard
    const result = await sendPhotoWithKeyboard(imagePath, caption, keyboard, chatId);

    if (!result.success) {
      pendingApprovals.delete(approvalId);
      return { success: false, error: result.error };
    }

    // Update pending with message ID
    pending.messageId = result.messageId;

    return {
      success: true,
      approvalId,
      messageId: result.messageId,
      photoUploaded: result.photoUploaded,
      captionPresent: result.captionPresent,
      approvalButtonsPresent: result.approvalButtonsPresent,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Build the approval caption
 */
function buildApprovalCaption(content: FacebookPostContent): string {
  const lines = [
    '📱 <b>YorBuddy Facebook Post Preview</b>',
    '',
    `📌 <b>Topic:</b> ${content.topic}`,
    `📂 <b>Category:</b> ${content.category}`,
    '',
    '<b>── Caption ──────────────────────────</b>',
    '',
    content.caption,
    '',
    '<b>── CTA ─────────────────────────────</b>',
    '',
    content.cta,
    '',
    '<b>── Hashtags ────────────────────────</b>',
    '',
    content.hashtags.join(' '),
    '',
    '──────────────────────────────────────',
    'Tap APPROVE to publish this post to Facebook.',
  ];

  return lines.join('\n');
}

/**
 * Handle a Telegram callback query
 */
export async function handleCallback(callback: {
  id: string;
  data: string;
  from: { id: number; first_name: string; username?: string };
  message?: { message_id: number; chat: { id: number } };
}): Promise<{ success: boolean; action: string; error?: string }> {
  const { id: callbackId, data, from, message } = callback;

  // Prevent duplicate processing
  if (processedCallbacks.has(callbackId)) {
    return { success: true, action: 'duplicate_ignored' };
  }
  processedCallbacks.add(callbackId);

  // Parse callback data
  const separatorIndex = data.indexOf(':');
  if (separatorIndex === -1) {
    await answerCallbackQuery(callbackId, '❌ Invalid callback');
    return { success: false, action: 'invalid', error: 'Invalid callback format' };
  }

  const action = data.substring(0, separatorIndex);
  const approvalId = data.substring(separatorIndex + 1);

  // Get pending approval
  const pending = pendingApprovals.get(approvalId);
  if (!pending) {
    await answerCallbackQuery(callbackId, '⚠️ Approval expired or not found');
    return { success: false, action: 'not_found', error: 'Approval not found' };
  }

  // Handle based on action
  switch (action) {
    case 'approve':
      return handleApprove(pending, callbackId, message);
    case 'modify':
      return handleModify(pending, callbackId, from);
    case 'reject':
      return handleReject(pending, callbackId);
    default:
      await answerCallbackQuery(callbackId, '❌ Unknown action');
      return { success: false, action: 'unknown', error: 'Unknown action' };
  }
}

/**
 * Handle APPROVE callback
 */
async function handleApprove(
  pending: PendingApproval,
  callbackId: string,
  message?: { message_id: number; chat: { id: number } }
): Promise<{ success: boolean; action: string; error?: string }> {
  // Prevent duplicate publishing
  if (pending.status === 'approved' && pending.publishedPostId) {
    await answerCallbackQuery(callbackId, '⚠️ Already published!');
    return { success: true, action: 'already_published' };
  }

  if (pending.status === 'rejected') {
    await answerCallbackQuery(callbackId, '❌ Post was rejected');
    return { success: false, action: 'rejected', error: 'Post was previously rejected' };
  }

  // Acknowledge callback
  await answerCallbackQuery(callbackId, '✅ Approved! Publishing...');

  // Remove buttons from the message
  if (message) {
    await editMessageReplyMarkup(message.message_id, String(message.chat.id));
  }

  // Build full message
  const fullMessage = `${pending.content.cta}\n\n${pending.content.caption}\n\n${pending.content.hashtags.join(' ')}`;

  // Publish to Facebook
  const result = await publishPostWithImage(fullMessage, pending.imagePath);

  if (!result.success) {
    // Check for expired token
    if (result.error?.includes('#190') || result.error?.includes('expired')) {
      await sendTelegramMessage(
        '❌ <b>Facebook Token Expired</b>\n\n' +
        'The Facebook access token has expired. Please renew it:\n' +
        '1. Go to Meta Developers → YorBuddy App → Get Page Token\n' +
        '2. Update FACEBOOK_PAGE_ACCESS_TOKEN in .env\n' +
        '3. Restart the server\n\n' +
        'Your post is NOT published.'
      );
      pending.status = 'pending'; // Allow retry after token renewal
      return { success: false, action: 'token_expired', error: 'Facebook token expired' };
    }

    await sendTelegramMessage(
      `❌ <b>Publish Failed</b>\n\nError: ${result.error}`
    );
    return { success: false, action: 'publish_failed', error: result.error };
  }

  const postId = result.postId!;

  // Verify the post
  const verification = await verifyPost(postId);

  // Update pending status
  pending.status = 'approved';
  pending.publishedPostId = postId;

  // Build Facebook post URL
  const postUrl = `https://www.facebook.com/${postId}`;

  // Send success notification
  const successMsg =
    '✅ <b>Post Published Successfully!</b>\n\n' +
    `📌 Topic: ${pending.content.topic}\n` +
    `🔗 Post ID: <code>${postId}</code>\n` +
    `✓ Verification: ${verification.success ? '✅ Verified' : '⚠️ Verification pending'}\n` +
    `🕐 Created: ${verification.createdAt || new Date().toISOString()}\n` +
    `🔗 <a href="${postUrl}">View on Facebook</a>`;

  await sendTelegramMessage(successMsg);

  return { success: true, action: 'approved', error: undefined };
}

/**
 * Handle MODIFY callback
 */
async function handleModify(
  pending: PendingApproval,
  callbackId: string,
  _from: { id: number; first_name: string; username?: string }
): Promise<{ success: boolean; action: string; error?: string }> {
  await answerCallbackQuery(callbackId, '✏️ Modify mode activated');

  // Remove buttons from the message
  if (pending.messageId) {
    await editMessageReplyMarkup(pending.messageId, pending.telegramChatId);
  }

  await sendTelegramMessage(
    '✏️ <b>MODIFY MODE</b>\n\n' +
    'Send me your revised content:\n\n' +
    '1. <b>New caption</b> – just send the new text\n' +
    '2. <b>New CTA</b> – send "CTA: your new CTA"\n' +
    '3. <b>New hashtags</b> – send "Tags: #new #tags"\n\n' +
    'Current post:\n' +
    `📌 ${pending.content.topic}\n` +
    `📝 ${pending.content.caption.substring(0, 100)}...\n\n` +
    'Send your changes and I\'ll re-preview the post!'
  );

  // Update status
  pending.status = 'modified';

  return { success: true, action: 'modify_mode', error: undefined };
}

/**
 * Handle REJECT callback
 */
async function handleReject(
  pending: PendingApproval,
  callbackId: string
): Promise<{ success: boolean; action: string; error?: string }> {
  // Acknowledge callback
  await answerCallbackQuery(callbackId, '❌ Post rejected');

  // Remove buttons from the message
  if (pending.messageId) {
    await editMessageReplyMarkup(pending.messageId, pending.telegramChatId);
  }

  // Update status
  pending.status = 'rejected';

  // Send confirmation
  await sendTelegramMessage(
    '❌ <b>Post Rejected</b>\n\n' +
    `📌 Topic: ${pending.content.topic}\n` +
    `📂 Category: ${pending.content.category}\n\n` +
    'This post will not be published.'
  );

  return { success: true, action: 'rejected', error: undefined };
}

/**
 * Get pending approval by ID
 */
export function getPendingApproval(approvalId: string): PendingApproval | undefined {
  return pendingApprovals.get(approvalId);
}

/**
 * List all pending approvals
 */
export function listPendingApprovals(): PendingApproval[] {
  return Array.from(pendingApprovals.values());
}

/**
 * Get stats
 */
export function getApprovalStats(): {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  modified: number;
} {
  const all = Array.from(pendingApprovals.values());
  return {
    total: all.length,
    pending: all.filter(a => a.status === 'pending').length,
    approved: all.filter(a => a.status === 'approved').length,
    rejected: all.filter(a => a.status === 'rejected').length,
    modified: all.filter(a => a.status === 'modified').length,
  };
}

/**
 * Update pending approval content (for MODIFY workflow)
 */
export async function updateApprovalContent(
  approvalId: string,
  updates: Partial<{ caption: string; cta: string; hashtags: string[]; topic: string }>
): Promise<{ success: boolean; error?: string }> {
  const pending = pendingApprovals.get(approvalId);
  if (!pending) {
    return { success: false, error: 'Approval not found' };
  }

  if (updates.caption) pending.content.caption = updates.caption;
  if (updates.cta) pending.content.cta = updates.cta;
  if (updates.hashtags) pending.content.hashtags = updates.hashtags;
  if (updates.topic) pending.content.topic = updates.topic;

  // Regenerate image with updated content
  pending.imagePath = await generatePostImage(pending.content);

  // Reset to pending for re-approval
  pending.status = 'pending';

  return { success: true };
}

/**
 * Resend approval preview (after modification)
 */
export async function resendApprovalPreview(
  approvalId: string
): Promise<{ success: boolean; error?: string }> {
  const pending = pendingApprovals.get(approvalId);
  if (!pending) {
    return { success: false, error: 'Approval not found' };
  }

  // Re-send with new content
  const caption = buildApprovalCaption(pending.content);
  const keyboard = [
    [
      { text: '✅ APPROVE', callback_data: `approve:${approvalId}` },
      { text: '✏️ MODIFY', callback_data: `modify:${approvalId}` },
    ],
    [
      { text: '❌ REJECT', callback_data: `reject:${approvalId}` },
    ],
  ];

  const result = await sendPhotoWithKeyboard(
    pending.imagePath,
    caption,
    keyboard,
    pending.telegramChatId
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  pending.messageId = result.messageId;
  pending.status = 'pending';

  return { success: true };
}

export const processedCallbacks: Set<string> = new Set();

/**
 * Handle MODIFY workflow: user sends revised text
 */
export async function handleModifyText(
  approvalId: string,
  text: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const pending = pendingApprovals.get(approvalId);
  if (!pending) {
    return { success: false, error: 'Approval not found' };
  }

  // Parse user input: detect caption, CTA, or hashtag updates
  let caption: string | undefined;
  let cta: string | undefined;
  let hashtags: string[] | undefined;
  let topic: string | undefined;

  if (text.startsWith('CTA:')) {
    cta = text.substring(4).trim();
  } else if (text.startsWith('Tags:')) {
    hashtags = text.substring(5).trim().split(/\s+/).filter(Boolean);
  } else if (text.startsWith('Topic:')) {
    topic = text.substring(6).trim();
  } else {
    caption = text;
  }

  const result = await updateApprovalContent(approvalId, { caption, cta, hashtags, topic });
  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Regenerate image and resend preview
  const resend = await resendApprovalPreview(approvalId);
  if (!resend.success) {
    return { success: false, error: 'Failed to resend preview' };
  }

  return {
    success: true,
    message: 'Preview updated with your changes. Review and approve or modify again.',
  };
}

export const telegramApprovalService = {
  sendApprovalPreview,
  handleCallback,
  getPendingApproval,
  listPendingApprovals,
  getApprovalStats,
  updateApprovalContent,
  resendApprovalPreview,
  processedCallbacks,
};
