-- Migration 017: enforce one successful AI Friend free trial per account and identity.
-- Preflight: stop safely if existing data already violates either uniqueness rule.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM ai_friend_subscriptions
    WHERE plan_id = 'FREE_TRIAL_1D' AND status = 'success'
    GROUP BY user_id HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate successful AI Friend trials per user exist; reconcile before applying migration 017.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM ai_friend_subscriptions
    WHERE plan_id = 'FREE_TRIAL_1D' AND status = 'success'
    GROUP BY phone_hash HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate successful AI Friend trials per phone_hash exist; reconcile before applying migration 017.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_friend_subscriptions_one_trial_per_user
  ON ai_friend_subscriptions(user_id)
  WHERE plan_id = 'FREE_TRIAL_1D' AND status = 'success';

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_friend_subscriptions_one_trial_per_identity
  ON ai_friend_subscriptions(phone_hash)
  WHERE plan_id = 'FREE_TRIAL_1D' AND status = 'success';
