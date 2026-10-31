# YorBuddy Secure KYC Storage — Implementation Plan

Status: preparation only. This branch is isolated from `main`.
Production Supabase has NOT been changed. No migration has been applied and no deployment has been triggered.

## Confirmed product requirements

- Manual KYC review; DigiLocker is not used.
- User submits one supported identity document: PAN, Driving Licence, or Voter ID.
- A selfie is required.
- Applicant must be at least 18 years old.
- Admin manually approves or rejects; rejection reason is recorded.
- A verified badge is granted only after approval.
- KYC documents must never be publicly accessible.
- Admin document access must be authorized and time-limited.
- Keep only necessary personal data; do not collect/store raw document numbers unless a separately approved legal requirement makes them necessary.

## Current repository findings (read-only audit of main)

- `verifications` table has `doc_type`, `doc_number`, `doc_front_url`, `selfie_url`, status and review metadata.
- Current schema constraint allows `aadhaar`, `pan`, `passport`, `voter_id`; it does not match the approved document list (PAN, Driving Licence, Voter ID).
- Current submission API accepts URL strings, not uploaded file bytes/objects. It accepts Aadhaar, PAN, Passport and Voter ID; no Driving Licence.
- Frontend verification form currently expects document/selfie URLs; it does not provide a secure upload flow.
- No Storage bucket creation/configuration or Storage upload implementation was found in the inspected repository.
- No signed-URL creation flow was found in the inspected repository.
- Admin routes are protected by authentication and the admin role middleware. Admin KYC endpoints exist.
- Admin KYC detail response currently exposes stored document URL fields; this must be changed to return short-lived signed URLs generated server-side, not persistent public URLs.
- Age 18+ enforcement was not found in the inspected KYC submission flow.
- An admin action audit-log implementation for KYC approval/rejection was not found in the inspected files.
- Existing RLS posture for database tables is generally default-deny where RLS is enabled and no policies exist. Storage policies are a separate concern.
- Supabase dashboard screenshots supplied by the owner show no Storage buckets and no Storage policies at the time of inspection. This is a screenshot-based observation, not a live API verification.

## Target architecture

1. Create a private Storage bucket named `kyc-documents` (public = false).
2. Use a backend-only upload endpoint. Validate authentication, ownership, file signature/MIME, extension, maximum size, and allowed formats (JPEG, PNG, PDF for ID; JPEG/PNG for selfie). Generate opaque object paths such as `<user_uuid>/<kyc_uuid>/<random_filename>`; never trust client-supplied paths.
3. Do not expose service-role credentials to the browser. Backend service role is used only server-side.
4. Keep object paths (not public URLs) in the database. Prefer dedicated storage path columns or a backward-compatible migration after checking deployed schema.
5. Provide Admin-only KYC detail endpoint that verifies current admin role and creates very short-lived signed read URLs. Never return signed URLs in public/user-facing status endpoints.
6. Storage access: no public read; no direct browser read. If direct authenticated upload is later chosen, require strict per-user object-prefix policies and test them. Preferred first implementation is backend-mediated upload.
7. Enforce 18+ using a minimal date-of-birth/age-attestation design approved by product/legal review. Avoid retaining full DOB if an age-18+ attestation is sufficient.
8. Restrict document types to PAN, Driving Licence, Voter ID. Do not collect `doc_number`.
9. Add immutable/admin audit events for KYC view, approve, reject, and document access, avoiding document contents or full ID numbers in logs.
10. Define retention/deletion policy and secure deletion for rejected/expired KYC files, subject to legal review.

## Planned implementation sequence

### P0 — secure storage and API
- Add backend storage service using the existing server-side Supabase client.
- Add authenticated KYC upload endpoint with strict validation and per-user object ownership.
- Change KYC submission to accept server-issued object paths/IDs only.
- Add Admin-only signed URL endpoint with short expiry; remove raw object URLs from API responses.
- Add migration draft for storage path fields only if the deployed schema requires it; do not assume migrations have run.
- Keep Storage bucket and policies as dashboard/manual setup instructions until owner explicitly approves Production configuration.

### P0 — product and verification rules
- Align API and UI document choices to PAN, Driving Licence, Voter ID.
- Add 18+ gate before submission.
- Ensure badge is granted only after admin approval and existing email/phone requirements remain intact.
- Ensure users can view status/rejection reason but never retrieve their own or others' raw document URLs through public APIs.

### P1 — auditability and operations
- Add KYC admin action log (view/access/approve/reject).
- Add retention and deletion workflow.
- Add tests for unauthenticated access, non-admin access, cross-user object access, expired signed URLs, invalid file types, oversize files, status transitions, self-approval prevention, and age gate.

## Required validation before any Production action

- Confirm deployed database schema and migration history from the Supabase dashboard; repository migration files alone do not prove deployment state.
- Confirm backend environment uses the correct Supabase project and service-role key without exposing secrets.
- Confirm private bucket and Storage policies in a non-production/staging project first.
- Run backend and frontend tests/builds; inspect generated API responses for accidental URL/PII leakage.
- Obtain explicit owner approval before applying any SQL migration, creating/changing a Production bucket or policy, changing Production secrets, merging to `main`, or deploying.

## Non-goals / safety boundary

This plan does not authorize production changes. Do not apply SQL, create a Production bucket, edit Production policies, upload real identity documents, merge to `main`, or deploy without separate explicit approval.
