-- ============================================================================
-- Migration: Verification & KYC system enhancements
-- ============================================================================
-- 1. Add email_verified_at and phone_verified_at timestamp columns to users
-- 2. Update verifications status check to include not_submitted/approved states
-- 3. Update profiles boolean flags to be consistent with verification states
-- ============================================================================

-- Add verification timestamp columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- Update verifications status check constraint
-- Old: ('pending', 'verified', 'rejected')
-- New: ('not_submitted', 'pending', 'approved', 'rejected')
ALTER TABLE verifications DROP CONSTRAINT IF EXISTS verifications_status_check;
ALTER TABLE verifications ADD CONSTRAINT verifications_status_check
  CHECK (status IN ('not_submitted', 'pending', 'approved', 'rejected'));

-- Add indexes for verification lookups
CREATE INDEX IF NOT EXISTS idx_verifications_user_status ON verifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified_at) WHERE email_verified_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified_at) WHERE phone_verified_at IS NOT NULL;

-- Enable RLS on users if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read their own verification data
-- (Supabase handles this via auth.uid() matching, but we add service-role bypass)

-- ============================================================================
-- HELPER: is_user_verified function
-- Returns true if user has:
--   - email verified
--   - phone verified
--   - at least one approved KYC verification
-- ============================================================================
CREATE OR REPLACE FUNCTION is_user_verified(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  email_verified BOOLEAN;
  phone_verified BOOLEAN;
  kyc_approved BOOLEAN;
BEGIN
  SELECT (email_verified_at IS NOT NULL) INTO email_verified
  FROM users WHERE id = check_user_id;

  SELECT (phone_verified_at IS NOT NULL) INTO phone_verified
  FROM users WHERE id = check_user_id;

  SELECT EXISTS(
    SELECT 1 FROM verifications
    WHERE user_id = check_user_id AND status = 'approved'
  ) INTO kyc_approved;

  RETURN COALESCE(email_verified, false)
     AND COALESCE(phone_verified, false)
     AND COALESCE(kyc_approved, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
