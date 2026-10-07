-- ============================================================================
-- Migration: Create memberships table
-- ============================================================================
-- Safe for: Existing YorBuddy Step 1-10 architecture
-- Impact: Creates memberships table required by application code
--
-- PREREQUISITE: schema.sql must have been run first
-- PREREQUISITE: Migrations 001-010 must have been run
--
-- WHAT THIS MIGRATION DOES:
--   1. Creates memberships table with exact schema from production
--   2. Adds foreign key constraint to users table
--   3. Adds indexes for common query patterns
--   4. Enables Row Level Security (RLS)
--   5. Creates trigger for updated_at auto-update
--
-- WHAT THIS MIGRATION DOES NOT DO:
--   - Does NOT modify existing tables
--   - Does NOT delete or modify existing data
--   - Does NOT add new pricing plans
--   - Does NOT apply commission logic
--   - Does NOT migrate data from OLD database
--
-- HISTORICAL PLAN VALUES PRESERVED:
--   MONTH_1, MONTH_6, YEAR_1, LIFETIME
-- ============================================================================

-- ============================================================================
-- STEP 1: Create memberships table
-- ============================================================================
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'success', 'failed', 'cancelled')),
  membership_start_date TIMESTAMPTZ,
  membership_expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create indexes for common query patterns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_plan ON memberships(plan_id);

-- ============================================================================
-- STEP 3: Enable Row Level Security
-- ============================================================================
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create trigger for updated_at auto-update
-- ============================================================================
-- Drop trigger if exists, then create (PostgreSQL compatible)
DROP TRIGGER IF EXISTS update_memberships_updated_at ON memberships;
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF MIGRATION 011
-- ============================================================================
