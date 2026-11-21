-- YorBuddy main schema reconciliation (forward-only, additive)
-- Prepared after read-only comparison of Supabase Main and repository migrations.
--
-- Scope:
--   1) Add the missing atomic booking RPC used by the current booking service.
--   2) Add append-only admin Buddy action history and suspend/restore RPCs.
--
-- Safety:
--   * No existing application rows are updated, deleted, or backfilled.
--   * No payment or membership records are touched.
--   * Existing objects are preserved; functions are created/replaced idempotently.
--   * Preflight aborts if required tables/columns are missing.
--   * Apply only after a verified backup and explicit change window approval.
--   * This file does NOT repair historical Supabase migration-ledger entries.
--     Do not manually insert into supabase_migrations.schema_migrations.
--
-- NOTE: supabase/migrations/021_atomic_booking_slot_concurrency.sql contains
-- the booking RPC separately. If that migration is applied first, this file's
-- CREATE OR REPLACE is harmless. Do not apply this file and an alternate
-- implementation of migration 022 without reviewing the function definitions.

BEGIN;

DO $preflight$
DECLARE
  missing text[] := ARRAY[]::text[];
  item record;
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    missing := array_append(missing, 'public.users');
  END IF;
  IF to_regclass('public.bookings') IS NULL THEN
    missing := array_append(missing, 'public.bookings');
  END IF;
  IF to_regclass('public.buddy_profiles') IS NULL THEN
    missing := array_append(missing, 'public.buddy_profiles');
  END IF;
  IF to_regclass('public.refresh_tokens') IS NULL THEN
    missing := array_append(missing, 'public.refresh_tokens');
  END IF;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Reconciliation aborted; required tables missing: %',
      array_to_string(missing, ', ');
  END IF;

  FOR item IN
    SELECT * FROM (VALUES
      ('users','id'), ('users','role'), ('users','is_active'), ('users','updated_at'),
      ('bookings','id'), ('bookings','booking_code'), ('bookings','user_id'),
      ('bookings','buddy_id'), ('bookings','activity_id'), ('bookings','booking_date'),
      ('bookings','booking_time'), ('bookings','duration_hours'), ('bookings','hourly_rate'),
      ('bookings','booking_amount'), ('bookings','platform_fee'), ('bookings','total_amount'),
      ('bookings','status'), ('bookings','expires_at'), ('bookings','location_name'),
      ('bookings','location_address'), ('bookings','special_notes'),
      ('bookings','meet_safety_acknowledged'), ('bookings','has_review'),
      ('buddy_profiles','user_id'), ('buddy_profiles','is_verified'),
      ('buddy_profiles','is_online'), ('buddy_profiles','verification_status'),
      ('refresh_tokens','user_id'), ('refresh_tokens','revoked_at')
    ) AS required(table_name, column_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema='public'
        AND c.table_name=item.table_name
        AND c.column_name=item.column_name
    ) THEN
      missing := array_append(missing, 'public.'||item.table_name||'.'||item.column_name);
    END IF;
  END LOOP;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Reconciliation aborted; required columns missing: %',
      array_to_string(missing, ', ');
  END IF;
END
$preflight$;

-- A. Atomic booking creation. Per-buddy/day and per-user/day advisory locks
-- serialize overlapping booking attempts without altering existing bookings.
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_booking_code text,
  p_user_id uuid,
  p_buddy_id uuid,
  p_activity_id uuid,
  p_booking_date date,
  p_booking_time time without time zone,
  p_duration_hours integer,
  p_hourly_rate integer,
  p_booking_amount integer,
  p_platform_fee integer,
  p_total_amount integer,
  p_expires_at timestamptz,
  p_location_name text,
  p_location_address text,
  p_special_notes text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_lock_one bigint;
  v_lock_two bigint;
  v_booking public.bookings;
BEGIN
  IF p_user_id IS NULL OR p_buddy_id IS NULL OR p_user_id = p_buddy_id THEN
    RAISE EXCEPTION 'Invalid booking participants' USING ERRCODE = '22023';
  END IF;

  IF p_booking_code IS NULL OR length(btrim(p_booking_code)) = 0
     OR p_activity_id IS NULL OR p_booking_date IS NULL OR p_booking_time IS NULL
     OR p_duration_hours IS NULL OR p_duration_hours < 1 OR p_duration_hours > 8 THEN
    RAISE EXCEPTION 'Invalid booking code, activity, date, time, or duration'
      USING ERRCODE = '22023';
  END IF;

  v_lock_one := hashtextextended(
    'yorbuddy:buddy:' || p_buddy_id::text || ':' || p_booking_date::text, 0
  );
  v_lock_two := hashtextextended(
    'yorbuddy:user:' || p_user_id::text || ':' || p_booking_date::text, 0
  );

  IF v_lock_one < v_lock_two THEN
    PERFORM pg_advisory_xact_lock(v_lock_one);
    PERFORM pg_advisory_xact_lock(v_lock_two);
  ELSE
    PERFORM pg_advisory_xact_lock(v_lock_two);
    PERFORM pg_advisory_xact_lock(v_lock_one);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.booking_date = p_booking_date
      AND b.status IN ('pending', 'confirmed')
      AND b.buddy_id = p_buddy_id
      AND b.booking_time < p_booking_time + make_interval(hours => p_duration_hours)
      AND b.booking_time + make_interval(hours => b.duration_hours) > p_booking_time
  ) THEN
    RAISE EXCEPTION 'Buddy booking time overlaps an active booking'
      USING ERRCODE = '23P01';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.booking_date = p_booking_date
      AND b.status IN ('pending', 'confirmed')
      AND b.user_id = p_user_id
      AND b.booking_time < p_booking_time + make_interval(hours => p_duration_hours)
      AND b.booking_time + make_interval(hours => b.duration_hours) > p_booking_time
  ) THEN
    RAISE EXCEPTION 'User booking time overlaps an active booking'
      USING ERRCODE = '23P01';
  END IF;

  INSERT INTO public.bookings (
    booking_code, user_id, buddy_id, activity_id, booking_date, booking_time,
    duration_hours, hourly_rate, booking_amount, platform_fee, total_amount,
    status, expires_at, location_name, location_address, special_notes,
    meet_safety_acknowledged, has_review
  ) VALUES (
    p_booking_code, p_user_id, p_buddy_id, p_activity_id, p_booking_date, p_booking_time,
    p_duration_hours, p_hourly_rate, p_booking_amount, p_platform_fee, p_total_amount,
    'pending', p_expires_at, p_location_name, p_location_address, p_special_notes,
    true, false
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_booking_atomic(
  text, uuid, uuid, date, time, integer, integer, integer, integer,
  integer, timestamptz, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_booking_atomic(
  text, uuid, uuid, uuid, date, time, integer, integer, integer, integer,
  integer, timestamptz, text, text, text
) TO service_role;

-- B. Append-only admin action history.
CREATE TABLE IF NOT EXISTS public.admin_buddy_account_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id uuid NOT NULL REFERENCES public.users(id),
  buddy_user_id uuid NOT NULL REFERENCES public.users(id),
  action varchar(20) NOT NULL CHECK (action IN ('suspend', 'restore')),
  reason varchar(500),
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $table_shape$
BEGIN
  IF NOT (
    SELECT count(*) = 5
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='admin_buddy_account_actions'
      AND column_name IN ('id','actor_admin_id','buddy_user_id','action','reason','created_at')
  ) THEN
    RAISE EXCEPTION 'Reconciliation aborted: admin_buddy_account_actions exists with an unexpected schema';
  END IF;
END
$table_shape$;

CREATE INDEX IF NOT EXISTS idx_admin_buddy_actions_buddy_created
  ON public.admin_buddy_account_actions (buddy_user_id, created_at DESC);

ALTER TABLE public.admin_buddy_account_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_buddy_account_actions
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.prevent_admin_buddy_action_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $audit$
BEGIN
  RAISE EXCEPTION 'Admin Buddy action history is append-only';
END;
$audit$;

DO $triggers$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.admin_buddy_account_actions'::regclass
      AND tgname='admin_buddy_actions_no_update_delete'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER admin_buddy_actions_no_update_delete
      BEFORE UPDATE OR DELETE ON public.admin_buddy_account_actions
      FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_buddy_action_mutation();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.admin_buddy_account_actions'::regclass
      AND tgname='admin_buddy_actions_no_truncate'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER admin_buddy_actions_no_truncate
      BEFORE TRUNCATE ON public.admin_buddy_account_actions
      FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_admin_buddy_action_mutation();
  END IF;
END
$triggers$;

CREATE OR REPLACE FUNCTION public.admin_suspend_buddy_account(
  p_actor_id uuid,
  p_buddy_user_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_role text;
  v_target_role text;
BEGIN
  SELECT u.role INTO v_actor_role
  FROM public.users u
  WHERE u.id=p_actor_id AND u.is_active=true;

  IF v_actor_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_actor_id=p_buddy_user_id THEN
    RAISE EXCEPTION 'You cannot suspend your own account' USING ERRCODE = '22023';
  END IF;
  IF length(btrim(coalesce(p_reason,''))) < 10 OR length(btrim(p_reason)) > 500 THEN
    RAISE EXCEPTION 'Suspension reason must be 10-500 characters' USING ERRCODE = '22023';
  END IF;

  SELECT u.role INTO v_target_role
  FROM public.users u
  WHERE u.id=p_buddy_user_id AND u.is_active=true
  FOR UPDATE;

  IF v_target_role IS DISTINCT FROM 'buddy' THEN
    RAISE EXCEPTION 'Active Buddy account not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.users
  SET is_active=false, updated_at=now()
  WHERE id=p_buddy_user_id;

  UPDATE public.buddy_profiles
  SET is_verified=false, is_online=false
  WHERE user_id=p_buddy_user_id;

  UPDATE public.refresh_tokens
  SET revoked_at=coalesce(revoked_at, now())
  WHERE user_id=p_buddy_user_id AND revoked_at IS NULL;

  INSERT INTO public.admin_buddy_account_actions
    (actor_admin_id, buddy_user_id, action, reason)
  VALUES
    (p_actor_id, p_buddy_user_id, 'suspend', btrim(p_reason));

  RETURN jsonb_build_object(
    'buddy_user_id', p_buddy_user_id,
    'is_active', false,
    'action', 'suspend'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_restore_buddy_account(
  p_actor_id uuid,
  p_buddy_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_role text;
  v_target_role text;
  v_kyc_status text;
BEGIN
  SELECT u.role INTO v_actor_role
  FROM public.users u
  WHERE u.id=p_actor_id AND u.is_active=true;

  IF v_actor_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_actor_id=p_buddy_user_id THEN
    RAISE EXCEPTION 'You cannot restore your own account' USING ERRCODE = '22023';
  END IF;

  SELECT u.role INTO v_target_role
  FROM public.users u
  WHERE u.id=p_buddy_user_id AND u.is_active=false
  FOR UPDATE;

  IF v_target_role IS DISTINCT FROM 'buddy' THEN
    RAISE EXCEPTION 'Suspended Buddy account not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT bp.verification_status INTO v_kyc_status
  FROM public.buddy_profiles bp
  WHERE bp.user_id=p_buddy_user_id;

  UPDATE public.users
  SET is_active=true, updated_at=now()
  WHERE id=p_buddy_user_id;

  UPDATE public.buddy_profiles
  SET is_verified=(v_kyc_status='approved'), is_online=false
  WHERE user_id=p_buddy_user_id;

  INSERT INTO public.admin_buddy_account_actions
    (actor_admin_id, buddy_user_id, action, reason)
  VALUES
    (p_actor_id, p_buddy_user_id, 'restore', 'Restored by authorized admin');

  RETURN jsonb_build_object(
    'buddy_user_id', p_buddy_user_id,
    'is_active', true,
    'is_verified', (v_kyc_status='approved'),
    'is_online', false,
    'action', 'restore'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_suspend_buddy_account(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_restore_buddy_account(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_suspend_buddy_account(uuid, uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_restore_buddy_account(uuid, uuid)
  TO service_role;

COMMENT ON TABLE public.admin_buddy_account_actions IS
  'Append-only audit history for authorized admin Buddy suspension and restoration actions.';

COMMIT;

-- Post-apply verification (run separately; read-only):
-- SELECT to_regprocedure('public.create_booking_atomic(text,uuid,uuid,date,time,integer,integer,integer,integer,integer,timestamptz,text,text,text)');
-- SELECT to_regprocedure('public.admin_suspend_buddy_account(uuid,uuid,text)');
-- SELECT to_regprocedure('public.admin_restore_buddy_account(uuid,uuid)');
-- SELECT to_regclass('public.admin_buddy_account_actions');
-- SELECT has_function_privilege('anon','public.create_booking_atomic(text,uuid,uuid,date,time,integer,integer,integer,integer,integer,timestamptz,text,text,text)','EXECUTE'),
--        has_function_privilege('authenticated','public.create_booking_atomic(text,uuid,uuid,date,time,integer,integer,integer,integer,integer,timestamptz,text,text,text)','EXECUTE'),
--        has_function_privilege('service_role','public.create_booking_atomic(text,uuid,uuid,date,time,integer,integer,integer,integer,integer,timestamptz,text,text,text)','EXECUTE');
