import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  verifyHmacSha256,
  canMarkPaymentFailed,
  isSameSuccessfulPayment,
} from './src/services/paymentConfirmation.js';

test('accepts a valid Razorpay-style HMAC and rejects tampering', () => {
  const secret = 'unit-test-secret';
  const message = 'order_test|pay_test';
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  assert.equal(verifyHmacSha256(secret, message, signature), true);
  assert.equal(verifyHmacSha256(secret, message + '-tampered', signature), false);
  assert.equal(verifyHmacSha256(secret, message, 'not-hex'), false);
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
