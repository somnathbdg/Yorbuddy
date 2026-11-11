# Migration 018 — Main-branch preparation

Status: **PREPARED, NOT RELEASE-READY**

This branch is based directly on `main` and isolates Migration 018 from the unrelated 132-commit feature branch.

## Included
- Supabase migration: `supabase/migrations/018_atomic_booking_payment_confirmation.sql`
- Backend migration mirror: `server/src/db/migrations/018_atomic_booking_payment_confirmation.sql`
- Staging test plan: `docs/MIGRATION_018_STAGING_TEST_PLAN.md`

## Mandatory gates before merge or deployment
1. Integrate the RPC into `server/src/services/paymentService.ts` for both client verification and verified webhook handling. Remove the current non-atomic direct payment/booking updates.
2. Ensure the webhook failure path cannot overwrite a previously successful payment with `failed`; add race/order tests for delayed events.
3. Add automated SQL and application integration tests for valid confirmation, same-ID replay, conflicting ID, non-booking payment, missing booking, terminal payment/booking states, invalid signatures, and concurrent callbacks.
4. Restore the staging backup into an isolated target and verify the restore before staging DDL.
5. Reconcile the missing migration history in `yorbuddy-dev` against the actual schema. Do not fabricate history or blindly replay migrations.
6. Run CI/build/type checks and the full synthetic staging test suite; capture results.
7. Verify function privileges: PUBLIC/anon/authenticated cannot execute; service_role can execute. Verify payment and booking state transitions after tests.
8. Obtain explicit release approval, then merge via reviewed PR. Do not deploy this branch directly.

## Safety
- No production database or production branch changes are made by this preparation branch.
- The SQL function does not verify Razorpay HMAC. Only authenticated backend code may call it.
- Migration 018 has not been applied to staging or production.
