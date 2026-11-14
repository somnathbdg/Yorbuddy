-- Disposable PostgreSQL fixture for Migration 020 integration tests.
-- Run ONLY in a throwaway database; this file drops public test tables.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY,
  status text NOT NULL,
  buddy_id uuid NOT NULL
);
CREATE TABLE public.payments (
  id uuid PRIMARY KEY,
  booking_id uuid REFERENCES public.bookings(id),
  payment_type text NOT NULL,
  status text NOT NULL,
  razorpay_payment_id text,
  razorpay_signature text,
  payment_method text,
  razorpay_order_id text
);

INSERT INTO public.bookings(id,status,buddy_id) VALUES
 ('00000000-0000-4000-8000-000000000001','pending','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
 ('00000000-0000-4000-8000-000000000002','pending','ffffffff-ffff-4fff-8fff-ffffffffffff');

INSERT INTO public.payments(id,booking_id,payment_type,status,razorpay_order_id) VALUES
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','booking','created','order_test_1'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','booking','created','order_test_2'),
 ('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','booking','created','order_test_3');

-- Simulate the legacy helper created by historical verification migrations.
CREATE OR REPLACE FUNCTION public.is_user_verified(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$ SELECT false $$;
