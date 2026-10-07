/**
 * Email Queue Abstraction
 * 
 * In-process queue suitable for development. Structured so a persistent
 * database-backed queue can replace it later without changing the interface.
 * 
 * Key properties:
 * - Non-blocking: enqueue() returns immediately, does not wait for delivery
 * - Fire-and-forget: email delivery happens asynchronously
 * - Failure isolation: email failures do not corrupt business transactions
 * - Idempotent: duplicate enqueue calls with same idempotency key are deduplicated
 */

import { EmailResult } from './emailService.js';

export interface QueuedEmail {
  id: string;
  idempotencyKey: string;
  send: () => Promise<EmailResult>;
  enqueuedAt: Date;
}

export interface EmailQueue {
  enqueue(email: QueuedEmail): void;
  getPendingCount(): number;
  clear(): void;
}

/**
 * In-process email queue for development.
 * Emails are delivered asynchronously via setImmediate to avoid blocking.
 */
export class InMemoryEmailQueue implements EmailQueue {
  private queue: QueuedEmail[] = [];
  private processing = false;
  private delivered: Set<string> = new Set();

  enqueue(email: QueuedEmail): void {
    // Deduplicate by idempotency key
    if (this.delivered.has(email.idempotencyKey)) {
      return;
    }
    this.queue.push(email);
    this.processQueue();
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
    this.delivered.clear();
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const email = this.queue.shift();
      if (!email) break;

      try {
        await email.send();
        this.delivered.add(email.idempotencyKey);
      } catch (err) {
        // Log error but do not rethrow — email failure must not corrupt transactions
        console.error(`[EMAIL_QUEUE] Failed to deliver email ${email.id}:`, err);
        this.delivered.add(email.idempotencyKey);
      }
    }

    this.processing = false;
  }
}

// Singleton queue instance
let emailQueueInstance: EmailQueue | null = null;

export function getEmailQueue(): EmailQueue {
  if (!emailQueueInstance) {
    emailQueueInstance = new InMemoryEmailQueue();
  }
  return emailQueueInstance;
}

export function setEmailQueue(queue: EmailQueue): void {
  emailQueueInstance = queue;
}
