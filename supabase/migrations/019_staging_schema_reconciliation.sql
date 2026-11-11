-- Migration 019: forward-only staging reconciliation for current backend usage.
-- Prepared from read-only source audit and staging catalog inspection.
-- Apply ONLY after backup/restore gate, schema preflight, and explicit approval.
--
-- Runtime dependencies confirmed in current backend:
--   * membershipService.assignFreeAccess writes users.free_trial_used=true.
--   * googleAuthService.findOrCreateUser reads/writes users.google_id.
--   * paymentService.verifyBookingPayment and verified Razorpay webhook call
--     public.confirm_booking_payment(...).
--   * application code does NOT call public.is_user_verified(uuid); it uses
--     verificationService.isUserVerified() and queries users/verifications.
--
-- This migration does not replay historical migrations or backfill historical
-- free_trial_used values. The flag is informational only in current code.
-- It does not modify existing membership/payment/booking rows.

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'Migration 019 aborted: public.users is missing';
  END IF;
  IF to_regclass('public.payments') IS NULL THEN
    RAISE EXCEPTION 'Migration 019 aborted: public.payments is missing';
  END IF;
  IF to_regclass('public.bookings') IS NULL THEN
    RAISE EXCEPTION 'Migration 019 aborted: public.bookings is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments' AND column_name='booking_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments' AND column_name='payment_type'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments' AND column_name='status'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments' AND column_name='razorpay_payment_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payments' AND column_name='razorpay_signature'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings' AND column_name='status'
  ) THEN
    RAISE EXCEPTION 'Migration 019 aborted: required payment/booking columns are missing';
  END IF;
END
$preflight$;

-- A. Current registration code writes this informational flag.
-- Existing rows receive false via the non-null default; no historical
-- membership-based inference/backfill is attempted.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS free_trial_used boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_free_trial_used
  ON public.users (free_trial_used)
  WHERE free_trial_used = true;

COMMENT ON COLUMN public.users.free_trial_used IS
  'Informational compatibility flag set when FREE_ACCESS_10D is assigned; not used as a current eligibility gate.';

-- B. Google OAuth code looks up, links, and inserts users.google_id.
-- A nullable unique partial index allows multiple unlinked (NULL) accounts.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS google_id text;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique_idx
  ON public.users (google_id)
  WHERE google_id IS NOT NULL;

COMMENT ON COLUMN public.users.google_id IS
  'Google OpenID Connect subject (sub) for linking a YorBuddy user account.';

-- C. Current backend calls this RPC only after verifying either the client
-- Razorpay order/payment HMAC or the raw webhook HMAC.
-- SECURITY INVOKER + pinned search_path; execute is limited to service_role.
CREATE OR REPLACE FUNCTION public.confirm_booking_payment(
  p_payment_record_id uuid,
  p_razorpay_payment_id text,
  p_razorpay_signature text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_booking_id uuid;
  v_payment_type text;
  v_payment_status text;
  v_existing_payment_id text;
  v_booking_status text;
  v_rows integer;
BEGIN
  IF p_payment_record_id IS NULL THEN
    RAISE EXCEPTION 'Payment confirmation requires a payment record ID'
      USING ERRCODE = '22023';
  END IF;

  IF p_razorpay_payment_id IS NULL OR length(btrim(p_razorpay_payment_id)) = 0 THEN
    RAISE EXCEPTION 'Payment confirmation requires a Razorpay payment ID'
      USING ERRCODE = '22023';
  END IF;

  SELECT booking_id, payment_type, status, razorpay_payment_id
    INTO v_booking_id, v_payment_type, v_payment_status, v_existing_payment_id
    FROM public.payments
   WHERE id = p_payment_record_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment_type IS DISTINCT FROM 'booking' THEN
    RAISE EXCEPTION 'Payment record is not a booking payment' USING ERRCODE = '22023';
  END IF;

  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Booking payment is missing its booking_id' USING ERRCODE = '23502';
  END IF;

  IF v_payment_status = 'success' THEN
    IF v_existing_payment_id IS DISTINCT FROM p_razorpay_payment_id THEN
      RAISE EXCEPTION 'Payment record is already successful with a different Razorpay payment ID'
        USING ERRCODE = '23505';
    END IF;
  ELSIF v_payment_status IS NULL
     OR v_payment_status NOT IN ('initiated', 'created', 'pending', 'processing') THEN
    RAISE EXCEPTION 'Payment cannot transition to success from status %', v_payment_status
      USING ERRCODE = '22023';
  END IF;

  SELECT status
    INTO v_booking_status
    FROM public.bookings
   WHERE id = v_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking associated with payment was not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking_status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Booking cannot be confirmed from status %', v_booking_status
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.payments
     SET razorpay_payment_id = p_razorpay_payment_id,
         razorpay_signature = COALESCE(p_razorpay_signature, razorpay_signature),
         status = 'success',
         payment_method = 'razorpay'
   WHERE id = p_payment_record_id;

  UPDATE public.bookings
     SET status = 'confirmed'
   WHERE id = v_booking_id
     AND status IN ('pending', 'confirmed');

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Booking confirmation did not update exactly one row';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.confirm_booking_payment(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking_payment(uuid, text, text)
  TO service_role;

-- D. The backend has no SQL caller for this legacy helper; verificationService
-- computes the same predicate in TypeScript. Keep the function for compatibility,
-- pin its search_path, and remove direct API-role execution.
DO $function_hardening$
BEGIN
  IF to_regprocedure('public.is_user_verified(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.is_user_verified(uuid)
      SET search_path = pg_catalog, public;
    REVOKE ALL ON FUNCTION public.is_user_verified(uuid)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.is_user_verified(uuid)
      TO service_role;
  END IF;
END
$function_hardening$;

COMMIT;

-- Post-apply verification (run separately; read-only):
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='users'
--    AND column_name IN ('free_trial_used','google_id');
-- SELECT indexname, indexdef FROM pg_indexes
--  WHERE schemaname='public'
--    AND indexname IN ('idx_users_free_trial_used','users_google_id_unique_idx');
-- SELECT to_regprocedure('public.confirm_booking_payment(uuid,text,text)');
-- SELECT has_function_privilege('anon','public.confirm_booking_payment(uuid,text,text)','EXECUTE'),
--        has_function_privilege('authenticated','public.confirm_booking_payment(uuid,text,text)','EXECUTE'),
--        has_function_privilege('service_role','public.confirm_booking_payment(uuid,text,text)','EXECUTE');
