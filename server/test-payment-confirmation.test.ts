import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  verifyHmacSha256,
  canMarkPaymentFailed,
  isSameSuccessfulPayment,
  getRawWebhookBody,
} from './src/services/paymentConfirmation.js';

test('accepts a valid Razorpay-style HMAC and rejects tampering', () => {
  const secret = 'unit-test-secret';
  const message = 'order_test|pay_test';
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  assert.equal(verifyHmacSha256(secret, message, signature), true);
  assert.equal(verifyHmacSha256(secret, message + '-tampered', signature), false);
  assert.equal(verifyHmacSha256(secret, message, 'not-hex'), false);
  assert.equal(verifyHmacSha256(secret, message, 'a'.repeat(63)), false);
  assert.equal(verifyHmacSha256(secret, message, 'g'.repeat(64)), false);
  assert.equal(verifyHmacSha256(secret, message, signature.slice(0, 62)), false);
  assert.equal(verifyHmacSha256(secret, message, signature.toUpperCase()), true);
  assert.equal(verifyHmacSha256(undefined, message, signature), false);
});

test('only non-terminal payment states can transition to failed', () => {
  for (const status of ['initiated', 'created', 'pending', 'processing']) {
    assert.equal(canMarkPaymentFailed(status), true, status);
  }
  for (const status of ['success', 'failed', 'cancelled', 'refunded', null, undefined]) {
    assert.equal(canMarkPaymentFailed(status), false, String(status));
  }
});

test('successful callback replay requires the same payment ID', () => {
  assert.equal(isSameSuccessfulPayment('success', 'pay_1', 'pay_1'), true);
  assert.equal(isSameSuccessfulPayment('success', 'pay_1', 'pay_2'), false);
  assert.equal(isSameSuccessfulPayment('created', null, 'pay_1'), false);
});

test('webhook verification accepts only the original captured body', () => {
  const original = Buffer.from('{ "event" : "payment.captured" }');
  assert.equal(getRawWebhookBody(original), original.toString('utf8'));
  assert.equal(getRawWebhookBody(original.toString('utf8')), original.toString('utf8'));
  assert.equal(getRawWebhookBody(undefined), null);
  assert.equal(getRawWebhookBody(''), null);
  assert.equal(getRawWebhookBody({ event: 'payment.captured' }), null);
});
