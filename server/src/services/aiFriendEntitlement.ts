import { createHash } from 'node:crypto';

export const AI_FRIEND_PLANS = {
  FREE_TRIAL_1D: { id: 'FREE_TRIAL_1D', name: 'Free Trial', amountPaise: 0, durationMs: 24 * 60 * 60 * 1000 },
  DAY_1: { id: 'DAY_1', name: '1 Day', amountPaise: 4900, durationMs: 24 * 60 * 60 * 1000 },
  WEEK_1: { id: 'WEEK_1', name: '1 Week', amountPaise: 29900, durationMs: 7 * 24 * 60 * 60 * 1000 },
  MONTH_1: { id: 'MONTH_1', name: '1 Month', amountPaise: 49900, durationMs: 30 * 24 * 60 * 60 * 1000 },
} as const;

export type AiFriendPlanId = keyof typeof AI_FRIEND_PLANS;

export function getAiFriendPlan(planId: string) {
  return Object.prototype.hasOwnProperty.call(AI_FRIEND_PLANS, planId)
    ? AI_FRIEND_PLANS[planId as AiFriendPlanId]
    : null;
}

export function normalizeVerifiedPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export function hashVerifiedPhone(phone: string): string {
  const normalized = normalizeVerifiedPhone(phone);
  if (normalized.length < 10 || normalized.length > 15) {
    throw new Error('A verified mobile number is required for AI Friend trial eligibility.');
  }
  return createHash('sha256').update(normalized).digest('hex');
}

export function calculateAiFriendExpiry(planId: AiFriendPlanId, startsAt: Date): Date {
  return new Date(startsAt.getTime() + AI_FRIEND_PLANS[planId].durationMs);
}

export function isAiFriendSubscriptionActive(
  status: string,
  expiresAt: string | Date | null,
  now: Date = new Date()
): boolean {
  return status === 'success' && !!expiresAt && new Date(expiresAt).getTime() > now.getTime();
}

export function isTrialAlreadyUsed(rows: Array<{ plan_id: string }>): boolean {
  return rows.some((row) => row.plan_id === 'FREE_TRIAL_1D');
}
