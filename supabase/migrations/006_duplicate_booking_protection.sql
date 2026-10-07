-- ============================================================================
-- Migration: Add duplicate booking protection
-- ============================================================================
-- This migration adds a partial unique index to prevent duplicate active bookings
-- for the same user + buddy + date + time combination.
-- This provides database-level enforcement against race conditions.
-- ============================================================================

-- Prevent overlapping active bookings for the same user on the same date+time
-- Note: Full overlap prevention requires application logic (variable duration),
-- but exact duplicate prevention is handled here at the DB level.
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_no_duplicate_active
  ON bookings (user_id, buddy_id, booking_date, booking_time)
  WHERE status IN ('pending', 'confirmed');

-- Add comment explaining the constraint
COMMENT ON INDEX idx_booking_no_duplicate_active IS
  'Prevents duplicate active bookings for the same user+buddy+date+time. Overlap prevention for variable durations is handled in application logic (checkOverlap).';
