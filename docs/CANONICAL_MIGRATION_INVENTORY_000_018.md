# YorBuddy Canonical Migration Inventory (000–018)

**Inventory target:** `yorbuddy-dev` (Supabase project ref `iecqqwqpqfubjpssokvc`, region `ap-southeast-1`)
**Source ref:** `release/migration-018-main-prep`
**Source commit inspected:** `d6c780c65b37d2ed4fe9453fa31f2de041318dd3`
**Inspection date:** 2026-11-11
**Database method:** read-only catalog queries; no DDL, DML, migration apply, restore, or migration-ledger writes.

## Hash convention

The checksum column records the **Git blob object ID (SHA-1)** for the exact file bytes at the inspected commit. It is not a SHA-256 digest. Identical SHA values mean the two paths contain byte-identical files. No migration ledger entry is inferred from a matching schema object.

## Version inventory

| Version | Source path(s) | Git blob SHA-1 | Purpose / principal objects | Declared prerequisites | Staging evidence |
|---|---|---|---|---|---|
| 000 | `supabase/migrations/000_initial_schema.sql`; mirrored baseline `server/src/db/schema.sql` (not numbered migration) | `fa5ebb1e9d45fc951a3bcfde049fc2b2416c2bc1` | Initial application schema: users, profiles, buddy_profiles, activities, bookings, messages, reviews, payments, verifications, reports, notifications, favorites; base indexes, RLS enablement, updated_at helper, seed activities | Empty database / intended initial bootstrap | **Present in part:** all listed core tables exist; core indexes and RLS are present. This proves schema objects exist, not that this file was executed. |
| 001 | `supabase/migrations/001_add_auth_password.sql`; `server/src/db/migrations/001_add_auth_password.sql` | `79697067609912da9ceed8659c63e9fed481ce85` | `users.password_hash`, nullable phone, `idx_users_email`, `refresh_tokens` + indexes + RLS | Version 000 / users table | **Present:** password_hash, email index, refresh_tokens and its indexes exist. |
| 002 | `supabase/migrations/002_fix_payments_status_check.sql`; backend mirror | `7c6343abeb5d48dd43a37bf80752038a82f3d478` | Replaces payments status CHECK with initiated/created/pending/processing/success/failed/refunded/cancelled | Base payments table | **Present:** payments status constraint was previously inspected and includes these states. |
| 003 | `supabase/migrations/003_add_razorpay_signature.sql`; backend mirror | `e59539b5dcd8c84d58da5876d3576b70a2382b0f` | `payments.razorpay_signature` | Base payments table | **Present:** column exists. |
| 004 | `server/src/db/migrations/004_add_verification_columns.sql` | `858d78650e87e74febaa6acb65e73d3ffdf1ad05` | Email/phone verification timestamps, KYC status migration/check, indexes, `is_user_verified` helper | Base schema with users and verifications; file describes Step 1–7 baseline | **Present in part:** timestamps and helper exist. |
| 004 (duplicate ID) | `server/src/db/migrations/004_verification_kyc.sql` | `11fd25e3003d6c9bdcdb520f949311643429965d` | Alternate KYC status and profile verification updates; defines SECURITY DEFINER helper | Base users/verifications/profiles | **Ambiguous:** same version number as prior file; no canonical ordering. Do not run both blindly. |
| 005 | `supabase/migrations/005_kyc_verification_final.sql`; backend mirror | `0a1063da35844c7c4ab1ab17839c483d6e6e0791` | Final KYC status normalization, timestamps, indexes, `is_user_verified` | Explicitly: base `schema.sql`, migrations 001–003; verifications table must already exist | **Present in part:** timestamps/helper exist. Exact constraint and function security attributes require further definition-level comparison. |
| 006 | `supabase/migrations/006_duplicate_booking_protection.sql`; backend mirror | `6a509bc956944f1917f27b0cd895bc7ed2db75d8` | Partial unique index `idx_booking_no_duplicate_active` on user/buddy/date/time for pending/confirmed | Base bookings table | **Present:** index exists. |
| 007 | `supabase/migrations/007_password_reset_tokens.sql`; backend mirror | `389ffb5c4689030899d3ff298c168a4d25504611` | `password_reset_tokens` table and indexes | Base users table | **Present:** table and expected indexes exist. |
| 008 | `supabase/migrations/008_verification_codes.sql`; backend mirror | `e38cfdff2e6a96bc0ef34ad26267bad6bc82637c` | `verification_codes` table and expiry/key indexes | Base schema / UUID support | **Present:** table and expected indexes exist. |
| 009 | `supabase/migrations/009_add_booking_expiry.sql`; backend mirror differs by Git blob ID | Supabase: `a35bd59f2749d1a08d78bd2d93cf4902e7b1ff7b`; backend: `0e593244bcb4a8466ce140e1fd05a78aba4d4511` | `bookings.expires_at`, `updated_at`, status includes expired, expiry index, update trigger, pending-row backfill | Explicitly: base schema; migrations 001–008; `update_updated_at_column()` | **Present in part:** columns, index and trigger exist. The backfill's historical effect cannot be established from current schema metadata. |
| 010 | `supabase/migrations/010_add_free_trial.sql`; backend mirror | `96dd24bb8cb0cdac2fcd650ce9296a4f9f8c5bd8` | Code adds `users.free_trial_used` and `idx_users_free_trial_used`. Header also claims a `free_trial_memberships` view, but the SQL body does not create it. | Explicitly: base schema; migrations 001–009 | **Not present:** `users.free_trial_used` and `idx_users_free_trial_used` are absent. This is a concrete mismatch requiring reconciliation. |
| 011 | `supabase/migrations/011_create_memberships_table.sql`; backend mirror differs by Git blob ID | Supabase: `74f74b845092dc61fda206d3a36dc71ce0f082e5`; backend: `b7b5de96a5c7cfc8a447e2daeddaca381fda0dc5` | `memberships`, indexes, RLS, updated_at trigger | Explicitly: base schema; migrations 001–010; helper function | **Present in part:** table and indexes exist; RLS enabled. Exact table definition and trigger need full definition comparison. |
| 012 | `supabase/migrations/012_rls_hardening_token_and_activities_tables.sql` only | `b6f6d8a7199882495d68c9973ba96ebb646a1686` | Enables RLS and revokes anon/authenticated table grants on activities, password_reset_tokens, verification_codes; creates no policies | Those three tables must exist (from baseline/007/008) | **Present in part:** RLS is enabled on all three. No policies found for payments/bookings; full policy/grant posture must be reviewed separately. |
| 013 | `server/src/db/migrations/013_add_google_id.sql` only | `29f90fd373487af0e632f5db089fd65a52e77280` | `users.google_id` and unique lookup index | Base users table | **Not present:** column and index are absent. |
| 014 | `server/src/db/migrations/014_one_free_access_per_user.sql` only | `94ac58caa566a51102ae62e3e15715695797abdf` | Partial unique index `idx_memberships_one_free_access` for one FREE_ACCESS_10D grant per user | Explicitly: base schema + migrations 001–013; memberships table from 011 | **Index present**, but prerequisite 013's google_id is absent and 010's free_trial column is absent. This indicates schema history is not a simple linear replay. |
| 015 | No file in either migration directory | — | No source migration located | Unknown | **No evidence / no source.** |
| 016 | No file in either migration directory | — | No source migration located | Unknown | **No evidence / no source.** |
| 017 | No file in either migration directory | — | No source migration located | Unknown | **No evidence / no source.** |
| 018 | `supabase/migrations/018_atomic_booking_payment_confirmation.sql`; backend mirror | `b156503f4928f821e0c231caf96c422d8c39d0e6` | `public.confirm_booking_payment(UUID,TEXT,TEXT)`; row locks; atomic payment + booking confirmation; PUBLIC revoke and service_role execute grant | Existing payments/bookings tables with required columns/statuses; caller must validate Razorpay signature before RPC | **Absent:** function not found in staging. Migration has not been applied. |

## Source consistency findings

1. Supabase migrations are numbered 000–012, then jump to 018. Versions 013–017 are absent from that directory.
2. Backend migration directory starts at 001, has two different files numbered 004, includes 013 and 014, then jumps to 018.
3. Version 009 and 011 backend/Supabase mirrors are not byte-identical (different Git blob IDs); review semantic diffs before treating them as equivalent.
4. Version 004 is ambiguous: two different SQL files share the same version. The 004 alternate file defines a SECURITY DEFINER helper; the later 005 file describes a read-only helper. Function security/search_path/EXECUTE grants need an explicit canonical decision.
5. Version 010 header says it creates a view, but its SQL body only adds a user column and partial index.
6. Version 014 claims prerequisite 001–013, but live staging does not have the 013 google_id column/index. Its own partial index does exist.
7. `supabase_migrations.schema_migrations` was not found and Supabase migration listing returned an empty list. Do not fabricate applied versions.

## Staging schema evidence snapshot

Read-only catalog inspection confirms:
- All 16 core tables from the initial schema plus refresh_tokens, password_reset_tokens, verification_codes and memberships exist.
- `users.password_hash`, `users.email_verified_at`, `users.phone_verified_at`, `payments.razorpay_signature`, `bookings.expires_at`, `bookings.updated_at` exist.
- `users.free_trial_used`, `users.google_id`, `idx_users_free_trial_used`, `idx_users_google_id` are absent.
- `idx_booking_no_duplicate_active`, `idx_bookings_expires_at`, `idx_memberships_one_free_access`, `idx_users_email` exist.
- `update_updated_at_column()` and `is_user_verified` exist; `confirm_booking_payment` does not.
- RLS is enabled on all 16 checked application tables. The 16-table snapshot includes memberships and the token tables. RLS enabled does not by itself prove grants or policies are correct.
- Payments and bookings currently have zero rows (prior read-only count); do not infer that other tables are empty.

## Baseline decision

**Decision: NO SAFE AUTOMATIC BASELINE YET. Do not apply or mark any migration as applied.**

The live schema is a hybrid state: many objects from versions 000–014 exist, but expected objects from 010 and 013 are missing while 014's index exists. This may reflect manual DDL, partial migration execution, schema drift, or a different deployment lineage. The available evidence cannot distinguish those histories.

### Required next gates (all read-only until separately approved)
1. Capture exact definitions for every relevant table, constraint, index, trigger, function, RLS flag, policy, and grants; compare against all source SQL including 009/011 mirror diffs and both 004 files.
2. Inspect function definitions/security attributes for `is_user_verified` and `update_updated_at_column`; verify role grants on relevant tables/functions.
3. Resolve version 004 into one canonical migration (do not execute either duplicate until selected).
4. Decide whether 010 and 013 should be restored as forward-only corrective migrations, or whether the application no longer requires those objects. Do not blindly replay their original SQL.
5. Decide whether 015–017 are intentionally retired, lost, or represented by unnumbered/manual SQL; search all branches/history before inventing replacement versions.
6. Compare current schema against the selected canonical baseline and prepare a reviewed **forward-only reconciliation migration** only after the comparison is complete.
7. Only after the above and a verified isolated restore (not performed per current instruction) should staging DDL be considered.

**Safety state:** no schema/data changes, no migration history writes, no backup restore, no production action, no PR merge.
