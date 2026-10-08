/**
 * SendGrid Email Provider
 *
 * Production email provider using the official @sendgrid/mail SDK.
 * Sends real emails via SendGrid's API.
 *
 * This provider is selected when EMAIL_PROVIDER=sendgrid.
 *
 * Required environment variables:
 *   - SENDGRID_API_KEY: SendGrid API key
 *   - EMAIL_FROM: Verified sender email address
 *   - EMAIL_FROM_NAME: Sender display name (optional, defaults to 'YorBuddy')
 *
 * Security:
 *   - API key is never logged or exposed in error responses
 *   - Errors are sanitized to remove sensitive data
 */

import { EmailService, EmailResult, BookingEmailData, MembershipEmailData, KycEmailData, BuddyApplicationEmailData, SecurityNotificationData } from './emailService.js';
import { verificationEmail, passwordResetEmail, bookingConfirmationEmail, bookingCancellationEmail, membershipConfirmationEmail, kycStatusEmail, buddyApplicationEmail, securityNotificationEmail, EmailTemplate } from './emailTemplates.js';
import { env } from '../config/env.js';
import sgMail from '@sendgrid/mail';

function validateConfig(): void {
  const errors: string[] = [];
  if (!process.env.SENDGRID_API_KEY) {
    errors.push('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid');
  }
  if (!env.EMAIL_FROM) {
    errors.push('EMAIL_FROM is required when EMAIL_PROVIDER=sendgrid');
  }
  if (errors.length > 0) {
    throw new Error(`SendGrid configuration error: ${errors.join('; ')}`);
  }
}

function sanitizeError(err: any): string {
  // Never expose API keys or sensitive data in error messages
  const message = err?.message || err?.toString() || 'Unknown SendGrid error';
  // Remove any potential API key patterns
  return message.replace(/SG\.[a-zA-Z0-9_-]+/g, '[REDACTED]');
}

export class SendGridEmailProvider implements EmailService {
  private providerName = 'sendgrid';
  private fromEmail: string;
  private fromName: string;

  constructor() {
    validateConfig();
    this.fromEmail = env.EMAIL_FROM;
    this.fromName = env.EMAIL_FROM_NAME || 'YorBuddy';
  }

  private async sendTemplate(to: string, template: EmailTemplate): Promise<EmailResult> {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

      const msg = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      await sgMail.send(msg);

      return {
        success: true,
        messageId: `sendgrid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
    } catch (err: any) {
      // Log error without exposing API key
      console.error(`[EMAIL:${this.providerName}] Failed to send to ${to}:`, sanitizeError(err));
      return {
        success: false,
        error: sanitizeError(err),
      };
    }
  }

  async sendVerificationEmail(to: string, code: string, type: 'email' | 'phone'): Promise<EmailResult> {
    const template = verificationEmail(code, type);
    return this.sendTemplate(to, template);
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<EmailResult> {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const template = passwordResetEmail(resetUrl);
    return this.sendTemplate(to, template);
  }

  async sendBookingConfirmation(to: string, data: BookingEmailData): Promise<EmailResult> {
    const template = bookingConfirmationEmail(data);
    return this.sendTemplate(to, template);
  }

  async sendBookingCancellation(to: string, data: BookingEmailData): Promise<EmailResult> {
    const template = bookingCancellationEmail(data);
    return this.sendTemplate(to, template);
  }

  async sendMembershipConfirmation(to: string, data: MembershipEmailData): Promise<EmailResult> {
    const template = membershipConfirmationEmail(data);
    return this.sendTemplate(to, template);
  }

  async sendKycStatusUpdate(to: string, data: KycEmailData): Promise<EmailResult> {
    const template = kycStatusEmail(data);
    return this.sendTemplate(to, template);
  }

  async sendBuddyApplicationUpdate(to: string, data: BuddyApplicationEmailData): Promise<EmailResult> {
    const template = buddyApplicationEmail(data);
    return this.sendTemplate(to, template);
  }

  async sendSecurityNotification(to: string, data: SecurityNotificationData): Promise<EmailResult> {
    const template = securityNotificationEmail(data);
    return this.sendTemplate(to, template);
  }
}
