-- Migration 018: atomically confirm a booking and its successful payment.
-- The function is invoked only by the backend service-role client.
CREATE OR REPLACE FUNCTION public.confirm_booking_payment(
  p_payment_record_id UUID,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_payment_status TEXT;
  v_existing_payment_id TEXT;
  v_booking_status TEXT;
  v_rows INTEGER;
BEGIN
  IF p_payment_record_id IS NULL OR p_razorpay_payment_id IS NULL OR length(trim(p_razorpay_payment_id)) = 0 THEN
    RAISE EXCEPTION 'Payment confirmation requires a payment record and Razorpay payment ID';
  END IF;

  SELECT booking_id, status, razorpay_payment_id
    INTO v_booking_id, v_payment_status, v_existing_payment_id
    FROM public.payments
   WHERE id = p_payment_record_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record not found';
  END IF;

  IF v_payment_status = 'success' AND v_existing_payment_id IS DISTINCT FROM p_razorpay_payment_id THEN
    RAISE EXCEPTION 'Payment record is already successful with a different Razorpay payment ID';
  END IF;

  SELECT status
    INTO v_booking_status
    FROM public.bookings
   WHERE id = v_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking associated with payment was not found';
  END IF;

  IF v_booking_status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Booking cannot be confirmed from status %', v_booking_status;
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
$$;

REVOKE ALL ON FUNCTION public.confirm_booking_payment(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_booking_payment(UUID, TEXT, TEXT) TO service_role;
