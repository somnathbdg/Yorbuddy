-- Atomic booking creation: serialize per-user and per-buddy/day slot checks.
-- Only service_role may call this SECURITY INVOKER RPC.
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
  IF p_booking_date IS NULL OR p_booking_time IS NULL
     OR p_duration_hours IS NULL OR p_duration_hours < 1 OR p_duration_hours > 8 THEN
    RAISE EXCEPTION 'Invalid booking date, time, or duration' USING ERRCODE = '22023';
  END IF;

  -- Stable lock order avoids deadlocks. Hash collisions only cause harmless extra serialization.
  v_lock_one := hashtextextended('yorbuddy:buddy:' || p_buddy_id::text || ':' || p_booking_date::text, 0);
  v_lock_two := hashtextextended('yorbuddy:user:' || p_user_id::text || ':' || p_booking_date::text, 0);
  IF v_lock_one < v_lock_two THEN
    PERFORM pg_advisory_xact_lock(v_lock_one);
    PERFORM pg_advisory_xact_lock(v_lock_two);
  ELSE
    PERFORM pg_advisory_xact_lock(v_lock_two);
    PERFORM pg_advisory_xact_lock(v_lock_one);
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.bookings b
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
    SELECT 1
      FROM public.bookings b
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
  text, uuid, uuid, uuid, date, time, integer, integer, integer, integer,
  integer, timestamptz, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(
  text, uuid, uuid, uuid, date, time, integer, integer, integer, integer,
  integer, timestamptz, text, text, text
) TO service_role;
