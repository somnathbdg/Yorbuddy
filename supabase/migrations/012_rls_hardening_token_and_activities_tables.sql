-- ============================================================================
-- Migration: RLS hardening for activities, password_reset_tokens, verification_codes
-- ============================================================================
-- Context (from the read-only RLS audit):
--   Every application table had RLS enabled EXCEPT these three, which were left
--   with RLS DISABLED:
--     - activities
--     - password_reset_tokens
--     - verification_codes
--   No RLS policies exist anywhere in this schema (RLS-on tables are default-deny).
--
-- Objective:
--   Bring these three tables to the SAME safe posture as the rest of the schema,
--   without changing application behaviour.
--
-- Design rationale (why this is safe):
--   * The backend accesses Supabase exclusively with SUPABASE_SERVICE_KEY
--     (server/src/config/database.ts -> createClient(SUPABASE_URL, SERVICE_KEY)).
--     The service_role role has BYPASSRLS and is NEVER subject to RLS, so enabling
--     RLS on these tables cannot affect any backend query.
--   * NO policy is created. In PostgreSQL, "RLS enabled + no policy" means
--     DEFAULT DENY for every non-bypass role. anon/authenticated therefore get
--     no SELECT, INSERT, UPDATE or DELETE -- exactly the intended restriction.
--   * FORCE ROW LEVEL SECURITY is deliberately NOT set: it is unnecessary because
--     service_role bypasses RLS regardless, and forcing it would only add risk.
--   * Existing table GRANTs to anon/authenticated are REVOKEd as defense-in-depth.
--     This is redundant with default-deny, but it makes the intent explicit and
--     protects against a future accidental permissive policy being added.
--
-- Explicitly NOT done by this migration:
--   - No CREATE POLICY (no allow-all / public policy).
--   - No INSERT / UPDATE / DELETE on any row (no data is modified or deleted).
--   - No changes to any other table (bookings, users, memberships, payments,
--     messages, etc. are untouched).
--   - No changes to service_role privileges.
--   - No changes to application, authentication or configuration code.
--
-- This migration is idempotent and safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. activities
--    Public reference data (seeded list of activities). The backend only ever
--    SELECTs from it, via service_role. No browser Supabase client exists.
-- ----------------------------------------------------------------------------
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.activities FROM anon;
REVOKE ALL ON TABLE public.activities FROM authenticated;

COMMENT ON TABLE public.activities IS
  'Public reference data. RLS enabled with NO policies => default deny for anon/authenticated. Backend reads via service_role (BYPASSRLS). Do not add an allow-all policy.';

-- ----------------------------------------------------------------------------
-- B. password_reset_tokens
--    Stores SHA-256 hashes of live password-reset tokens (single-use, 1h expiry).
--    Backend-only access via service_role.
-- ----------------------------------------------------------------------------
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.password_reset_tokens FROM anon;
REVOKE ALL ON TABLE public.password_reset_tokens FROM authenticated;

COMMENT ON TABLE public.password_reset_tokens IS
  'Stores hashed password reset tokens. RLS enabled with NO policies => default deny for anon/authenticated. Backend accesses via service_role only. Do not add an allow-all policy.';

-- ----------------------------------------------------------------------------
-- C. verification_codes
--    Stores SHA-256 hashes of email/phone verification codes (single-use).
--    Backend-only access via service_role.
-- ----------------------------------------------------------------------------
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.verification_codes FROM anon;
REVOKE ALL ON TABLE public.verification_codes FROM authenticated;

COMMENT ON TABLE public.verification_codes IS
  'Stores hashed verification codes for email/phone verification. RLS enabled with NO policies => default deny for anon/authenticated. Backend accesses via service_role only. Do not add an allow-all policy.';

-- ============================================================================
-- END OF MIGRATION 012
-- ============================================================================
