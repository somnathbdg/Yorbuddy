/**
 * Facebook Automation Script for YorBuddy — APPROVAL MODE
 * 
 * This script:
 * 1. Generates the daily YorBuddy post content
 * 2. Generates a PNG image for the post (no emoji encoding issues)
 * 3. Shows the complete post preview (image + text)
 * 4. Waits for explicit approval ("YES" or "APPROVE")
 * 5. Only then publishes to Facebook and verifies
 * 
 * Environment variables required:
 *   FACEBOOK_PAGE_ID
 *   FACEBOOK_PAGE_ACCESS_TOKEN
 *   FACEBOOK_API_VERSION (optional, defaults to v26.0)
 *   FACEBOOK_IMAGE_DIR (optional, defaults to /tmp/facebook-images)
 * 
 * NEVER publishes without explicit approval.
 * Token is never displayed.
 */

import 'dotenv/config';
import { getDailyPost } from '../services/facebookContentService.js';
import { generatePostImage } from '../services/facebookImageGenerator.js';
import {
  publishPostWithImage,
  verifyPost,
  checkConnection,
} from '../services/facebookPublisher.js';

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    YorBuddy Facebook Automation — APPROVAL MODE');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // Step 1: Check connection
  console.log('1. Checking Facebook connection...');
  const connection = await checkConnection();

  if (!connection.success) {
    console.error(`   Connection failed: ${connection.error}`);
    process.exit(1);
  }
  console.log(`   Connected to Page: ${connection.pageId}`);
  console.log('');

  // Step 2: Generate content
  console.log('2. Generating daily post content...');
  const content = getDailyPost();
  console.log(`   Category: ${content.category}`);
  console.log(`   Topic: ${content.topic}`);
  console.log('');

  // Step 3: Generate image
  console.log('3. Generating post image...');
  let imagePath: string;
  try {
    imagePath = await generatePostImage(content);
    console.log(`   Image generated: ${imagePath}`);
  } catch (err: any) {
    console.error(`   Image generation failed: ${err.message}`);
    process.exit(1);
  }
  console.log('');

  // Step 4: Build the full post message (caption + CTA + hashtags)
  const fullMessage = `${content.cta}\n\n${content.caption}\n\n${content.hashtags.join(' ')}`;

  // Step 5: Show preview
  console.log('═══════════════════════════════════════════════════');
  console.log('   POST PREVIEW — Awaiting Approval');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`📌 Topic:    ${content.topic}`);
  console.log(`📂 Category: ${content.category}`);
  console.log(`🖼️ Image:   ${imagePath}`);
  console.log('');
  console.log('── Caption ───────────────────────────────────────');
  console.log('');
  console.log(content.caption);
  console.log('');
  console.log('── CTA ──────────────────────────────────────────');
  console.log('');
  console.log(content.cta);
  console.log('');
  console.log('── Hashtags ─────────────────────────────────────');
  console.log('');
  console.log(content.hashtags.join(' '));
  console.log('');
  console.log('── Image Description ────────────────────────────');
  console.log('');
  console.log(content.imageDescription);
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // Step 6: Approval gate
  console.log('───────────────────────────────────────────────────');
  console.log('   AWAITING APPROVAL');
  console.log('───────────────────────────────────────────────────');
  console.log('');
  console.log('Reply "YES" or "APPROVE" to publish this post.');
  console.log('Any other response will cancel.');
  console.log('');

  // Read user input
  process.stdout.write('Your decision: ');
  const decision = await new Promise<string>((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase());
    });
  });

  if (decision !== 'yes' && decision !== 'approve') {
    console.log('');
    console.log('❌ Cancelled. Post was NOT published.');
    console.log(`   Image kept at: ${imagePath}`);
    process.exit(0);
  }

  console.log('');
  console.log('✅ Approved. Publishing...');
  console.log('');

  // Step 7: Publish with image
  console.log('4. Publishing post with image to Facebook...');
  const result = await publishPostWithImage(fullMessage, imagePath);

  if (!result.success) {
    console.error(`   Publish failed: ${result.error}`);
    console.log(`   Image available at: ${imagePath}`);
    process.exit(1);
  }

  const postId = result.postId!;
  console.log(`   Published! Post ID: ${postId}`);
  console.log('');

  // Step 8: Verify
  console.log('5. Verifying post on Facebook...');
  const verification = await verifyPost(postId);

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('   WORKFLOW COMPLETE');
  console.log('═══════════════════════════════════════════════════');
  console.log(`   Post ID:     ${postId}`);
  console.log(`   Status:      ${verification.success ? '✅ VERIFIED' : '⚠️ UNVERIFIED'}`);
  if (verification.createdAt) {
    console.log(`   Created:     ${verification.createdAt}`);
  }
  if (verification.message) {
    console.log(`   Message:     ${verification.message}`);
  }
  console.log(`   Image file:  ${imagePath}`);
  console.log('═══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
