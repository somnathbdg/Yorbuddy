-- Disposable schema for atomic booking slot tests. Never run against shared/staging DB.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

DROP TABLE IF EXISTS public.bookings CASCADE;
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  buddy_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  booking_date date NOT NULL,
  booking_time time NOT NULL,
  duration_hours integer NOT NULL DEFAULT 1 CHECK (duration_hours BETWEEN 1 AND 8),
  hourly_rate integer NOT NULL,
  booking_amount integer NOT NULL,
  platform_fee integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  location_name text,
  location_address text,
  special_notes text,
  meet_safety_acknowledged boolean NOT NULL DEFAULT false,
  has_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
