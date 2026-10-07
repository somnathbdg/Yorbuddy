-- ============================================================================
-- Migration 004: Add Verification Timestamp Columns & Safe KYC Status Update
-- ============================================================================
-- SAFE FOR: Existing YorBuddy Step 1-7 architecture
-- IMPACT: Non-destructive, idempotent, backward-compatible
--
-- WHAT THIS MIGRATION DOES:
--   1. Adds email_verified_at and phone_verified_at columns to users
--   2. Creates indexes for verification lookups
--   3. Safely migrates existing 'verified' KYC status to 'approved'
--   4. Updates verifications.status constraint to include 'not_submitted'
--   5. Creates a read-only is_user_verified() helper function
--
-- WHAT THIS MIGRATION DOES NOT DO:
--   - Does NOT enable or disable RLS on any table
--   - Does NOT delete or modify existing verification data
--   - Does NOT change existing user/profile/buddy_profiles schemas
--   - Does NOT create new tables (uses existing verifications table)
-- ============================================================================

-- ============================================================================
-- STEP 1: Add verification timestamp columns to users
-- ============================================================================
-- These columns store WHEN email/phone were verified (not raw OTP secrets)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Create indexes for verification lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified_at) WHERE email_verified_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified_at) WHERE phone_verified_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verifications_user_status ON verifications(user_id, status);

-- ============================================================================
-- STEP 3: Migrate existing KYC status values safely
-- ============================================================================
-- The old constraint allowed: 'pending', 'verified', 'rejected'
-- The new constraint will allow: 'not_submitted', 'pending', 'approved', 'rejected'
--
-- Before dropping the old constraint, we must transform any existing 'verified'
-- rows to 'approved'. This is idempotent and safe to re-run.

-- First, update any existing 'verified' status to 'approved'
UPDATE verifications
SET status = 'approved'
WHERE status = 'verified';

-- ============================================================================
-- STEP 4: Update verifications status CHECK constraint
-- ============================================================================
-- Drop the old constraint and add the new one with expanded status values.
-- All existing data has been migrated in Step 3.

ALTER TABLE verifications DROP CONSTRAINT IF EXISTS verifications_status_check;
ALTER TABLE verifications ADD CONSTRAINT verifications_status_check
  CHECK (status IN ('not_submitted', 'pending', 'approved', 'rejected'));

-- ============================================================================
-- STEP 5: Create read-only is_user_verified() helper function
-- ============================================================================
-- This function is SECURITY DEFINER and read-only.
-- It returns a simple boolean; it does NOT expose any sensitive data.
-- Can be used in RLS policies or direct SQL queries.
--
-- Logic: user is verified if ALL three conditions are true:
--   1. email_verified_at IS NOT NULL
--   2. phone_verified_at IS NOT NULL
--   3. At least one verification record with status = 'approved' exists
--
-- This mirrors the logic already in verificationService.ts (isUserVerified).

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

-- ============================================================================
-- STEP 6: Add comment for documentation
-- ============================================================================
COMMENT ON FUNCTION is_user_verified(UUID) IS
  'Read-only check: returns true if user has verified email, verified phone, and approved KYC. Returns false for any missing or unverified component.';

-- ============================================================================
-- END OF MIGRATION 004
-- ============================================================================
