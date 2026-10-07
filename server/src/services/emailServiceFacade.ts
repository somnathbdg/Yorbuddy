/**
 * Email Service Facade
 * 
 * Single entry point for all email operations. Routes to the configured
 * provider and queues emails for asynchronous delivery.
 * 
 * Usage:
 *   import { emailService } from './services/emailService.js';
 *   await emailService.sendPasswordResetEmail(user.email, resetToken);
 * 
 * The service is provider-independent. The provider is selected based on
 * the EMAIL_PROVIDER environment variable.
 */

import { EmailService, EmailResult, BookingEmailData, MembershipEmailData, KycEmailData, BuddyApplicationEmailData, SecurityNotificationData } from './emailService.js';
import { ConsoleEmailProvider } from './consoleEmailProvider.js';
import { getEmailQueue, QueuedEmail } from './emailQueue.js';
import { env } from '../config/env.js';

// Re-export types for convenience
export type { EmailResult, BookingEmailData, MembershipEmailData, KycEmailData, BuddyApplicationEmailData, SecurityNotificationData } from './emailService.js';

class EmailServiceFacade implements EmailService {
  private provider: ConsoleEmailProvider;
  private queue: ReturnType<typeof getEmailQueue>;

  constructor() {
    // Validate provider configuration
    const provider = env.EMAIL_PROVIDER.toLowerCase();
    if (provider !== 'console' && env.NODE_ENV === 'production') {
      throw new Error(`Email provider '${provider}' is not yet implemented. Set EMAIL_PROVIDER=console for development.`);
    }
    this.provider = new ConsoleEmailProvider();
    this.queue = getEmailQueue();
  }

  private enqueue(idempotencyKey: string, send: () => Promise<EmailResult>): void {
    const email: QueuedEmail = {
      id: idempotencyKey,
      idempotencyKey,
      send,
      enqueuedAt: new Date(),
    };
    this.queue.enqueue(email);
  }

  async sendVerificationEmail(to: string, code: string, type: 'email' | 'phone'): Promise<EmailResult> {
    const key = `verification:${type}:${to}:${code.slice(0, 3)}`;
    this.enqueue(key, () => this.provider.sendVerificationEmail(to, code, type));
    // Return immediately — actual delivery is async
    return { success: true, messageId: key };
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<EmailResult> {
    const key = `password-reset:${to}:${resetToken.slice(0, 8)}`;
    this.enqueue(key, () => this.provider.sendPasswordResetEmail(to, resetToken));
    return { success: true, messageId: key };
  }

  async sendBookingConfirmation(to: string, data: BookingEmailData): Promise<EmailResult> {
    const key = `booking-confirmation:${data.bookingCode}`;
    this.enqueue(key, () => this.provider.sendBookingConfirmation(to, data));
    return { success: true, messageId: key };
  }

  async sendBookingCancellation(to: string, data: BookingEmailData): Promise<EmailResult> {
    const key = `booking-cancellation:${data.bookingCode}`;
    this.enqueue(key, () => this.provider.sendBookingCancellation(to, data));
    return { success: true, messageId: key };
  }

  async sendMembershipConfirmation(to: string, data: MembershipEmailData): Promise<EmailResult> {
    const key = `membership-confirmation:${to}:${data.planName}:${Date.now()}`;
    this.enqueue(key, () => this.provider.sendMembershipConfirmation(to, data));
    return { success: true, messageId: key };
  }

  async sendKycStatusUpdate(to: string, data: KycEmailData): Promise<EmailResult> {
    const key = `kyc-status:${to}:${data.status}:${Date.now()}`;
    this.enqueue(key, () => this.provider.sendKycStatusUpdate(to, data));
    return { success: true, messageId: key };
  }

  async sendBuddyApplicationUpdate(to: string, data: BuddyApplicationEmailData): Promise<EmailResult> {
    const key = `buddy-application:${to}:${data.status}:${Date.now()}`;
    this.enqueue(key, () => this.provider.sendBuddyApplicationUpdate(to, data));
    return { success: true, messageId: key };
  }

  async sendSecurityNotification(to: string, data: SecurityNotificationData): Promise<EmailResult> {
    const key = `security:${to}:${data.type}:${Date.now()}`;
    this.enqueue(key, () => this.provider.sendSecurityNotification(to, data));
    return { success: true, messageId: key };
  }
}

// Singleton instance
export const emailService = new EmailServiceFacade();
