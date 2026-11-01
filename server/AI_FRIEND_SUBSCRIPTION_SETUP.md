# AI Friend subscription and trial

AI Friend access is independent of the existing human Buddy membership plans.

| Plan | Amount | Duration |
| --- | ---: | ---: |
| Free Trial | ₹0 | 24 hours |
| 1 Day | ₹49 | 24 hours |
| 1 Week | ₹299 | 7 days |
| 1 Month | ₹499 | 30 days |

## Apply database migration

Run `server/src/db/migrations/015_ai_friend_subscriptions.sql` in the Supabase SQL Editor before deploying the backend. The partial unique index `idx_ai_friend_trial_once_per_phone` is the race-safe database guard: a verified phone hash can have only one FREE_TRIAL_1D record, including expired trials. The table stores a SHA-256 phone hash, not the phone number.

## Backend configuration

Use the existing server-side `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for paid AI Friend plans. Do not expose the key secret to the browser.

## Automated unit tests

From the `server` directory:

```bash
npm run test:ai-friend
```

These tests cover plan amounts/durations, invalid plan IDs, exact 24-hour expiry, one-time trial state, normalized phone hashing, and active/expired entitlement rules. Payment provider and live Supabase integration tests require a configured test environment and are not simulated by this unit suite.

## Access requirements

Every chat request requires an active AI Friend entitlement AND verified email, verified mobile, and approved KYC. The latest KYC status must be `approved` or the legacy `verified` value. Pending/rejected KYC, expired subscriptions, failed payments, and unverified accounts cannot chat.
