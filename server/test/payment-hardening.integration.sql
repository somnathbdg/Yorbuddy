-- Integration assertions for Migration 020. Run after fixture + migration.
BEGIN;

-- First success and same-ID replay are both accepted.
SELECT public.confirm_booking_payment(
 '10000000-0000-4000-8000-000000000001','pay_same_1','sig_1'
);
SELECT public.confirm_booking_payment(
 '10000000-0000-4000-8000-000000000001','pay_same_1','sig_1'
);

DO $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM public.bookings
   WHERE id='00000000-0000-4000-8000-000000000001';
  IF v_status <> 'confirmed' THEN RAISE EXCEPTION 'booking not confirmed'; END IF;

  -- Successful payment must remain attached to its original booking and Buddy.
  IF (SELECT buddy_id FROM public.bookings
       WHERE id='00000000-0000-4000-8000-000000000001')
     <> 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid THEN
    RAISE EXCEPTION 'payment confirmation changed the booking Buddy mapping';
  END IF;
  IF (SELECT status FROM public.bookings
       WHERE id='00000000-0000-4000-8000-000000000002') <> 'pending' THEN
    RAISE EXCEPTION 'payment confirmation affected an unrelated booking';
  END IF;

  -- Simulate the payment.failed webhook's guarded update. A late failure must
  -- not downgrade a successful payment; a still-created payment may fail.
  UPDATE public.payments SET status='failed'
   WHERE razorpay_order_id='order_test_1'
     AND status IN ('initiated','created','pending','processing');
  IF (SELECT status FROM public.payments
       WHERE id='10000000-0000-4000-8000-000000000001') <> 'success' THEN
    RAISE EXCEPTION 'late payment.failed callback downgraded successful payment';
  END IF;
  UPDATE public.payments SET status='failed'
   WHERE razorpay_order_id='order_test_3'
     AND status IN ('initiated','created','pending','processing');
  IF (SELECT status FROM public.payments
       WHERE id='10000000-0000-4000-8000-000000000003') <> 'failed' THEN
    RAISE EXCEPTION 'payment.failed callback did not update an open payment';
  END IF;

  BEGIN
    PERFORM public.confirm_booking_payment(
      '10000000-0000-4000-8000-000000000002','pay_second_1','sig_2'
    );
    RAISE EXCEPTION 'second successful payment was unexpectedly accepted';
  EXCEPTION WHEN SQLSTATE '23505' THEN
    NULL;
  END;

  SELECT status INTO v_status FROM public.payments
   WHERE id='10000000-0000-4000-8000-000000000002';
  IF v_status <> 'created' THEN RAISE EXCEPTION 'rejected sibling payment changed state'; END IF;

  BEGIN
    PERFORM public.confirm_booking_payment(
      '10000000-0000-4000-8000-000000000003','pay_same_1','sig_3'
    );
    RAISE EXCEPTION 'reused Razorpay payment ID was unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  IF has_function_privilege('anon','public.confirm_booking_payment(uuid,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute payment confirmation';
  END IF;
  IF has_function_privilege('authenticated','public.confirm_booking_payment(uuid,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute payment confirmation';
  END IF;
  IF NOT has_function_privilege('service_role','public.confirm_booking_payment(uuid,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute payment confirmation';
  END IF;

  IF has_function_privilege('anon','public.is_user_verified(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute legacy verification helper';
  END IF;
  IF has_function_privilege('authenticated','public.is_user_verified(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can execute legacy verification helper';
  END IF;
  IF NOT has_function_privilege('service_role','public.is_user_verified(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute legacy verification helper';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='is_user_verified'
       AND p.proconfig @> ARRAY['search_path=pg_catalog, public']
  ) THEN
    RAISE EXCEPTION 'legacy verification helper search_path is not pinned';
  END IF;
END $$;

ROLLBACK;
