-- ============================================================================
-- Migration: Fix payments_status_check constraint
-- ============================================================================
-- The payments table has a CHECK constraint that doesn't include 'created'
-- as a valid status. The payment service inserts with status='created' which
-- violates this constraint, causing a 500 error on order creation.
-- ============================================================================

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (status IN ('initiated', 'created', 'pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'));
