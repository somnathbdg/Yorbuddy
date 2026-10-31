-- DRAFT ONLY — DO NOT RUN AGAINST PRODUCTION WITHOUT OWNER APPROVAL.
-- YorBuddy private KYC Storage setup.
-- Intended for a staging project first. This file is deliberately outside
-- supabase/migrations/ so it cannot be mistaken for an applied migration.
--
-- Design: backend-mediated uploads/downloads only. The browser must never
-- receive the Supabase service-role key. No anon/authenticated Storage policies
-- are created; service_role performs server-side object operations.

begin;

-- Create the private bucket. ON CONFLICT updates only the intended bucket
-- properties; review the existing bucket manually before applying anywhere.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc-documents',
  'kyc-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Intentionally create NO policies on storage.objects.
-- With RLS enabled and no policies, anon/authenticated cannot access objects.
-- Backend service_role access is server-side only and bypasses RLS.

commit;

-- Post-setup verification (run manually in SQL Editor only after approval):
-- select id, name, public, file_size_limit, allowed_mime_types
-- from storage.buckets where id = 'kyc-documents';
--
-- Expected: exactly one row; public = false; size limit = 5242880.
--
-- Also inspect Storage > Policies: no anon/authenticated policies for this bucket.
-- Do not upload real KYC documents until the upload API, signed URL endpoint,
-- authorization tests, retention policy, and privacy notice are complete.
