/**
 * Email Service Interface
 * 
 * Provider-independent email architecture for YorBuddy.
 * All email sending goes through this interface, allowing
 * providers to be swapped without changing business logic.
 */

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailTemplateData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface BookingEmailData {
  bookingCode: string;
  userName: string;
  buddyName: string;
  activity: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  amount: number;
}

export interface MembershipEmailData {
  planName: string;
  amount: number;
  startDate: string;
  expiryDate: string | null;
}

export interface KycEmailData {
  status: 'submitted' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface BuddyApplicationEmailData {
  status: 'submitted' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface SecurityNotificationData {
  type: string;
  message: string;
}

/**
 * Provider-independent email service interface.
 * Implementations must never throw — they return EmailResult.
 */
export interface EmailService {
  sendVerificationEmail(to: string, code: string, type: 'email' | 'phone'): Promise<EmailResult>;
  sendPasswordResetEmail(to: string, resetToken: string): Promise<EmailResult>;
  sendBookingConfirmation(to: string, data: BookingEmailData): Promise<EmailResult>;
  sendBookingCancellation(to: string, data: BookingEmailData): Promise<EmailResult>;
  sendMembershipConfirmation(to: string, data: MembershipEmailData): Promise<EmailResult>;
  sendKycStatusUpdate(to: string, data: KycEmailData): Promise<EmailResult>;
  sendBuddyApplicationUpdate(to: string, data: BuddyApplicationEmailData): Promise<EmailResult>;
  sendSecurityNotification(to: string, data: SecurityNotificationData): Promise<EmailResult>;
}
