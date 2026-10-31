-- YorBuddy: enforce one account per normalized Indian mobile number.
-- Apply ONLY to the staging Supabase project after reviewing the preflight query.
-- Existing phone values are normalized to 10 digits (e.g. +91XXXXXXXXXX -> XXXXXXXXXX).
-- The migration aborts without changes if existing rows collide after normalization.

CREATE OR REPLACE FUNCTION public.yorbuddy_normalize_indian_phone(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN length(digits) = 12 AND left(digits, 2) = '91' THEN right(digits, 10)
    WHEN length(digits) = 11 AND left(digits, 1) = '0' THEN right(digits, 10)
    WHEN length(digits) = 10 THEN digits
    ELSE NULL
  END
  FROM (SELECT regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g') AS digits) normalized;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.users
    WHERE phone IS NOT NULL
      AND public.yorbuddy_normalize_indian_phone(phone) IS NOT NULL
    GROUP BY public.yorbuddy_normalize_indian_phone(phone)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Phone normalization conflict: multiple users share the same Indian mobile number. Review duplicates before applying this migration.';
  END IF;
END;
$$;

UPDATE public.users
SET phone = public.yorbuddy_normalize_indian_phone(phone)
WHERE phone IS NOT NULL
  AND public.yorbuddy_normalize_indian_phone(phone) IS NOT NULL
  AND phone IS DISTINCT FROM public.yorbuddy_normalize_indian_phone(phone);

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_normalized_unique_idx
  ON public.users (public.yorbuddy_normalize_indian_phone(phone))
  WHERE phone IS NOT NULL
    AND public.yorbuddy_normalize_indian_phone(phone) IS NOT NULL;

COMMENT ON INDEX public.users_phone_normalized_unique_idx IS
  'Prevents duplicate YorBuddy accounts using equivalent Indian mobile number formats.';
