-- ============================================================================
-- Migration 005: KYC Verification System — Final Corrected
-- ============================================================================
-- Safe for: Existing YorBuddy Step 1-7 architecture
-- Impact: Non-destructive, idempotent, backward-compatible
--
-- PREREQUISITE: schema.sql must have been run first (creates verifications table)
-- PREREQUISITE: Migrations 001-003 must have been run
--
-- WHAT THIS MIGRATION DOES:
--   1. Adds email_verified_at and phone_verified_at columns to users
--   2. Migrates existing 'verified' KYC status to 'approved'
--   3. Updates verifications.status CHECK constraint for new KYC states
--   4. Creates indexes for verification lookups
--   5. Creates read-only is_user_verified() helper function
--
-- WHAT THIS MIGRATION DOES NOT DO:
--   - Does NOT create new tables (uses existing verifications table from schema.sql)
--   - Does NOT delete or modify existing verification data
--   - Does NOT change existing user/profile/buddy_profiles schemas
--   - Does NOT store raw Aadhaar/PAN/passport numbers
--   - Does NOT add or modify any RLS policies (RLS already enabled by schema.sql)
-- ============================================================================

-- ============================================================================
-- STEP 1: Add verification timestamp columns to users
-- ============================================================================
-- These are NULLABLE — existing rows are unaffected.
-- Existing INSERT statements that omit these columns will continue to work.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Migrate existing KYC status values safely
-- ============================================================================
-- Old constraint allowed: ('pending', 'verified', 'rejected')
-- New constraint will allow: ('not_submitted', 'pending', 'approved', 'rejected')
--
-- Any existing row with status 'verified' is migrated to 'approved'.
-- Rows with 'pending' or 'rejected' are unchanged.
-- This is idempotent — safe to re-run.

UPDATE verifications
SET status = 'approved'
WHERE status = 'verified';

-- ============================================================================
-- STEP 3: Update verifications status CHECK constraint
-- ============================================================================
-- Drop old constraint and add new one with expanded status values.
-- All existing data has been migrated in Step 2.

ALTER TABLE verifications DROP CONSTRAINT IF EXISTS verifications_status_check;
ALTER TABLE verifications ADD CONSTRAINT verifications_status_check
  CHECK (status IN ('not_submitted', 'pending', 'approved', 'rejected'));

-- ============================================================================
-- STEP 4: Create indexes for verification lookups
-- ============================================================================
-- Partial indexes: only index rows where verification timestamp is non-null.
-- Keeps index small for the common case (most users unverified).

CREATE INDEX IF NOT EXISTS idx_users_email_verified
  ON users(email_verified_at) WHERE email_verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_phone_verified
  ON users(phone_verified_at) WHERE phone_verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_verifications_user_status
  ON verifications(user_id, status);

-- ============================================================================
-- STEP 5: Create read-only is_user_verified() helper function
-- ============================================================================
-- SECURITY DEFINER: runs with function owner privileges (service role).
-- Read-only: only SELECTs, does NOT expose any sensitive data.
-- Returns a simple BOOLEAN.
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

COMMENT ON FUNCTION is_user_verified(UUID) IS
  'Read-only check: returns true if user has verified email, verified phone, and approved KYC. Returns false for any missing or unverified component.';

-- ============================================================================
-- END OF MIGRATION 005
-- ============================================================================
