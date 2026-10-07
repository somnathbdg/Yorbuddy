/**
 * Facebook Automation Cron Job for YorBuddy — APPROVAL MODE
 * 
 * CRON IS DISABLED BY DEFAULT.
 * 
 * Posts publish ONLY after explicit approval via:
 * - The facebookAutomation.ts script (interactive)
 * - The /api/facebook/publish endpoint
 * 
 * After publishing, sends a Telegram notification (if configured).
 */

import cron from 'node-cron';
import { getDailyPost, FacebookPostContent } from '../services/facebookContentService.js';
import { generatePostImage } from '../services/facebookImageGenerator.js';
import { publishPostWithImage, verifyPost } from '../services/facebookPublisher.js';
import { sendFacebookPostPublishedNotification } from '../services/telegramService.js';

let isRunning = false;

/**
 * Build the full post message from content
 */
function buildMessage(content: FacebookPostContent): string {
  return `${content.cta}\n\n${content.caption}\n\n${content.hashtags.join(' ')}`;
}

/**
 * Publish the daily post with image and verify it.
 * Sends Telegram notification if TELEGRAM_BOT_TOKEN is set.
 */
export async function publishDailyPost(): Promise<{
  success: boolean;
  postId?: string;
  error?: string;
  content?: FacebookPostContent;
}> {
  if (isRunning) {
    console.log('[FACEBOOK] Previous run still in progress, skipping...');
    return { success: false, error: 'Previous run still in progress' };
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    // Generate content
    const content = getDailyPost();
    console.log(`[FACEBOOK] Generated post: ${content.topic} (${content.category})`);

    // Generate image
    console.log('[FACEBOOK] Generating post image...');
    const imagePath = await generatePostImage(content);
    console.log(`[FACEBOOK] Image generated: ${imagePath}`);

    // Build message
    const message = buildMessage(content);

    // Publish with image
    const result = await publishPostWithImage(message, imagePath);

    if (!result.success) {
      console.error(`[FACEBOOK] Publish failed: ${result.error}`);
      return { success: false, error: result.error, content };
    }

    const postId = result.postId!;
    console.log(`[FACEBOOK] Published! Post ID: ${postId}`);

    // Verify
    const verification = await verifyPost(postId);
    const elapsed = Date.now() - startTime;

    if (verification.success) {
      console.log(`[FACEBOOK] Verified in ${elapsed}ms. Post is live.`);
    } else {
      console.warn(`[FACEBOOK] Verification warning: ${verification.message}`);
    }

    // Send Telegram notification if configured
    try {
      const telegramResult = await sendFacebookPostPublishedNotification({
        postId,
        topic: content.topic,
        category: content.category,
        createdAt: verification.createdAt,
      });
      if (telegramResult.success) {
        console.log('[TELEGRAM] Notification sent successfully.');
      } else {
        console.warn(`[TELEGRAM] Notification failed: ${telegramResult.error}`);
      }
    } catch (telegramErr: any) {
      console.warn(`[TELEGRAM] Notification error: ${telegramErr.message}`);
    }

    return {
      success: true,
      postId,
      content,
    };
  } catch (err: any) {
    console.error(`[FACEBOOK] Unexpected error: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    isRunning = false;
  }
}

/**
 * Register the daily Facebook automation cron job
 * Requires FACEBOOK_CRON_ENABLED=true to activate.
 */
export function registerFacebookCronJob(): void {
  // CRON IS DISABLED BY DEFAULT
  if (process.env.FACEBOOK_CRON_ENABLED !== 'true') {
    console.log('[FACEBOOK] Cron job is DISABLED. Set FACEBOOK_CRON_ENABLED=true to activate.');
    return;
  }

  if (process.env.DISABLE_FACEBOOK_CRON === 'true') {
    console.log('[FACEBOOK] Cron job disabled via DISABLE_FACEBOOK_CRON env var');
    return;
  }

  // Default: 9:00 AM IST = 03:30 UTC
  const schedule = process.env.FACEBOOK_CRON_SCHEDULE || '30 3 * * *';

  cron.schedule(schedule, async () => {
    console.log('[FACEBOOK] Running scheduled daily post...');
    await publishDailyPost();
  });

  console.log(`[FACEBOOK] Scheduled daily post: ${schedule} (default: 9:00 AM IST)`);
}

/**
 * Get the next scheduled post preview (for dashboard/admin)
 */
export async function previewNextPost(): Promise<{
  content: FacebookPostContent;
  formatted: string;
}> {
  const content = getDailyPost();
  const { formatPostPreview } = await import('../services/facebookContentService.js');
  const formatted = formatPostPreview(content);
  return { content, formatted };
}

/**
 * Manually trigger a post publish (for admin panel)
 */
export async function triggerManualPost(
  category?: string,
  index?: number
): Promise<{
  success: boolean;
  postId?: string;
  error?: string;
}> {
  let content: FacebookPostContent;

  if (category) {
    const { getPostByCategory } = await import('../services/facebookContentService.js');
    content = getPostByCategory(category as any, index);
  } else {
    content = getDailyPost();
  }

  const imagePath = await generatePostImage(content);
  const message = buildMessage(content);
  const result = await publishPostWithImage(message, imagePath);

  if (result.success) {
    const verification = await verifyPost(result.postId!);
    return {
      success: true,
      postId: result.postId,
      error: verification.success ? undefined : verification.message,
    };
  }

  return { success: false, error: result.error };
}
