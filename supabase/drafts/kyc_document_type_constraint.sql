-- DRAFT ONLY: review deployed constraint before applying to staging.
begin;
alter table public.verifications drop constraint if exists verifications_doc_type_check;
alter table public.verifications add constraint verifications_doc_type_check check (doc_type in ('pan','driving_license','voter_id'));
commit;
