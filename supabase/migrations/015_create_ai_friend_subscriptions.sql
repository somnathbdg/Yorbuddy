-- ============================================================================
-- Migration 015: Create AI Friend subscriptions
-- ============================================================================
-- Required by server/src/services/aiFriendSubscriptionService.ts.
-- Safe/idempotent for staging and existing installations.
-- The backend uses the Supabase service role; RLS remains enabled so
-- browser clients cannot read or modify subscription/payment records directly.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_friend_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id VARCHAR(30) NOT NULL
    CHECK (plan_id IN ('FREE_TRIAL_1D', 'DAY_1', 'WEEK_1', 'MONTH_1')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  phone_hash VARCHAR(64) NOT NULL,
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'success', 'failed', 'cancelled')),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_friend_subscriptions_user_created
  ON public.ai_friend_subscriptions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_friend_subscriptions_phone_trial
  ON public.ai_friend_subscriptions(phone_hash, plan_id)
  WHERE plan_id = 'FREE_TRIAL_1D';

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_friend_subscriptions_razorpay_order
  ON public.ai_friend_subscriptions(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- Enforce one successful free trial per verified identity.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_friend_subscriptions_one_trial_per_identity
  ON public.ai_friend_subscriptions(phone_hash)
  WHERE plan_id = 'FREE_TRIAL_1D' AND status = 'success';

ALTER TABLE public.ai_friend_subscriptions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_ai_friend_subscriptions_updated_at
  ON public.ai_friend_subscriptions;

CREATE TRIGGER update_ai_friend_subscriptions_updated_at
  BEFORE UPDATE ON public.ai_friend_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.ai_friend_subscriptions IS
  'AI Friend trial and paid subscription entitlements. Accessed by backend service role only.';
