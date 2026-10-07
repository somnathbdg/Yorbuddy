/**
 * Email Templates
 * 
 * Reusable templates for all YorBuddy emails.
 * Each template returns plain text and HTML versions.
 * Templates never include passwords, tokens, or secrets.
 */

import { BookingEmailData, MembershipEmailData, KycEmailData, BuddyApplicationEmailData, SecurityNotificationData } from './emailService.js';

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

const brandColor = '#2563EB';
const brandName = 'YorBuddy';

function wrapHtml(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color:#f8fafc;">
  <table role="presentation" style="width:100%; border-collapse:collapse; background-color:#f8fafc;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:32px 40px; text-align:center; border-bottom:1px solid #e2e8f0;">
              <h1 style="margin:0; font-size:28px; font-weight:800; color:#1e293b;">${brandName}</h1>
              <p style="margin:4px 0 0; font-size:14px; color:#64748b;">Verified Platonic Connections</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px; text-align:center; border-top:1px solid #e2e8f0; background-color:#f8fafc; border-radius:0 0 16px 16px;">
              <p style="margin:0; font-size:12px; color:#94a3b8;">
                This email was sent by ${brandName}. If you did not request this, please ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function verificationEmail(code: string, type: 'email' | 'phone'): EmailTemplate {
  const label = type === 'email' ? 'email address' : 'phone number';
  return {
    subject: `Verify your ${label} - ${brandName}`,
    text: `
Hello,

Your ${brandName} verification code is: ${code}

This code will expire in 10 minutes.

If you did not request this, please ignore this email.

— ${brandName} Team
    `.trim(),
    html: wrapHtml(`
      <p style="margin:0 0 16px; font-size:16px; color:#334155;">Hello,</p>
      <p style="margin:0 0 16px; font-size:16px; color:#334155;">Your ${brandName} verification code is:</p>
      <p style="margin:0 0 24px; font-size:32px; font-weight:800; color:${brandColor}; text-align:center; letter-spacing:4px;">${code}</p>
      <p style="margin:0 0 16px; font-size:14px; color:#64748b;">This code will expire in 10 minutes.</p>
      <p style="margin:0; font-size:14px; color:#64748b;">If you did not request this, please ignore this email.</p>
    `),
  };
}

export function passwordResetEmail(resetUrl: string): EmailTemplate {
  return {
    subject: `Password Reset - ${brandName}`,
    text: `
Hello,

You requested a password reset for your ${brandName} account.

Click the link below to set a new password:
${resetUrl}

This link expires in 1 hour and can only be used once.

If you did not request this, please ignore this email. Your password remains unchanged.

— ${brandName} Team
    `.trim(),
    html: wrapHtml(`
      <p style="margin:0 0 16px; font-size:16px; color:#334155;">Hello,</p>
      <p style="margin:0 0 16px; font-size:16px; color:#334155;">You requested a password reset for your ${brandName} account.</p>
      <p style="margin:0 0 24px; text-align:center;">
        <a href="${resetUrl}" style="display:inline-block; padding:12px 32px; background-color:${brandColor}; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:600;">Reset Password</a>
      </p>
      <p style="margin:0 0 16px; font-size:14px; color:#64748b;">This link expires in 1 hour and can only be used once.</p>
      <p style="margin:0; font-size:14px; color:#64748b;">If you did not request this, please ignore this email. Your password remains unchanged.</p>
    `),
  };
}

export function bookingConfirmationEmail(data: BookingEmailData): EmailTemplate {
  return {
    subject: `Booking Confirmed - ${data.bookingCode} - ${brandName}`,
    text: `
Hello ${data.userName},

Your booking has been confirmed!

Booking Details:
- Booking Code: ${data.bookingCode}
- Buddy: ${data.buddyName}
- Activity: ${data.activity}
- Date: ${data.date}
- Time: ${data.time}
- Duration: ${data.duration}
- Location: ${data.location}
- Amount: ₹${data.amount}

Please arrive on time and meet at the public location specified.

— ${brandName} Team
    `.trim(),
    html: wrapHtml(`
      <p style="margin:0 0 16px; font-size:16px; color:#334155;">Hello ${data.userName},</p>
      <p style="margin:0 0 24px; font-size:18px; font-weight:600; color:#059669;">Your booking has been confirmed!</p>
      <table role="presentation" style="width:100%; border-collapse:collapse; margin:0 0 24px;">
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Booking Code:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.bookingCode}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Buddy:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.buddyName}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Activity:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.activity}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Date:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.date}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Time:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.time}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Duration:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.duration}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Location:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.location}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Amount:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">₹${data.amount}</td></tr>
      </table>
      <p style="margin:0; font-size:14px; color:#64748b;">Please arrive on time and meet at the public location specified.</p>
    `),
  };
}

export function bookingCancellationEmail(data: BookingEmailData): EmailTemplate {
  return {
    subject: `Booking Cancelled - ${data.bookingCode} - ${brandName}`,
    text: `
Hello ${data.userName},

Your booking has been cancelled.

Booking Details:
- Booking Code: ${data.bookingCode}
- Buddy: ${data.buddyName}
- Activity: ${data.activity}
- Date: ${data.date}
- Time: ${data.time}

If you have any questions, please contact support.

— ${brandName} Team
    `.trim(),
    html: wrapHtml(`
      <p style="margin:0 0 16px; font-size:16px; color:#334155;">Hello ${data.userName},</p>
      <p style="margin:0 0 24px; font-size:18px; font-weight:600; color:#dc2626;">Your booking has been cancelled.</p>
      <table role="presentation" style="width:100%; border-collapse:collapse; margin:0 0 24px;">
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Booking Code:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.bookingCode}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Buddy:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.buddyName}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Activity:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.activity}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Date:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.date}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Time:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.time}</td></tr>
      </table>
      <p style="margin:0; font-size:14px; color:#64748b;">If you have any questions, please contact support.</p>
    `),
  };
}

export function membershipConfirmationEmail(data: MembershipEmailData): EmailTemplate {
  const expiryText = data.expiryDate ? `Expires: ${data.expiryDate}` : 'Never expires';
  return {
    subject: `Membership Activated - ${data.planName} - ${brandName}`,
    text: `
Hello,

Your ${brandName} membership has been activated!

Membership Details:
- Plan: ${data.planName}
- Amount: ₹${data.amount}
- Start Date: ${data.startDate}
- ${expiryText}

Thank you for joining ${brandName}!

— ${brandName} Team
    `.trim(),
    html: wrapHtml(`
      <p style="margin:0 0 16px; font-size:16px; color:#334155;">Hello,</p>
      <p style="margin:0 0 24px; font-size:18px; font-weight:600; color:#059669;">Your ${brandName} membership has been activated!</p>
      <table role="presentation" style="width:100%; border-collapse:collapse; margin:0 0 24px;">
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Plan:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.planName}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Amount:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">₹${data.amount}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">Start Date:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${data.startDate}</td></tr>
        <tr><td style="padding:8px 0; font-size:14px; color:#64748b;">${expiryText.includes('Never') ? 'Validity' : 'Expiry'}:</td><td style="padding:8px 0; font-size:14px; font-weight:600; color:#1e293b;">${expiryText}</td></tr>
      </table>
      <p style="margin:0; font-size:14px; color:#64748b;">Thank you for joining ${brandName}!</p>
    `),
  };
}

export function kycStatusEmail(data: KycEmailData): EmailTemplate {
  const statusMap = {
    submitted: { title: 'KYC Submitted', color: '#d97706', message: 'Your KYC documents have been submitted and are under review.' },
    approved: { title: 'KYC Approved', color: '#059669', message: 'Your identity has been verified. You now have full access to all platform features.' },
    rejected: { title: 'KYC Rejected', color: '#dc2626', message: 'Your KYC submission was not approved.' },
  };
  const status = statusMap[data.status];
  const reasonText = data.rejectionReason ? `\n\nReason: ${data.rejectionReason}` : '';
  return {
    subject: `${status.title} - ${brandName}`,
    text: `
Hello,

${status.message}${reasonText}

If you have any questions, please contact support.

— ${brandName} Team
    `.trim(),
    html: wrapHtml(`
      <p style="margin:0 0 16px; font-size:16px; color:#334155;">Hello,</p>
      <p style="margin:0 0 24px; font-size:18px; font-weight:600; color:${status.color};">${status.message}</p>
      ${data.rejectionReason ? `<p style="margin:0 0 16px; font-size:14px; color:#64748b;">Reason: ${data.rejectionReason}</p>` : ''}
      <p style="margin:0; font-size:14px; color:#64748b;">If you have any questions, please contact support.</p>
    `),
  };
}

export function buddyApplicationEmail(data: BuddyApplicationEmailData): EmailTemplate {
  const statusMap = {
    submitted: { title: 'Application Submitted', color: '#d97706', message: 'Your buddy application has been submitted and is under review.' },
    approved: { title: 'Application Approved', color: '#059669', message: 'Congratulations! Your buddy application has been approved.' },
    rejected: { title: 'Application Rejected', color: '#dc2626', message: 'Your buddy application was not approved.' },
  };
  const status = statusMap[data.status];
  const reasonText = data.rejectionReason ? `\n\nReason: ${data.rejectionReason}` : '';
  return {
    subject: `${status.title} - ${brandName}`,
    text: `
Hello,

${status.message}${reasonText}

If you have any questions, please contact support.

— ${brandName} Team
    `.trim(),
    html: wrapHtml(`
      <p style="margin:0 0 16px; font-size:16px; color:#334155;">Hello,</p>
      <p style="margin:0 0 24px; font-size:18px; font-weight:600; color:${status.color};">${status.message}</p>
      ${data.rejectionReason ? `<p style="margin:0 0 16px; font-size:14px; color:#64748b;">Reason: ${data.rejectionReason}</p>` : ''}
      <p style="margin:0; font-size:14px; color:#64748b;">If you have any questions, please contact support.</p>
    `),
  };
}

export function securityNotificationEmail(data: SecurityNotificationData): EmailTemplate {
  return {
    subject: `Security Alert - ${brandName}`,
    text: `
Hello,

${data.type}: ${data.message}

If you did not perform this action, please contact support immediately.

— ${brandName} Team
    `.trim(),
    html: wrapHtml(`
      <p style="margin:0 0 16px; font-size:16px; color:#334155;">Hello,</p>
      <p style="margin:0 0 24px; font-size:18px; font-weight:600; color:#dc2626;">Security Alert</p>
      <p style="margin:0 0 16px; font-size:14px; color:#64748b;">${data.type}: ${data.message}</p>
      <p style="margin:0; font-size:14px; color:#64748b;">If you did not perform this action, please contact support immediately.</p>
    `),
  };
}
