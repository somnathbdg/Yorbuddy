import { env } from '../config/env.js';

/**
 * ============================================================================
 * Email Service (Development Mode)
 * ============================================================================
 * 
 * In development, reset links are logged to console instead of being sent via email.
 * For production, replace the sendPasswordResetEmail function with actual SMTP/Nodemailer logic.
 * 
 * ============================================================================
 */

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send a password reset email.
 * 
 * DEVELOPMENT: Logs the reset link to console.
 * PRODUCTION: Replace with actual email provider (SendGrid, Nodemailer/SMTP, etc.)
 */
export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
  
  const emailPayload: EmailPayload = {
    to,
    subject: 'YorBuddy Password Reset',
    text: `
You requested a password reset for your YorBuddy account.

Click the link below to set a new password:
${resetUrl}

This link expires in 1 hour and can only be used once.

If you did not request this, please ignore this email. Your password remains unchanged.

— YorBuddy Team
    `.trim(),
    html: `
<p>You requested a password reset for your YorBuddy account.</p>
<p>Click the link below to set a new password:</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p><strong>This link expires in 1 hour and can only be used once.</strong></p>
<p>If you did not request this, please ignore this email. Your password remains unchanged.</p>
<p>— YorBuddy Team</p>
    `.trim(),
  };

  if (env.NODE_ENV === 'development') {
    console.log('\n' + '='.repeat(72));
    console.log('  PASSWORD RESET EMAIL (Development Mode)');
    console.log('='.repeat(72));
    console.log('  To:', emailPayload.to);
    console.log('  Subject:', emailPayload.subject);
    console.log('  Reset URL:', resetUrl);
    console.log('='.repeat(72) + '\n');
    return true;
  }

  // Production: Implement actual email sending here
  // Example with Nodemailer:
  // const transporter = createTransport({ host: env.SMTP_HOST, ... });
  // await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, text, html });
  
  console.warn('[EMAIL] Production email not configured. Set up SMTP in utils/email.ts');
  return false;
}
