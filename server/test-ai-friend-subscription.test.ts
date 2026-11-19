import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_FRIEND_PLANS,
  calculateAiFriendExpiry,
  getAiFriendPlan,
  hashVerifiedPhone,
  isAiFriendSubscriptionActive,
  isTrialAlreadyUsed,
  normalizeVerifiedPhone,
  verifyAiFriendPaymentSignature,
  isPaidYorBuddyMembershipActive,
} from './src/services/aiFriendEntitlement.js';

test('AI Friend pricing uses exact INR amounts and durations', () => {
  assert.equal(AI_FRIEND_PLANS.FREE_TRIAL_1D.amountPaise, 0);
  assert.equal(AI_FRIEND_PLANS.FREE_TRIAL_1D.durationMs, 24 * 60 * 60 * 1000);
  assert.equal(AI_FRIEND_PLANS.DAY_1.amountPaise, 4900);
  assert.equal(AI_FRIEND_PLANS.WEEK_1.amountPaise, 29900);
  assert.equal(AI_FRIEND_PLANS.MONTH_1.amountPaise, 49900);
  assert.equal(AI_FRIEND_PLANS.WEEK_1.durationMs, 7 * 24 * 60 * 60 * 1000);
  assert.equal(AI_FRIEND_PLANS.MONTH_1.durationMs, 30 * 24 * 60 * 60 * 1000);
});

test('unknown and client-invented plan identifiers are rejected', () => {
  assert.equal(getAiFriendPlan('DAY_1'), AI_FRIEND_PLANS.DAY_1);
  assert.equal(getAiFriendPlan('LIFETIME'), null);
  assert.equal(getAiFriendPlan('FREE_ACCESS_10D'), null);
});

test('trial expiry is exactly 24 hours after activation', () => {
  const start = new Date('2026-11-01T10:00:00.000Z');
  assert.equal(calculateAiFriendExpiry('FREE_TRIAL_1D', start).toISOString(), '2026-11-02T10:00:00.000Z');
});

test('one trial remains used even after the trial period has expired', () => {
  assert.equal(isTrialAlreadyUsed([]), false);
  assert.equal(isTrialAlreadyUsed([{ plan_id: 'FREE_TRIAL_1D' }]), true);
  assert.equal(isTrialAlreadyUsed([{ plan_id: 'DAY_1' }]), false, 'paid plans do not consume the free trial');
  assert.equal(isTrialAlreadyUsed([{ plan_id: 'DAY_1' }, { plan_id: 'FREE_TRIAL_1D' }]), true);
});

test('verified phone normalization and hashing are stable', () => {
  assert.equal(normalizeVerifiedPhone('+91 98765-43210'), '9876543210');
  assert.equal(hashVerifiedPhone('+91 98765-43210'), hashVerifiedPhone('919876543210'));
  assert.equal(hashVerifiedPhone('+91 98765-43210'), hashVerifiedPhone('09876543210'));
  assert.notEqual(hashVerifiedPhone('+91 98765-43210'), hashVerifiedPhone('+91 98765-43211'));
  assert.throws(() => hashVerifiedPhone('12345'));
});

test('subscription is active only when payment/trial succeeded and expiry is in the future', () => {
  const now = new Date('2026-11-01T10:00:00.000Z');
  assert.equal(isAiFriendSubscriptionActive('success', '2026-11-01T10:01:00.000Z', now), true);
  assert.equal(isAiFriendSubscriptionActive('success', '2026-11-01T09:59:59.000Z', now), false);
  assert.equal(isAiFriendSubscriptionActive('created', '2026-11-02T10:00:00.000Z', now), false);
  assert.equal(isAiFriendSubscriptionActive('success', null, now), false);
});

test('Razorpay HMAC verifier accepts only the correct signature', async () => {
  const { createHmac } = await import('node:crypto');
  const orderId = 'order_test_123';
  const paymentId = 'pay_test_456';
  const secret = 'test_razorpay_secret';
  const signature = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  assert.equal(verifyAiFriendPaymentSignature(orderId, paymentId, signature, secret), true);
  assert.equal(verifyAiFriendPaymentSignature(orderId, paymentId, '0'.repeat(64), secret), false);
  assert.equal(verifyAiFriendPaymentSignature(orderId, paymentId, signature, 'wrong_secret'), false);
  assert.equal(verifyAiFriendPaymentSignature(orderId, paymentId, 'not-hex', secret), false);
});

test('active paid YorBuddy membership includes AI Friend at no extra charge', () => {
  const now = new Date('2026-11-01T10:00:00.000Z');
  assert.equal(isPaidYorBuddyMembershipActive('WEEK_1', 'success', '2026-11-02T10:00:00.000Z', now), true);
  assert.equal(isPaidYorBuddyMembershipActive('MONTH_1', 'success', null, now), true);
  assert.equal(isPaidYorBuddyMembershipActive('WEEK_1', 'success', '2026-11-01T09:59:59.000Z', now), false);
  assert.equal(isPaidYorBuddyMembershipActive('WEEK_1', 'created', '2026-11-02T10:00:00.000Z', now), false);
  assert.equal(isPaidYorBuddyMembershipActive('FREE_ACCESS_10D', 'success', '2026-11-02T10:00:00.000Z', now), false);
});
