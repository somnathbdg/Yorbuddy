import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { env } from '../config/env.js';
import { z } from 'zod';
import { BadRequest, NotFound, Forbidden } from '../middleware/errorHandler.js';
import crypto from 'crypto';
import Razorpay from 'razorpay';

let razorpayInstance: any = null;

function getRazorpay(): any {
  if (razorpayInstance) return razorpayInstance;
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured.');
  }
  razorpayInstance = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
  return razorpayInstance;
}

// ========== Pricing Plans ==========
// FINAL PRICING (authoritative — frontend mirrors these values):
// FREE_ACCESS_10D: ₹0 (0 paise), 10 days — auto-assigned once per account, NOT purchasable
// TRIAL_1D: ₹99 (9900 paise), 1 day, Razorpay required — PAID and REPEATABLE
// WEEK_1: ₹499 (49900 paise), 7 days — PAID and REPEATABLE
// MONTH_1: ₹1999 (199900 paise), 30 days — PAID and REPEATABLE
//
// No paid plan is gated on prior free access or prior purchases. Every
// purchase requires a fresh Razorpay payment.
//
// OLD PLANS (FREE_TRIAL, MONTH_6, YEAR_1, LIFETIME) are NO LONGER PURCHASABLE
// but historical records are preserved.

const PLANS = {
  FREE_ACCESS_10D: { id: 'FREE_ACCESS_10D', name: 'Free Access', amount: 0, period: '10 days' },
  TRIAL_1D: { id: 'TRIAL_1D', name: '1 Day Access', amount: 9900, period: '1 day' },
  WEEK_1: { id: 'WEEK_1', name: '1 Week', amount: 49900, period: '7 days' },
  MONTH_1: { id: 'MONTH_1', name: '1 Month', amount: 199900, period: '30 days' },
} as const;

// ========== Shared Membership Check Helper ==========

/**
 * Check if a user has an active membership.
 * Active = status='success' AND (expiry_date IS NULL OR expiry_date > NOW())
 * Admin users bypass this check.
 */
export async function checkUserMembership(supabase: any, userId: string): Promise<{ isActive: boolean; membership: any | null }> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return { isActive: false, membership: null };
  }

  const m = data[0];
  let isActive = false;
  if (!m.membership_expiry_date) {
    isActive = true; // Lifetime (historical records)
  } else {
    isActive = new Date(m.membership_expiry_date) > new Date();
  }

  return { isActive, membership: m };
}

type PlanId = keyof typeof PLANS;

// ========== Validation Schemas ==========

// Only these plans can be purchased via create-order.
// FREE_ACCESS_10D is auto-assigned on registration and cannot be purchased.
const createOrderSchema = z.object({
  plan_id: z.enum(['TRIAL_1D', 'WEEK_1', 'MONTH_1']),
}).strict();

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
}).strict();

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const body = orderId + '|' + paymentId;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  return expected === signature;
}

function calculateExpiry(planId: PlanId, start: Date): Date | null {
  const plan = PLANS[planId];
  if (!plan) return null;
  const d = new Date(start);
  if (plan.period === '10 days') d.setDate(d.getDate() + 10);
  else if (plan.period === '1 day') d.setDate(d.getDate() + 1);
  else if (plan.period === '7 days') d.setDate(d.getDate() + 7);
  else if (plan.period === '30 days') d.setDate(d.getDate() + 30);
  return d;
}

// ========== Controllers ==========

/**
 * Assign 10-day Free Access to a user.
 *
 * Called on registration (password and Google OAuth).
 *
 * One grant per account, enforced two ways:
 *   1. This function checks for an existing FREE_ACCESS_10D row first.
 *   2. After migration 014, the partial unique index
 *      idx_memberships_one_free_access rejects a duplicate insert, so
 *      concurrent registrations cannot double-grant.
 *
 * The FREE_ACCESS_10D grant is the ONLY one-time-per-user rule in the system.
 * Paid plans (TRIAL_1D, WEEK_1, MONTH_1) are repeatable and are never
 * restricted by prior free access.
 */
export async function assignFreeAccess(supabase: any, userId: string): Promise<void> {
  // Fast path: already granted — do not extend or duplicate the window.
  const { data: existing } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('plan_id', 'FREE_ACCESS_10D')
    .limit(1);

  if (existing && existing.length > 0) return;

  // Create free access membership
  const start = new Date();
  const expiry = new Date(start);
  expiry.setDate(expiry.getDate() + 10);

  // Insert with a unique-violation guard.
  //
  // This is deliberately a plain insert, NOT an upsert with onConflict:
  // PostgREST requires a matching unique constraint for ON CONFLICT, so an
  // upsert would hard-fail (42P10) until migration 014 is applied. A plain
  // insert keeps this function working both before and after the migration:
  //
  //   - Before migration 014: the existence check above is the only guard.
  //     Behavior is identical to the previous implementation.
  //   - After migration 014: the partial unique index
  //     idx_memberships_one_free_access makes the insert race-safe. A
  //     concurrent registration loses with 23505 and returns quietly.
  const { error } = await supabase
    .from('memberships')
    .insert({
      user_id: userId,
      plan_id: 'FREE_ACCESS_10D',
      amount: 0,
      currency: 'INR',
      status: 'success',
      membership_start_date: start.toISOString(),
      membership_expiry_date: expiry.toISOString(),
    });

  if (error) {
    // Another request already granted access. Intended outcome, not a failure.
    if (error.code === '23505') return;
    console.error('[MEMBERSHIP] Failed to assign Free Access:', error.message);
    return;
  }

  // Mark user's free access as used (informational flag; no longer read for gating)
  await supabase
    .from('users')
    .update({ free_trial_used: true })
    .eq('id', userId);
}

export async function createMembershipOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createOrderSchema.parse(req.body);
    const userId = req.user!.id;
    const supabase = getSupabase();

    // No per-plan eligibility gate here.
    //
    // TRIAL_1D (₹99, 1 Day Access) is a PAID, REPEATABLE plan. It is never
    // blocked by prior free access or by a previous ₹99 purchase. Payment is
    // still required for every purchase — the Razorpay order below is the gate.
    //
    // WEEK_1 (₹499) and MONTH_1 (₹1,999) are likewise always purchasable.
    //
    // FREE_ACCESS_10D is the only one-time-per-user grant, and it is not
    // purchasable at all (it is excluded from createOrderSchema and is
    // assigned server-side by assignFreeAccess on registration).

    // Server calculates amount from plan; client amount ignored
    const plan = PLANS[input.plan_id];
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: plan.amount,
      currency: 'INR',
      receipt: `membership_${Date.now()}`,
      notes: { user_id: userId, plan_id: plan.id },
    });

    const { error } = await supabase.from('memberships').insert({
      user_id: userId,
      plan_id: plan.id,
      amount: plan.amount / 100,
      currency: 'INR',
      razorpay_order_id: order.id,
      status: 'created',
    });
    if (error) throw error;

    res.status(201).json({
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: env.RAZORPAY_KEY_ID,
        plan_id: plan.id,
        plan_name: plan.name,
      },
    });
  } catch (err: any) { next(err); }
}

export async function verifyMembershipPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = verifySchema.parse(req.body);
    const userId = req.user!.id;
    const supabase = getSupabase();

    const { data: m, error: mErr } = await supabase
      .from('memberships')
      .select('*')
      .eq('razorpay_order_id', input.razorpay_order_id)
      .single();

    if (mErr || !m) throw NotFound('Membership record not found.');
    if (m.user_id !== userId) throw Forbidden('Access denied.');
    if (m.status === 'success') {
      res.status(200).json({ data: { membership_id: m.id, status: 'success', plan_id: m.plan_id } });
      return;
    }

    const valid = verifyRazorpaySignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature);
    if (!valid) {
      await supabase.from('memberships').update({ status: 'failed' }).eq('id', m.id);
      throw BadRequest('Invalid signature.');
    }

    const start = new Date();
    const expiry = calculateExpiry(m.plan_id as PlanId, start);
    const { error: uErr } = await supabase
      .from('memberships')
      .update({
        razorpay_payment_id: input.razorpay_payment_id,
        razorpay_signature: input.razorpay_signature,
        status: 'success',
        membership_start_date: start.toISOString(),
        membership_expiry_date: expiry ? expiry.toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', m.id);

    if (uErr) throw uErr;

    // NOTE: a successful TRIAL_1D payment no longer sets free_trial_used and no
    // longer blocks anything. TRIAL_1D is a repeatable paid plan; each purchase
    // requires its own payment (verified above via HMAC signature). The
    // free_trial_used column is retained for historical compatibility only.

    res.status(200).json({
      data: {
        membership_id: m.id,
        status: 'success',
        plan_id: m.plan_id,
        start_date: start.toISOString(),
        expiry_date: expiry ? expiry.toISOString() : null,
      },
    });
  } catch (err: any) { next(err); }
}

export async function getMembershipStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();

    const { data: list, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !list || list.length === 0) {
      res.status(200).json({ data: null });
      return;
    }

    const m = list[0];
    let isActive = false;
    if (m.status === 'success') {
      if (!m.membership_expiry_date) isActive = true; // Lifetime historical
      else isActive = new Date(m.membership_expiry_date) > new Date();
    }

    res.status(200).json({
      data: {
        id: m.id,
        plan_id: m.plan_id,
        status: m.status,
        amount: m.amount,
        is_active: isActive,
        start_date: m.membership_start_date,
        expiry_date: m.membership_expiry_date,
      },
    });
  } catch (err: any) { next(err); }
}

export { PLANS };
