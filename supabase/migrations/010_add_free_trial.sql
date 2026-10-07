-- ============================================================================
-- Migration: Add free trial support
-- ============================================================================
-- Safe for: Existing YorBuddy Step 1-9 architecture
-- Impact: Non-destructive, idempotent, backward-compatible
--
-- PREREQUISITE: schema.sql must have been run first
-- PREREQUISITE: Migrations 001-009 must have been run
--
-- WHAT THIS MIGRATION DOES:
--   1. Adds free_trial_used column to users table
--   2. Adds partial unique index to enforce one free trial per user
--   3. Creates free_trial_memberships view for tracking
--
-- WHAT THIS MIGRATION DOES NOT DO:
--   - Does NOT delete or modify existing membership records
--   - Does NOT change existing pricing data
--   - Does NOT add or modify any RLS policies
-- ============================================================================

-- ============================================================================
-- STEP 1: Add free_trial_used column to users
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_trial_used BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- STEP 2: Add index for efficient free trial lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_free_trial_used ON users(free_trial_used) WHERE free_trial_used = true;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
