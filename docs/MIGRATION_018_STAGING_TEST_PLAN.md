# Migration 018 — Staging Review and Test Plan

## Scope
Migration 018 defines `public.confirm_booking_payment(payment_record_id, razorpay_payment_id, razorpay_signature)`. It must be called only after the backend has independently verified a Razorpay client signature or webhook signature.

## State-transition contract

| Current payment status | Callback | Expected result |
|---|---|---|
| initiated / created / pending / processing | first valid confirmation | set success |
| success, same Razorpay payment ID | replay from client or webhook | idempotent success |
| success, different Razorpay payment ID | any callback | reject; no row changes |
| failed / cancelled / refunded | any callback | reject; no resurrection |
| other / NULL status | any callback | reject |

The linked booking must exist and be pending or already confirmed. The payment must have `payment_type = 'booking'` and a non-NULL `booking_id`.

## Automated / repeatable staging test cases

Run only against a dedicated staging database with synthetic records. Never use real customer payments or production data.

1. Valid pending booking payment: function returns; payment becomes success, payment ID/signature/method are set; booking becomes confirmed.
2. Valid created/processing payment: same expected result.
3. Same payment ID replay: call twice (simulate client then webhook); second call succeeds and rows remain unchanged.
4. Different payment ID replay: second call raises an exception; original successful payment and booking remain unchanged.
5. Non-booking payment type (membership): reject; payment row unchanged.
6. NULL booking_id on a booking payment: reject with explicit missing-booking error.
7. Missing payment record: reject.
8. Missing booking row: reject.
9. Cancelled, rejected, expired or completed booking: reject and do not mark payment successful.
10. Failed, cancelled or refunded payment: reject and do not change payment or booking.
11. Blank/NULL Razorpay payment ID: reject.
12. Concurrent duplicate callback: two sessions call with the same payment ID; both must complete safely and final state must be one success + one confirmed booking.
13. Concurrent conflicting payment IDs: only one may win; the other must fail and must not overwrite the winning ID.

## Application-path tests still required

- Client verification: valid HMAC -> RPC called once; repeated valid request returns existing success without creating a second state transition; invalid HMAC -> RPC not called.
- Webhook: valid webhook signature and payment.captured/order.paid -> RPC called; replay of same event is safe; invalid webhook signature -> RPC not called.
- Client callback and webhook arriving together -> final state remains consistent.
- Webhook for unknown order -> acknowledged/handled according to the existing operational policy without confirming another payment.
- A payment already marked failed must not be resurrected by a delayed capture callback; route to reconciliation/refund/manual review instead.

## Review notes / limitations

- The SQL function is atomic within the PostgreSQL transaction and locks the payment row, then the booking row.
- This function does not verify Razorpay HMAC itself. The caller must authenticate the callback first.
- The SQL-level test cases above have not yet been executed. Run them on staging with isolated fixtures before marking this migration validated.
- Confirm migration tracking drift first: the connected `yorbuddy-dev` project returned an empty migration history despite existing application tables. Do not blindly mark prior migrations as applied or run a consolidated setup script.
- Keep the dump backup in a safe location and verify it can be restored before any staging DDL.
