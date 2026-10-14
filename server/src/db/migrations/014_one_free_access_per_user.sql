-- ============================================================================
-- Migration: Enforce one FREE_ACCESS_10D grant per user
-- ============================================================================
-- Safe for: Existing YorBuddy architecture (post migration 011)
-- Impact: Adds a partial unique index. Idempotent, non-destructive.
--
-- PREREQUISITE: schema.sql + migrations 001-013
--
-- WHAT THIS MIGRATION DOES:
--   Creates a partial unique index that allows at most ONE memberships row
--   with plan_id = 'FREE_ACCESS_10D' per user_id.
--
--   This is the database-level backstop for the "one free-access grant per
--   account" rule. Application code (assignFreeAccess) checks for an existing
--   row first, then treats a 23505 unique violation as the intended outcome.
--
-- WHAT THIS MIGRATION DOES NOT DO:
--   - Does NOT delete or modify any existing membership record
--   - Does NOT restrict TRIAL_1D, WEEK_1, or MONTH_1 (those are repeatable)
--   - Does NOT touch any other table, column, index, or RLS policy
--   - Does NOT change pricing or plan definitions
--
-- WHY THE INDEX IS PARTIAL (WHERE plan_id = 'FREE_ACCESS_10D'):
--   A plain UNIQUE(user_id, plan_id) would wrongly cap paid plans at one
--   purchase per user. TRIAL_1D (Rs.99), WEEK_1 (Rs.499) and MONTH_1
--   (Rs.1999) must remain repeatable, each requiring its own payment.
--   The partial predicate scopes the constraint to free access only.
--
-- SAFETY:
--   The index CANNOT be created while duplicate FREE_ACCESS_10D rows exist.
--   Run the PRE-FLIGHT CHECK below first. It must return 0 rows.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- PRE-FLIGHT CHECK (run this FIRST, separately).
-- Expected result: 0 rows. Any row returned means a user already holds more
-- than one FREE_ACCESS_10D grant and must be reviewed before applying.
-- ---------------------------------------------------------------------------
-- SELECT user_id, COUNT(*) AS free_access_grants
-- FROM memberships
-- WHERE plan_id = 'FREE_ACCESS_10D'
-- GROUP BY user_id
-- HAVING COUNT(*) > 1;
-- ---------------------------------------------------------------------------


-- ============================================================================
-- STEP 1: Partial unique index — one free-access grant per user
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_one_free_access
  ON memberships (user_id)
  WHERE plan_id = 'FREE_ACCESS_10D';


-- ============================================================================
-- POST-APPLY VERIFICATION (run separately, optional).
-- Expected: exactly one row, indexdef containing "UNIQUE" and
-- "WHERE (plan_id = 'FREE_ACCESS_10D'::character varying)".
-- ============================================================================
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'memberships'
--   AND indexname = 'idx_memberships_one_free_access';
-- ============================================================================


-- ============================================================================
-- END OF MIGRATION 014
-- ============================================================================
