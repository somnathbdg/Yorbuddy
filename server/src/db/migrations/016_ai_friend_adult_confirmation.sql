-- Migration 016: persist the user's explicit 18+ confirmation for AI Friend.
-- This is an attestation timestamp only; it does not replace Email, Mobile OTP,
-- or approved KYC verification, all of which are checked by the backend.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ai_friend_adult_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.ai_friend_adult_confirmed_at IS
  'Timestamp when the account holder confirmed they are 18 or older for YorBuddy AI Friend access.';
