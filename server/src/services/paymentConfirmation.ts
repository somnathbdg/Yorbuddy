import crypto from 'node:crypto';

export function verifyHmacSha256(secret: string | undefined, message: string, signature: string): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(message).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, 'hex');
  } catch {
    return false;
  }
  return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
}

export function canMarkPaymentFailed(status: string | null | undefined): boolean {
  return ['initiated', 'created', 'pending', 'processing'].includes(status ?? '');
}

export function isSameSuccessfulPayment(status: string, existingPaymentId: string | null, incomingPaymentId: string): boolean {
  return status === 'success' && existingPaymentId === incomingPaymentId;
}
