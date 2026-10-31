-- DRAFT ONLY — DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT OWNER APPROVAL.
-- Align the existing verifications.doc_type CHECK constraint with the approved
-- product options. Review the deployed constraint and migration history first.
--
-- Current intended values: PAN, Driving Licence, Voter ID.
-- No document numbers are collected by the updated API.

begin;

alter table public.verifications
  drop constraint if exists verifications_doc_type_check;

alter table public.verifications
  add constraint verifications_doc_type_check
  check (doc_type in ('pan', 'driving_license', 'voter_id'));

commit;

-- After applying in a staging project, test inserts for all three values and
-- verify that aadhaar/passport are rejected. Do not apply until the deployed
-- schema is confirmed and a backup/rollback plan exists.
