/**
 * Console Email Provider
 * 
 * Development-only email provider that logs emails to console.
 * NEVER sends real emails. NEVER logs secrets.
 * 
 * This provider is selected when EMAIL_PROVIDER=console (default in development).
 */

import { EmailService, EmailResult, BookingEmailData, MembershipEmailData, KycEmailData, BuddyApplicationEmailData, SecurityNotificationData } from './emailService.js';
import { verificationEmail, passwordResetEmail, bookingConfirmationEmail, bookingCancellationEmail, membershipConfirmationEmail, kycStatusEmail, buddyApplicationEmail, securityNotificationEmail, EmailTemplate } from './emailTemplates.js';
import { env } from '../config/env.js';

export class ConsoleEmailProvider implements EmailService {
  private providerName = 'console';

  private logEmail(template: EmailTemplate, to: string): EmailResult {
    // In development, log a safe summary — never log the full email body
    // which might contain verification codes or reset tokens
    const isDev = env.NODE_ENV === 'development';
    
    if (isDev) {
      // Safe development log: recipient and subject only, no body content
      console.log(`[EMAIL:${this.providerName}] To: ${to} | Subject: ${template.subject}`);
    } else {
      // Production: minimal log, no content
      console.log(`[EMAIL] Queued: ${template.subject} -> ${to}`);
    }

    return {
      success: true,
      messageId: `console-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  async sendVerificationEmail(to: string, code: string, type: 'email' | 'phone'): Promise<EmailResult> {
    const template = verificationEmail(code, type);
    return this.logEmail(template, to);
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<EmailResult> {
    // Build reset URL for the email template
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const template = passwordResetEmail(resetUrl);
    return this.logEmail(template, to);
  }

  async sendBookingConfirmation(to: string, data: BookingEmailData): Promise<EmailResult> {
    const template = bookingConfirmationEmail(data);
    return this.logEmail(template, to);
  }

  async sendBookingCancellation(to: string, data: BookingEmailData): Promise<EmailResult> {
    const template = bookingCancellationEmail(data);
    return this.logEmail(template, to);
  }

  async sendMembershipConfirmation(to: string, data: MembershipEmailData): Promise<EmailResult> {
    const template = membershipConfirmationEmail(data);
    return this.logEmail(template, to);
  }

  async sendKycStatusUpdate(to: string, data: KycEmailData): Promise<EmailResult> {
    const template = kycStatusEmail(data);
    return this.logEmail(template, to);
  }

  async sendBuddyApplicationUpdate(to: string, data: BuddyApplicationEmailData): Promise<EmailResult> {
    const template = buddyApplicationEmail(data);
    return this.logEmail(template, to);
  }

  async sendSecurityNotification(to: string, data: SecurityNotificationData): Promise<EmailResult> {
    const template = securityNotificationEmail(data);
    return this.logEmail(template, to);
  }
}
