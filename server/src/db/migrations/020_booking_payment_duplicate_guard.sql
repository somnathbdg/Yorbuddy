-- Migration 020: prevent multiple successful payment records per booking
-- and prevent one Razorpay payment ID from being attached to multiple records.
-- Forward-only. Apply only after duplicate-data preflight and explicit approval.

BEGIN;

DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.payments
     WHERE razorpay_payment_id IS NOT NULL
     GROUP BY razorpay_payment_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Migration 020 aborted: duplicate Razorpay payment IDs already exist';
  END IF;
END
$preflight$;

CREATE UNIQUE INDEX IF NOT EXISTS payments_razorpay_payment_id_unique_idx
  ON public.payments (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

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
  IF p_razorpay_payment_id IS NULL
     OR length(btrim(p_razorpay_payment_id)) = 0 THEN
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

  -- Lock the booking before checking sibling payment records. This serializes
  -- different payment rows attempting to confirm the same booking.
  SELECT status
    INTO v_booking_status
    FROM public.bookings
   WHERE id = v_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking associated with payment was not found' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.payments p
     WHERE p.booking_id = v_booking_id
       AND p.payment_type = 'booking'
       AND p.status = 'success'
       AND p.id <> p_payment_record_id
  ) THEN
    RAISE EXCEPTION 'Another payment has already succeeded for this booking'
      USING ERRCODE = '23505';
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

COMMIT;
