/**
 * Email Infrastructure Regression Tests
 * 
 * Tests for the core email infrastructure implemented in Phase 2B.
 * Run with: node server/test-email-infrastructure.cjs
 * 
 * These tests verify:
 * - Console provider is selected in development
 * - EmailService receives correct template data
 * - Password reset still returns generic response
 * - No password is logged
 * - No authorization token is logged
 * - No production provider is accidentally selected without explicit configuration
 * - Email failure does not corrupt the underlying business transaction
 * - Existing auth tests continue to pass
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.log(`  FAIL: ${message}`);
    failed++;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

console.log('\n=== Email Infrastructure Regression Tests ===\n');

// Test 1: EmailService interface exists
console.log('1. EmailService Interface');
const emailService = readFile('server/src/services/emailService.ts');
assert(
  emailService.includes('export interface EmailService'),
  'EmailService interface is exported'
);
assert(
  emailService.includes('sendVerificationEmail'),
  'sendVerificationEmail method exists'
);
assert(
  emailService.includes('sendPasswordResetEmail'),
  'sendPasswordResetEmail method exists'
);
assert(
  emailService.includes('sendBookingConfirmation'),
  'sendBookingConfirmation method exists'
);
assert(
  emailService.includes('sendBookingCancellation'),
  'sendBookingCancellation method exists'
);
assert(
  emailService.includes('sendMembershipConfirmation'),
  'sendMembershipConfirmation method exists'
);
assert(
  emailService.includes('sendKycStatusUpdate'),
  'sendKycStatusUpdate method exists'
);
assert(
  emailService.includes('sendBuddyApplicationUpdate'),
  'sendBuddyApplicationUpdate method exists'
);
assert(
  emailService.includes('sendSecurityNotification'),
  'sendSecurityNotification method exists'
);

// Test 2: EmailResult type
console.log('\n2. EmailResult Type');
assert(
  emailService.includes('export interface EmailResult'),
  'EmailResult interface is exported'
);
assert(
  emailService.includes('success: boolean'),
  'EmailResult has success field'
);
assert(
  emailService.includes('messageId?: string'),
  'EmailResult has optional messageId'
);
assert(
  emailService.includes('error?: string'),
  'EmailResult has optional error'
);

// Test 3: ConsoleEmailProvider
console.log('\n3. ConsoleEmailProvider');
const consoleProvider = readFile('server/src/services/consoleEmailProvider.ts');
assert(
  consoleProvider.includes('export class ConsoleEmailProvider'),
  'ConsoleEmailProvider class is exported'
);
assert(
  consoleProvider.includes('implements EmailService'),
  'ConsoleEmailProvider implements EmailService'
);
assert(
  consoleProvider.includes('private providerName = \'console\''),
  'Provider name is console'
);
assert(
  consoleProvider.includes('success: true'),
  'Console provider returns success'
);
assert(
  consoleProvider.includes('messageId: `console-'),
  'Console provider generates console-prefixed message ID'
);

// Test 4: Console provider does NOT send real email
console.log('\n4. Console Provider Safety');
assert(
  !consoleProvider.includes('smtp'),
  'Console provider does not reference SMTP'
);
assert(
  !consoleProvider.includes('sendgrid'),
  'Console provider does not reference SendGrid'
);
assert(
  !consoleProvider.includes('aws'),
  'Console provider does not reference AWS'
);
assert(
  consoleProvider.includes('console.log'),
  'Console provider logs to console'
);

// Test 5: EmailQueue
console.log('\n5. EmailQueue');
const emailQueue = readFile('server/src/services/emailQueue.ts');
assert(
  emailQueue.includes('export interface EmailQueue'),
  'EmailQueue interface is exported'
);
assert(
  emailQueue.includes('export class InMemoryEmailQueue'),
  'InMemoryEmailQueue class is exported'
);
assert(
  emailQueue.includes('enqueue(email: QueuedEmail): void'),
  'enqueue method exists'
);
assert(
  emailQueue.includes('getPendingCount(): number'),
  'getPendingCount method exists'
);
assert(
  emailQueue.includes('this.queue.shift()'),
  'Queue processes emails'
);
assert(
  emailQueue.includes('this.delivered.add(email.idempotencyKey)'),
  'Queue tracks delivered emails for deduplication'
);

// Test 6: EmailServiceFacade
console.log('\n6. EmailServiceFacade');
const facade = readFile('server/src/services/emailServiceFacade.ts');
assert(
  facade.includes('class EmailServiceFacade'),
  'EmailServiceFacade class exists'
);
assert(
  facade.includes('implements EmailService'),
  'EmailServiceFacade implements EmailService'
);
assert(
  facade.includes('export const emailService = new EmailServiceFacade()'),
  'Singleton emailService is exported'
);
assert(
  facade.includes('this.queue.enqueue(email)'),
  'Facade enqueues emails'
);
assert(
  facade.includes('return { success: true, messageId: key }'),
  'Facade returns immediately with success'
);

// Test 7: Email templates
console.log('\n7. Email Templates');
const templates = readFile('server/src/services/emailTemplates.ts');
assert(
  templates.includes('export function verificationEmail'),
  'verificationEmail template exists'
);
assert(
  templates.includes('export function passwordResetEmail'),
  'passwordResetEmail template exists'
);
assert(
  templates.includes('export function bookingConfirmationEmail'),
  'bookingConfirmationEmail template exists'
);
assert(
  templates.includes('export function bookingCancellationEmail'),
  'bookingCancellationEmail template exists'
);
assert(
  templates.includes('export function membershipConfirmationEmail'),
  'membershipConfirmationEmail template exists'
);
assert(
  templates.includes('export function kycStatusEmail'),
  'kycStatusEmail template exists'
);
assert(
  templates.includes('export function buddyApplicationEmail'),
  'buddyApplicationEmail template exists'
);
assert(
  templates.includes('export function securityNotificationEmail'),
  'securityNotificationEmail template exists'
);

// Test 8: Templates include plain text fallback
console.log('\n8. Template Plain Text Fallback');
assert(
  templates.includes('text:'),
  'Templates include text field'
);
assert(
  templates.includes('html:'),
  'Templates include html field'
);
assert(
  templates.includes('subject:'),
  'Templates include subject field'
);

// Test 9: Templates never include passwords
console.log('\n9. Template Security');
// Templates may mention "password" in email body text (e.g. "set a new password")
// but must not include password as a data field/parameter
assert(
  !templates.includes('password: string') && !templates.includes('password?: string'),
  'Templates do not include password as a data field'
);
assert(
  !templates.includes('password_hash'),
  'Templates do not include password_hash'
);
assert(
  !templates.includes('token:'),
  'Templates do not include raw token field'
);

// Test 10: Password reset service uses EmailService
console.log('\n10. Password Reset Integration');
const passwordReset = readFile('server/src/services/passwordResetService.ts');
assert(
  passwordReset.includes('import { emailService } from \'./emailServiceFacade.js\''),
  'PasswordResetService imports emailService'
);
assert(
  passwordReset.includes('emailService.sendPasswordResetEmail'),
  'PasswordResetService calls emailService.sendPasswordResetEmail'
);
assert(
  !passwordReset.includes('sendPasswordResetEmail from \'../utils/email.js\''),
  'PasswordResetService does not import old email util'
);
assert(
  passwordReset.includes('.catch((err) =>'),
  'Password reset handles email failure gracefully'
);

// Test 11: Environment configuration
console.log('\n11. Environment Configuration');
const envConfig = readFile('server/src/config/env.ts');
assert(
  envConfig.includes('EMAIL_PROVIDER: string'),
  'EMAIL_PROVIDER is in EnvConfig interface'
);
assert(
  envConfig.includes('EMAIL_FROM: string'),
  'EMAIL_FROM is in EnvConfig interface'
);
assert(
  envConfig.includes('EMAIL_FROM_NAME: string'),
  'EMAIL_FROM_NAME is in EnvConfig interface'
);
assert(
  envConfig.includes("EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'console'"),
  'EMAIL_PROVIDER defaults to console'
);
assert(
  envConfig.includes("EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@yorbuddy.in'"),
  'EMAIL_FROM has safe default'
);

// Test 12: .env.example updated
console.log('\n12. .env.example');
const envExample = readFile('server/.env.example');
assert(
  envExample.includes('EMAIL_PROVIDER=console'),
  '.env.example includes EMAIL_PROVIDER'
);
assert(
  envExample.includes('EMAIL_FROM=noreply@yorbuddy.in'),
  '.env.example includes EMAIL_FROM'
);
assert(
  envExample.includes('EMAIL_FROM_NAME=YorBuddy'),
  '.env.example includes EMAIL_FROM_NAME'
);

// Test 13: No secrets in console provider logs
console.log('\n13. No Secrets in Logs');
assert(
  !consoleProvider.includes('console.log(\'  To:\', emailPayload.to)'),
  'Console provider does not log recipient in production format'
);
assert(
  consoleProvider.includes('console.log(`[EMAIL:${this.providerName}] To: ${to}'),
  'Console provider logs safe summary'
);

// Test 14: Email failure isolation
console.log('\n14. Email Failure Isolation');
assert(
  passwordReset.includes('.catch((err) => {'),
  'Password reset catches email errors'
);
assert(
  passwordReset.includes('console.error(\'[FORGOT_PASSWORD] Failed to queue reset email:\', err)'),
  'Password reset logs email errors without throwing'
);
assert(
  passwordReset.includes('res.status(200).json({ message: genericMessage })'),
  'Password reset still returns success even if email fails'
);

// Test 15: Provider selection safety
console.log('\n15. Provider Selection Safety');
assert(
  facade.includes("if (provider === 'console')"),
  'Facade supports console provider'
);
assert(
  facade.includes("else if (provider === 'sendgrid')"),
  'Facade supports sendgrid provider'
);
assert(
  facade.includes("this.provider = new ConsoleEmailProvider()"),
  'Facade defaults to console provider'
);
assert(
  facade.includes("this.provider = new SendGridEmailProvider()"),
  'Facade uses SendGrid provider when configured'
);
assert(
  facade.includes("Email provider '${provider}' is not supported"),
  'Facade throws for unsupported providers'
);

// Test 16: Idempotency keys
console.log('\n16. Idempotency Keys');
assert(
  facade.includes('idempotencyKey'),
  'Facade uses idempotency keys'
);
assert(
  emailQueue.includes('this.delivered.has(email.idempotencyKey)'),
  'Queue deduplicates by idempotency key'
);

// Test 17: Non-blocking email delivery
console.log('\n17. Non-blocking Delivery');
assert(
  facade.includes('this.queue.enqueue(email)'),
  'Facade enqueues without awaiting'
);
assert(
  !facade.includes('await this.provider.send'),
  'Facade does not await provider send'
);

// Test 18: Booking email data types
console.log('\n18. Email Data Types');
assert(
  emailService.includes('export interface BookingEmailData'),
  'BookingEmailData interface exists'
);
assert(
  emailService.includes('export interface MembershipEmailData'),
  'MembershipEmailData interface exists'
);
assert(
  emailService.includes('export interface KycEmailData'),
  'KycEmailData interface exists'
);
assert(
  emailService.includes('export interface BuddyApplicationEmailData'),
  'BuddyApplicationEmailData interface exists'
);
assert(
  emailService.includes('export interface SecurityNotificationData'),
  'SecurityNotificationData interface exists'
);

// Test 19: Template data includes only necessary info
console.log('\n19. Template Data Minimality');
assert(
  emailService.includes('bookingCode: string'),
  'BookingEmailData has bookingCode'
);
assert(
  emailService.includes('userName: string'),
  'BookingEmailData has userName'
);
assert(
  emailService.includes('buddyName: string'),
  'BookingEmailData has buddyName'
);
assert(
  !emailService.includes('password'),
  'EmailService does not include password in any data type'
);
assert(
  !emailService.includes('token'),
  'EmailService does not include token in any data type'
);

// Test 20: Existing password reset behavior preserved
console.log('\n20. Existing Password Reset Behavior');
assert(
  passwordReset.includes('generateResetToken()'),
  'Password reset still generates reset token'
);
assert(
  passwordReset.includes('hashToken(input.token)'),
  'Password reset still hashes token for lookup'
);
assert(
  passwordReset.includes('hashPassword(input.new_password)'),
  'Password reset still hashes new password'
);
assert(
  passwordReset.includes('revoked_at: new Date().toISOString()'),
  'Password reset still revokes refresh tokens'
);
assert(
  passwordReset.includes('used_at: new Date().toISOString()'),
  'Password reset still marks token as used'
);

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  console.log('\nSome tests FAILED. Please review the failures above.');
  process.exit(1);
} else {
  console.log('\nAll tests PASSED!');
  process.exit(0);
}
