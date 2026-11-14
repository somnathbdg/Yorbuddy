-- YorBuddy AI Friend subscriptions are intentionally separate from human Buddy memberships.
-- A free trial is permanently one-time per verified mobile number, even after expiry.
CREATE TABLE IF NOT EXISTS ai_friend_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(20) NOT NULL CHECK (plan_id IN ('FREE_TRIAL_1D', 'DAY_1', 'WEEK_1', 'MONTH_1')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  phone_hash CHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'success', 'failed', 'cancelled')),
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature TEXT,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_friend_subscriptions_user
  ON ai_friend_subscriptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_friend_subscriptions_active
  ON ai_friend_subscriptions(user_id, status, expires_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_friend_trial_once_per_phone
  ON ai_friend_subscriptions(phone_hash)
  WHERE plan_id = 'FREE_TRIAL_1D';
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_friend_razorpay_order
  ON ai_friend_subscriptions(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_friend_razorpay_payment
  ON ai_friend_subscriptions(razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

ALTER TABLE ai_friend_subscriptions ENABLE ROW LEVEL SECURITY;
