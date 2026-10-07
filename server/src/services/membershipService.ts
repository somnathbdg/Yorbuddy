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
// NEW FINAL PRICING:
// TRIAL_1D: ₹99 (9900 paise), 1 day, Razorpay required
// WEEK_1: ₹499 (49900 paise), 7 days
// MONTH_1: ₹1999 (199900 paise), 30 days
//
// OLD PLANS (FREE_TRIAL, MONTH_6, YEAR_1, LIFETIME) are NO LONGER PURCHASABLE
// but historical records are preserved.

const PLANS = {
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
  if (plan.period === '1 day') d.setDate(d.getDate() + 1);
  else if (plan.period === '7 days') d.setDate(d.getDate() + 7);
  else if (plan.period === '30 days') d.setDate(d.getDate() + 30);
  return d;
}

/**
 * Check if user has already used their one-time trial
 */
export async function hasUserUsedTrial(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('plan_id', 'TRIAL_1D')
    .limit(1);

  if (error) return false;
  return data && data.length > 0;
}

// ========== Controllers ==========

export async function createMembershipOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createOrderSchema.parse(req.body);
    const userId = req.user!.id;
    const supabase = getSupabase();

    // Enforce one paid ₹99 trial per user
    // The TRIAL_1D plan (₹99, 1-day access) is a one-time offer per account.
    // Check if user has already used their trial before creating a new order.
    if (input.plan_id === 'TRIAL_1D') {
      const hasUsed = await hasUserUsedTrial(supabase, userId);
      if (hasUsed) {
        throw Forbidden('You have already used your 1-day trial. Purchase a weekly (₹499) or monthly (₹1,999) plan to continue.');
      }
    }

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

    // If this was a TRIAL_1D payment, mark the user's trial as used
    // This enforces the one-trial-per-user rule for future attempts
    if (m.plan_id === 'TRIAL_1D') {
      await supabase
        .from('users')
        .update({ free_trial_used: true })
        .eq('id', userId)
        .select()
        .single();
    }

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
