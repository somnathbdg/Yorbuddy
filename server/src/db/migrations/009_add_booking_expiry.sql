-- ============================================================================
-- Migration 009: Add booking expiry support
-- ============================================================================
-- Safe for: Existing YorBuddy Step 1-8 architecture
-- Impact: Non-destructive, idempotent, backward-compatible
--
-- PREREQUISITE: schema.sql must have been run first
-- PREREQUISITE: Migrations 001-008 must have been run
--
-- WHAT THIS MIGRATION DOES:
--   1. Adds expires_at column to bookings table
--   2. Adds updated_at column to bookings table
--   3. Updates bookings.status CHECK constraint to include 'expired'
--   4. Creates index for efficient expiry queries
--   5. Creates trigger to auto-update updated_at
--   6. Backfills existing pending test bookings with expires_at = created_at + 30 min
--
-- WHAT THIS MIGRATION DOES NOT DO:
--   - Does NOT delete any bookings
--   - Does NOT modify confirmed, completed, or cancelled bookings
--   - Does NOT change pricing or payment logic
--   - Does NOT add or modify any RLS policies
-- ============================================================================

-- ============================================================================
-- STEP 1: Add expires_at column
-- ============================================================================
-- Nullable by default. Existing rows will have NULL until backfilled.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Add updated_at column
-- ============================================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================================
-- STEP 3: Update bookings status CHECK constraint to include 'expired'
-- ============================================================================
-- Old constraint: ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')
-- New constraint: ('pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'expired')

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'expired'));

-- ============================================================================
-- STEP 4: Create index for efficient expiry queries
-- ============================================================================
-- Partial index: only indexes pending bookings with non-null expires_at
-- This makes the cleanup job query very fast
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON bookings(expires_at) 
  WHERE status = 'pending';

-- ============================================================================
-- STEP 5: Create trigger to auto-update updated_at
-- ============================================================================
CREATE TRIGGER IF NOT EXISTS update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Backfill existing pending test bookings
-- ============================================================================
-- Existing pending bookings are 5-7 days old abandoned test data.
-- Set expires_at = created_at + 30 minutes so cleanup job will expire them.
-- This is safe because:
--   - They are all old test bookings (confirmed via pre-migration check)
--   - No user action is pending on them
--   - They will be expired within 5 minutes of cleanup job running

UPDATE bookings 
SET expires_at = created_at + INTERVAL '30 minutes'
WHERE status = 'pending' AND expires_at IS NULL;

-- ============================================================================
-- END OF MIGRATION 009
-- ============================================================================
