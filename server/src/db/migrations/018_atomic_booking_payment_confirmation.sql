-- Migration 018: atomically confirm a booking and its successful payment.
-- Called by the backend after Razorpay signature verification or a verified webhook.
-- Idempotency policy:
--   * success + same Razorpay payment ID: safe replay; booking remains/turns confirmed.
--   * success + different payment ID: reject.
--   * failed/cancelled/refunded (or any unknown state): reject; never resurrect a payment.
--   * only initiated/created/pending/processing may transition to success.
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
  v_payment_type TEXT;
  v_payment_status TEXT;
  v_existing_payment_id TEXT;
  v_booking_status TEXT;
  v_rows INTEGER;
BEGIN
  IF p_payment_record_id IS NULL THEN
    RAISE EXCEPTION 'Payment confirmation requires a payment record ID'
      USING ERRCODE = '22023';
  END IF;

  IF p_razorpay_payment_id IS NULL OR length(btrim(p_razorpay_payment_id)) = 0 THEN
    RAISE EXCEPTION 'Payment confirmation requires a Razorpay payment ID'
      USING ERRCODE = '22023';
  END IF;

  -- Lock the payment first so concurrent webhook/client callbacks serialize.
  SELECT booking_id, payment_type, status, razorpay_payment_id
    INTO v_booking_id, v_payment_type, v_payment_status, v_existing_payment_id
    FROM public.payments
   WHERE id = p_payment_record_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_payment_type IS DISTINCT FROM 'booking' THEN
    RAISE EXCEPTION 'Payment record is not a booking payment'
      USING ERRCODE = '22023';
  END IF;

  IF v_booking_id IS NULL THEN
    RAISE EXCEPTION 'Booking payment is missing its booking_id'
      USING ERRCODE = '23502';
  END IF;

  -- A successful callback may be replayed only for the same Razorpay payment.
  IF v_payment_status = 'success' THEN
    IF v_existing_payment_id IS DISTINCT FROM p_razorpay_payment_id THEN
      RAISE EXCEPTION 'Payment record is already successful with a different Razorpay payment ID'
        USING ERRCODE = '23505';
    END IF;
  ELSIF v_payment_status NOT IN ('initiated', 'created', 'pending', 'processing') THEN
    -- In particular, failed/cancelled/refunded records cannot be resurrected.
    RAISE EXCEPTION 'Payment cannot transition to success from status %', v_payment_status
      USING ERRCODE = '22023';
  END IF;

  SELECT status
    INTO v_booking_status
    FROM public.bookings
   WHERE id = v_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking associated with payment was not found'
      USING ERRCODE = 'P0002';
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
$$;

REVOKE ALL ON FUNCTION public.confirm_booking_payment(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_booking_payment(UUID, TEXT, TEXT) TO service_role;
