-- Disposable PostgreSQL fixture for migration 022 integration tests.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.buddy_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id),
  verification_status text NOT NULL DEFAULT 'pending',
  is_verified boolean NOT NULL DEFAULT false,
  is_online boolean NOT NULL DEFAULT false
);
CREATE TABLE public.refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  revoked_at timestamptz
);
