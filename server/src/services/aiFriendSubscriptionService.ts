import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { getSupabase } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError, BadRequest, Conflict, Forbidden, NotFound } from '../middleware/errorHandler.js';
import { calculateAiFriendExpiry, getAiFriendPlan, hashVerifiedPhone, isAiFriendSubscriptionActive, isTrialAlreadyUsed, AiFriendPlanId, verifyAiFriendPaymentSignature, isPaidYorBuddyMembershipActive } from './aiFriendEntitlement.js';
import { getAiFriendVerification } from './aiFriendService.js';

let razorpayInstance: any = null;
function getRazorpay(): any {
  if (razorpayInstance) return razorpayInstance;
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError('AI Friend payments are not configured.', 503, 'PAYMENTS_NOT_CONFIGURED');
  }
  razorpayInstance = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return razorpayInstance;
}

function assertVerified(status: Awaited<ReturnType<typeof getAiFriendVerification>>) {
  if (!status.is_fully_verified) {
    throw Forbidden('Verify either your email address or mobile number and confirm you are 18+ before starting an AI Friend plan.');
  }
}

async function getUserPhone(userId: string): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('users').select('phone').eq('id', userId).single();
  if (error || !data?.phone) throw Forbidden('A verified mobile number is required for AI Friend access.');
  return data.phone;
}

export async function getAiFriendSubscriptionStatus(userId: string) {
  const supabase = getSupabase();
  const verification = await getAiFriendVerification(userId);
  // AI Friend is included with any currently active paid YorBuddy membership. Ignore the auto-granted 10-day free access.
  const { data: memberships, error: membershipError } = await supabase
    .from('memberships')
    .select('plan_id, membership_expiry_date, status')
    .eq('user_id', userId)
    .eq('status', 'success');
  if (membershipError) throw new AppError('Unable to check YorBuddy membership.', 503, 'MEMBERSHIP_STATUS_UNAVAILABLE');
  const nowForMembership = new Date();
  const membership = (memberships || []).find((item: any) =>
    isPaidYorBuddyMembershipActive(item.plan_id, item.status, item.membership_expiry_date, nowForMembership)
  ) || null;
  const includedWithMembership = !!membership;
  const phone = await getUserPhone(userId);
  const phoneHash = hashVerifiedPhone(phone);

  const { data: rows, error } = await supabase
    .from('ai_friend_subscriptions')
    .select('id, plan_id, amount_paise, status, starts_at, expires_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new AppError('Unable to load AI Friend subscription.', 503, 'SUBSCRIPTION_STATUS_UNAVAILABLE');

  const now = new Date();
  const active = (rows || []).find((row: any) => isAiFriendSubscriptionActive(row.status, row.expires_at, now)) || null;
  const trialUsed = isTrialAlreadyUsed(rows || []);
  const { count, error: phoneTrialError } = await supabase
    .from('ai_friend_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('phone_hash', phoneHash)
    .eq('plan_id', 'FREE_TRIAL_1D');
  if (phoneTrialError) throw new AppError('Unable to verify free-trial eligibility.', 503, 'TRIAL_STATUS_UNAVAILABLE');

  return {
    verification,
    subscription: active,
    has_active_subscription: !!active || includedWithMembership,
    included_with_membership: includedWithMembership,
    yorbuddy_membership: includedWithMembership ? { plan_id: membership.plan_id, expires_at: membership.membership_expiry_date } : null,
    trial_available: verification.is_fully_verified && verification.adult_confirmed && !trialUsed && (count || 0) === 0,
    trial_used: trialUsed || (count || 0) > 0,
    can_chat: verification.is_fully_verified && verification.adult_confirmed && (!!active || includedWithMembership),
    plans: [
      { id: 'FREE_TRIAL_1D', name: 'Free Trial', amount: 0, currency: 'INR', duration_hours: 24 },
      { id: 'DAY_1', name: '1 Day', amount: 49, currency: 'INR', duration_days: 1 },
      { id: 'WEEK_1', name: '1 Week', amount: 299, currency: 'INR', duration_days: 7 },
      { id: 'MONTH_1', name: '1 Month', amount: 499, currency: 'INR', duration_days: 30 },
    ],
  };
}

export async function startAiFriendFreeTrial(userId: string) {
  const verification = await getAiFriendVerification(userId);
  assertVerified(verification);
  const supabase = getSupabase();
  const phoneHash = await getTrialIdentityHash(userId);
  const state = await getAiFriendSubscriptionStatus(userId);
  if (state.included_with_membership) throw Conflict('AI Friend is already included with your active YorBuddy subscription. No extra payment is required.');
  if (state.included_with_membership) throw Conflict('AI Friend is already included with your active YorBuddy subscription. No extra payment is required.');
  if (state.has_active_subscription) throw Conflict('You already have an active AI Friend plan.');
  if (state.trial_used || !state.trial_available) throw Conflict('The 24-hour AI Friend free trial has already been used.');

  const startsAt = new Date();
  const expiresAt = calculateAiFriendExpiry('FREE_TRIAL_1D', startsAt);
  const { data, error } = await supabase.from('ai_friend_subscriptions').insert({
    user_id: userId,
    plan_id: 'FREE_TRIAL_1D',
    amount_paise: 0,
    currency: 'INR',
    phone_hash: phoneHash,
    status: 'success',
    starts_at: startsAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  }).select('id, plan_id, status, starts_at, expires_at').single();

  if (error?.code === '23505') throw Conflict('The free trial has already been claimed for this account or verified mobile number.');
  if (error || !data) throw new AppError('Unable to start the AI Friend free trial.', 503, 'TRIAL_START_FAILED');
  return data;
}

export async function createAiFriendPaymentOrder(userId: string, requestedPlanId: string) {
  const verification = await getAiFriendVerification(userId);
  assertVerified(verification);
  const plan = getAiFriendPlan(requestedPlanId);
  if (!plan || plan.id === 'FREE_TRIAL_1D') throw BadRequest('Select a valid paid AI Friend plan.');
  const supabase = getSupabase();
  const state = await getAiFriendSubscriptionStatus(userId);
  if (state.has_active_subscription) throw Conflict('You already have an active AI Friend plan.');
  const phoneHash = await getTrialIdentityHash(userId);
  const razorpay = getRazorpay();
  const receipt = `aif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const order = await razorpay.orders.create({
    amount: plan.amountPaise,
    currency: 'INR',
    receipt,
    notes: { user_id: userId, plan_id: plan.id, product: 'yorbuddy_ai_friend' },
  });

  const { error } = await supabase.from('ai_friend_subscriptions').insert({
    user_id: userId,
    plan_id: plan.id,
    amount_paise: plan.amountPaise,
    currency: 'INR',
    phone_hash: phoneHash,
    razorpay_order_id: order.id,
    status: 'created',
  });
  if (error) throw new AppError('Unable to save AI Friend payment order.', 503, 'PAYMENT_ORDER_SAVE_FAILED');

  return { order_id: order.id, amount: order.amount, currency: order.currency, key_id: env.RAZORPAY_KEY_ID, plan_id: plan.id, plan_name: plan.name };
}

export async function verifyAiFriendPayment(userId: string, input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  const supabase = getSupabase();
  const { data: subscription, error } = await supabase
    .from('ai_friend_subscriptions')
    .select('*')
    .eq('razorpay_order_id', input.razorpay_order_id)
    .eq('user_id', userId)
    .single();
  if (error || !subscription) throw NotFound('AI Friend payment order not found.');
  if (subscription.status === 'success') {
    return { id: subscription.id, status: 'success', plan_id: subscription.plan_id, expires_at: subscription.expires_at };
  }
  if (subscription.status !== 'created') throw Conflict('This AI Friend payment order is no longer payable.');

  if (!verifyAiFriendPaymentSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature, env.RAZORPAY_KEY_SECRET)) {
    await supabase.from('ai_friend_subscriptions').update({ status: 'failed' }).eq('id', subscription.id).eq('status', 'created');
    throw BadRequest('Invalid payment signature.');
  }

  // Confirm payment details with Razorpay as a second check; never trust browser payload alone.
  const razorpayPayment = await getRazorpay().payments.fetch(input.razorpay_payment_id);
  if (
    razorpayPayment.order_id !== input.razorpay_order_id ||
    razorpayPayment.amount !== subscription.amount_paise ||
    razorpayPayment.currency !== 'INR' ||
    razorpayPayment.status !== 'captured'
  ) {
    throw Conflict('Razorpay has not confirmed a captured payment for this AI Friend order.');
  }

  const now = new Date();
  const expiresAt = calculateAiFriendExpiry(subscription.plan_id as AiFriendPlanId, now);
  const { data: updated, error: updateError } = await supabase.from('ai_friend_subscriptions').update({
    razorpay_payment_id: input.razorpay_payment_id,
    razorpay_signature: input.razorpay_signature,
    status: 'success',
    starts_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    updated_at: now.toISOString(),
  }).eq('id', subscription.id).eq('status', 'created')
    .select('id, plan_id, status, starts_at, expires_at').single();
  if (updateError || !updated) throw Conflict('Payment is already being processed. Refresh your subscription status.');
  return updated;
}
