import crypto from 'node:crypto';

/**
 * Verify a lowercase/uppercase hexadecimal SHA-256 HMAC without accepting
 * Buffer.from's permissive handling of malformed or truncated hex strings.
 */
export function verifyHmacSha256(secret: string | undefined, message: string, signature: string): boolean {
  if (!secret || typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)) {
    return false;
  }

  const expected = crypto.createHmac('sha256', secret).update(message).digest();
  const supplied = Buffer.from(signature, 'hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
}

export function canMarkPaymentFailed(status: string | null | undefined): boolean {
  return ['initiated', 'created', 'pending', 'processing'].includes(status ?? '');
}

export function isSameSuccessfulPayment(status: string, existingPaymentId: string | null, incomingPaymentId: string): boolean {
  return status === 'success' && existingPaymentId === incomingPaymentId;
}

/** Return only the original body captured by Express's JSON verify hook. */
export function getRawWebhookBody(rawBody: unknown): string | null {
  if (typeof rawBody === 'string' && rawBody.length > 0) return rawBody;
  if (Buffer.isBuffer(rawBody) && rawBody.length > 0) return rawBody.toString('utf8');
  return null;
}
