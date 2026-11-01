-- AI Friend has a lighter verification policy than human Buddy bookings.
-- Email OR mobile OTP is sufficient; KYC is not required. Persist an explicit 18+ self-attestation.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ai_friend_adult_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN users.ai_friend_adult_confirmed_at IS
  'Timestamp when the account holder confirmed they are 18+ for YorBuddy AI Friend access.';
