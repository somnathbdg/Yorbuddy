-- ============================================================================
-- Migration: Persist adult confirmation for lightweight AI Friend registration
-- ============================================================================
-- The AI Friend registration endpoint writes this timestamp when a user
-- confirms they are 18+. Keep it nullable for existing accounts and do not
-- use it as a substitute for Buddy KYC / identity verification.
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ai_friend_adult_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.ai_friend_adult_confirmed_at IS
  'Timestamp when the user confirmed they are 18 or older during AI Friend registration.';
