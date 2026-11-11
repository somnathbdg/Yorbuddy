# YorBuddy: Detailed Migration Diff, Live Schema Reconciliation & Forward-Only Staging Baseline

Target: yorbuddy-dev (project iecqqwqpqfubjpssokvc, ap-southeast-1)
Source: release/migration-018-main-prep
Code commit inspected: d6c780c65b37d2ed4fe9453fa31f2de041318dd3
Inspection date: 2026-11-11
Mode: read-only. No DDL/DML, migration ledger changes, restore, or deployment.

---

## 1. Detailed SQL comparison

### 1.1 Version 004: duplicate version, different semantics

Files:
- server/src/db/migrations/004_add_verification_columns.sql — Git blob SHA-1 858d78650e87e74febaa6acb65e73d3ffdf1ad05
- server/src/db/migrations/004_verification_kyc.sql — Git blob SHA-1 11fd25e3003d6c9bdcdb520f949311643429965d

| SQL area | 004_add_verification_columns | 004_verification_kyc | Impact |
|---|---|---|---|
| users timestamps | Adds email_verified_at and phone_verified_at IF NOT EXISTS | Same | Equivalent |
| indexes | Adds users email/phone partial indexes and verifications(user_id,status) | Same | Equivalent |
| KYC data conversion | Updates status='verified' rows to 'approved' before constraint change | No conversion | Material difference; second file can fail when legacy verified rows exist |
| verifications CHECK | not_submitted, pending, approved, rejected | Same | Equivalent DDL, but second file has no preceding data conversion |
| RLS | Does not change RLS | Explicitly enables RLS on users | Material difference; enabling RLS without policies can block direct client access |
| helper | SECURITY DEFINER, read-only logic | SECURITY DEFINER, same logic | Logic materially equivalent |
| search_path | Not pinned | Not pinned | Security hardening required |
| EXECUTE ACL | No explicit revoke/grant | No explicit revoke/grant | Default PUBLIC EXECUTE remains unless later changed |

Canonical choice: neither 004 file should be replayed as-is. Treat version 004 as a historical collision. Timestamp/index/check logic is already reflected in staging. Preserve the live KYC constraint. Do not run a data update merely to make a migration appear applied. Harden the SECURITY DEFINER helper separately after reviewing callers and intended roles.

The files are not interchangeable. The first has a data conversion; the second toggles users RLS. Reconstruct one canonical desired-state migration; do not choose by filename alone.

### 1.2 Version 009: Supabase and backend copies

- Supabase blob: a35bd59f2749d1a08d78bd2d93cf4902e7b1ff7b
- Backend blob: 0e593244bcb4a8466ce140e1fd05a78aba4d4511

Shared operations:
- Add bookings.expires_at if absent.
- Add bookings.updated_at NOT NULL DEFAULT NOW() if absent.
- Replace bookings_status_check to include expired.
- Add partial idx_bookings_expires_at for pending bookings.
- Install updated_at trigger.
- Backfill pending rows with created_at + 30 minutes.

Difference: Supabase copy uses DROP TRIGGER IF EXISTS followed by CREATE TRIGGER. Backend copy uses CREATE TRIGGER IF NOT EXISTS. PostgreSQL does not support CREATE TRIGGER IF NOT EXISTS in the syntax used here. The backend copy is not executable as written on PostgreSQL.

Live evidence: expires_at and updated_at columns exist; expected partial expiry index exists; update_bookings_updated_at trigger exists; status CHECK includes expired. Do not replay 009. Historical backfill cannot be proven from catalog metadata and must not be repeated blindly: it could assign expiry timestamps to pending rows.

Canonical choice: use the Supabase drop/create trigger pattern only for a future corrective migration if the trigger definition is proven wrong. Do not repeat the backfill without row-level business review.

### 1.3 Version 011: Supabase and backend copies

- Supabase blob: 74f74b845092dc61fda206d3a36dc71ce0f082e5
- Backend blob: b7b5de96a5c7cfc8a447e2daeddaca381fda0dc5

Shared table definition, indexes, RLS enablement, and trigger target are semantically the same:
- memberships.id UUID primary key
- user_id FK users(id) ON DELETE CASCADE
- plan_id, amount, currency default INR
- Razorpay order/payment/signature fields
- status default created with created/success/failed/cancelled CHECK
- membership dates and created_at/updated_at
- indexes on user_id+created_at DESC, status, plan_id
- RLS enabled
- update_updated_at_column() BEFORE UPDATE trigger

Difference: Supabase copy uses DROP TRIGGER IF EXISTS followed by CREATE TRIGGER; backend copy uses CREATE TRIGGER IF NOT EXISTS. The latter is unsupported by PostgreSQL.

Live evidence: memberships table, PK, user FK, status CHECK, and three ordinary indexes exist. Additional partial unique index idx_memberships_one_free_access exists. RLS is enabled. update_memberships_updated_at trigger exists.

Canonical choice: table and trigger already exist; do not replay 011. Retain the live extra partial unique index. If trigger definition needs repair, use drop/create only in a separately reviewed forward migration.

---

## 2. Live staging schema reconciliation

### 2.1 Constraints

Exact definitions observed from pg_constraint:

| Table | Constraint | Live definition / finding |
|---|---|---|
| bookings | bookings_status_check | pending, confirmed, completed, cancelled, rejected, expired |
| bookings | bookings_booking_code_key | UNIQUE (booking_code) |
| bookings | bookings_activity_id_fkey | activity_id → activities(id) |
| bookings | bookings_buddy_id_fkey | buddy_id → users(id) |
| bookings | bookings_user_id_fkey | user_id → users(id) |
| bookings | bookings_pkey | PRIMARY KEY (id) |
| payments | payments_payment_type_check | membership, booking |
| payments | payments_status_check | initiated, created, pending, processing, success, failed, refunded, cancelled |
| payments | payments_booking_id_fkey | booking_id → bookings(id) |
| payments | payments_user_id_fkey | user_id → users(id) |
| payments | payments_pkey | PRIMARY KEY (id) |
| verifications | verifications_status_check | not_submitted, pending, approved, rejected |
| verifications | verifications_doc_type_check | pan, driving_license, voter_id |
| verifications | verifications_user_id_fkey | user_id → users(id) |
| verifications | verifications_reviewed_by_fkey | reviewed_by → users(id) |
| memberships | memberships_status_check | created, success, failed, cancelled |
| memberships | memberships_user_id_fkey | user_id → users(id), ON DELETE CASCADE |
| profiles | profiles_user_id_fkey | user_id → users(id), ON DELETE CASCADE |
| refresh_tokens | refresh_tokens_user_id_fkey | user_id → users(id), ON DELETE CASCADE |
| password_reset_tokens | password_reset_tokens_user_id_fkey | user_id → users(id), ON DELETE CASCADE |

### 2.2 Indexes

Relevant live definitions:
- idx_booking_no_duplicate_active: UNIQUE (user_id,buddy_id,booking_date,booking_time) WHERE status IN (pending,confirmed).
- idx_bookings_expires_at: (expires_at) WHERE status='pending'.
- idx_memberships_user: (user_id,created_at DESC).
- idx_memberships_status: (status).
- idx_memberships_plan: (plan_id).
- idx_memberships_one_free_access: UNIQUE (user_id) WHERE plan_id='FREE_ACCESS_10D'.
- idx_users_email_verified and idx_users_phone_verified: partial timestamp indexes.
- idx_verifications_user_status: (user_id,status).
- idx_users_email, refresh token indexes, password reset token indexes, verification code indexes.
- Payments indexes: idx_payments_booking, idx_payments_razorpay, idx_payments_user.

No need to recreate these indexes based on current evidence.

### 2.3 Functions and security

| Function | Live definition / attributes | ACL evidence |
|---|---|---|
| public.is_user_verified(uuid) | PL/pgSQL, SECURITY DEFINER, no pinned search_path (proconfig NULL) | anon=true, authenticated=true, service_role=true for EXECUTE |
| public.update_updated_at_column() | PL/pgSQL trigger function, SECURITY INVOKER | anon/authenticated/service_role EXECUTE true |
| public.confirm_booking_payment(uuid,text,text) | Not present | No ACL to inspect |

High-priority finding: is_user_verified runs with definer privileges, has no fixed search_path and is executable by anon/authenticated. Its body reads users and verifications for a caller-supplied UUID. This may expose a cross-user verification boolean and makes search_path hardening important. Do not simply revoke all access until code/RLS callers are checked. Decide whether it should be service-role-only or redesigned as SECURITY INVOKER with an explicit auth.uid() check.

The trigger helper being executable by API roles is not by itself proof of a vulnerability: trigger functions cannot normally be invoked as ordinary scalar RPCs. Still, ACL can be narrowed in a controlled change if no external caller needs it.

### 2.4 Triggers

Live triggers:
- bookings.update_bookings_updated_at: BEFORE UPDATE → update_updated_at_column().
- memberships.update_memberships_updated_at: BEFORE UPDATE → update_updated_at_column().
- users.update_users_updated_at: BEFORE UPDATE → update_updated_at_column().

No trigger was returned for profiles or verifications. This is not a discrepancy against 009/011; those migrations do not create triggers on those tables.

### 2.5 RLS and policies

- RLS enabled on the 16 checked application tables: activities, bookings, buddy_profiles, favorites, memberships, messages, notifications, password_reset_tokens, payments, profiles, refresh_tokens, reports, reviews, users, verification_codes, verifications.
- relforcerowsecurity=false for the checked tables.
- pg_policies returned zero policies for schema public.
- Role grants query shows postgres owner privileges and service_role privileges; anon/authenticated entries on several tables show only REFERENCES/TRIGGER/TRUNCATE, not ordinary SELECT/INSERT/UPDATE/DELETE. This is consistent with restricted direct table access, but must be checked against actual API usage before changes.
- RLS enabled with no policies means ordinary anon/authenticated table queries are denied by RLS even if table grants were later added. service_role bypasses RLS by design; never put its key in a client.

No policies is not automatically a defect if all application data access is through the trusted backend using service_role. Verify architecture before introducing policies. Broad policies could expose private user, KYC, payment or token data.

### 2.6 Missing and drifted objects

Confirmed missing:
- users.free_trial_used
- idx_users_free_trial_used
- users.google_id
- idx_users_google_id
- public.confirm_booking_payment(uuid,text,text)

Confirmed present:
- memberships and idx_memberships_one_free_access
- users.email_verified_at, users.phone_verified_at
- payments.razorpay_signature
- bookings.expires_at, bookings.updated_at
- is_user_verified and update_updated_at_column

The absence of free_trial_used is not necessarily an application bug: inspect current application code and product decision before adding it. The same applies to google_id; OAuth may store provider identity elsewhere. Do not add columns solely to match old migrations.

---

## 3. Proposed forward-only staging baseline

### Decision: a new reconciliation migration is safer than replaying 000–018

Suggested filename after approval and version allocation:
supabase/migrations/019_staging_schema_reconciliation.sql

This is a proposal only, not an approved executable migration. Allocate version 019 only after searching all branches/tags and production history for later versions.

### Phase A — preflight assertions (read-only)

1. Assert target project ref is the intended staging project.
2. Assert expected tables and columns exist.
3. Assert verifications_status_check, bookings_status_check, and payments_status_check match expected values.
4. Assert expected indexes/triggers exist and match definitions.
5. Assert no duplicate index names with different definitions.
6. Record table row counts and pending booking counts; do not mutate rows.
7. Abort if any precondition differs. No automatic repair on unexpected state.

### Phase B — decide whether missing legacy objects are still required

- 010 free_trial_used: do not add until code search confirms current runtime reads/writes it. If required, add as nullable/default-safe boolean in a new forward migration; do not backfill without product semantics. Add partial index only if the query pattern needs it.
- 013 google_id: do not add until OAuth implementation and current user identity schema are checked. If needed, add nullable TEXT; unique index only after duplicate/normalization review. Do not overwrite or merge identity records.
- 018 payment RPC: before applying, verify backend validates Razorpay HMAC before RPC, role execution is restricted, function has pinned search_path, and integration tests cover real Postgres locking/idempotency/terminal-state behavior. Do not apply before those gates.

### Phase C — harden function separately

Prepare a dedicated reviewed change for is_user_verified:
- Confirm all SQL/RLS/backend callers.
- Prefer a design that cannot let a caller-supplied arbitrary UUID query another user's verification state, unless explicitly required for trusted server use.
- If SECURITY DEFINER remains necessary, set a fixed safe search_path and schema-qualify referenced tables/functions.
- Revoke default PUBLIC/anon/authenticated EXECUTE and grant only to minimum required role(s).
- Add tests for anon, authenticated self, authenticated other-user, and service_role.
- Do not change this function in the reconciliation migration without explicit authorization and caller compatibility review.

### Phase D — ledger/baseline strategy

The staging migration ledger is absent/unavailable and Supabase migration listing returned empty. Do not bulk mark historical migrations 000–018 as applied based on object presence.

Recommended:
1. Create a schema-only baseline snapshot from the actual staging schema after review, with a manifest explaining that it is a reconciled snapshot, not proof of historical execution.
2. For existing staging, record a reviewed baseline/adoption procedure only after exact diff and backup restore test. If using Supabase CLI repair/adoption, generate and review exact commands for the project and verify expected ledger state first. Never run repair --status applied across all versions automatically.
3. Keep future changes forward-only and versioned. Do not edit historical 000–018 files to pretend they match staging.
4. Test baseline on an isolated restored copy before staging DDL. The user has explicitly deferred restore; this gate remains outstanding.

### Phase E — validation gates before staging DDL

- Isolated backup restore completed and verified.
- Full schema diff reviewed.
- Current backend code checked for free_trial_used and google_id usage.
- Migration 018 SQL integration and concurrency tests pass against PostgreSQL.
- Security review approves function ACL/search_path and RLS architecture.
- Backup and rollback plan documented.
- Explicit approval to apply new staging migration.

## Final status

No safe migration should be applied yet. Live staging already contains most 000–014 objects, but the ledger is missing, some expected legacy objects are absent, and source copies contain PostgreSQL syntax defects. A new forward-only reconciliation is the right shape, but exact DDL depends on current application usage and a verified schema diff.

No database changes, data changes, migration ledger writes, backup restore, PR merge, or deployment were performed during this review.
