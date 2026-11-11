# Migration 018 — Staging Review and Test Plan

## State-transition contract
| Current payment status | Callback | Expected result |
|---|---|---|
| initiated / created / pending / processing | first valid confirmation | set success |
| success, same Razorpay payment ID | replay | idempotent success |
| success, different Razorpay payment ID | replay | reject; no row changes |
| failed / cancelled / refunded | callback | reject; no resurrection |

The payment must have `payment_type = 'booking'` and a non-NULL `booking_id`. The linked booking must exist and be pending or confirmed.

## SQL-level synthetic tests
1. Valid pending booking payment confirms payment and booking atomically.
2. Created/processing payment confirms successfully.
3. Same payment ID replay is safe.
4. Different payment ID replay is rejected without overwriting the original.
5. Membership payment is rejected.
6. NULL booking_id is rejected.
7. Missing payment or booking is rejected.
8. Cancelled/rejected/expired/completed booking is rejected.
9. Failed/cancelled/refunded payment is rejected.
10. Blank/NULL Razorpay payment ID is rejected.
11. Concurrent same-ID callbacks finish in one consistent success state.
12. Concurrent conflicting IDs cannot overwrite the winning ID.

## Application-path tests
- Valid client HMAC calls the RPC; invalid HMAC does not.
- Valid webhook HMAC calls the RPC; invalid webhook HMAC does not.
- Duplicate client/webhook callbacks are idempotent.
- Delayed failure webhook cannot downgrade a successful payment.
- Unknown order/payment cannot confirm an unrelated booking.

## Restore and migration-history gates
- Restore the backup to an isolated database and verify table counts/schema.
- Reconcile missing Supabase migration history against the actual staging schema; never blindly mark historical migrations applied.
- Execute tests only with synthetic staging fixtures. Do not use live customer/payment data.
- SQL and application tests have **not** yet been executed.
