# YorBuddy AI Friend setup

AI Friend is a separate product from human Buddy bookings and human Buddy membership. AI Friend chat requires all of the following on every request:
- Active user account.
- Verified email.
- Verified mobile number.
- Latest KYC status approved (the existing database's legacy `verified` value is accepted).
- Active AI Friend subscription or free trial.

## Subscription plans

| Plan | Price | Duration |
| --- | ---: | ---: |
| Free Trial | ₹0 | 24 hours |
| 1 Day | ₹49 | 24 hours |
| 1 Week | ₹299 | 7 days |
| 1 Month | ₹499 | 30 days |

Apply `015_ai_friend_subscriptions.sql` in the Supabase SQL Editor. It creates an isolated subscription table and a partial unique index that allows only one free-trial record per normalized verified mobile number. Only a SHA-256 hash of the mobile number is stored for trial eligibility. The unique index also blocks a second trial after the first one expires or when a different account reuses the same verified phone number.

The trial is claimed server-side and begins immediately. It cannot be claimed until email, mobile and KYC verification are complete. Paid plans are created server-side using Razorpay; the backend calculates the amount and verifies both the HMAC signature and Razorpay's captured payment record. The browser cannot choose or override the amount.

## Backend environment

- `GEMINI_API_KEY`: server-side Google Gemini API key. Never add this to Vite/browser variables.
- `GEMINI_MODEL`: optional model override; defaults to `gemini-2.5-flash`.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: existing server-side Razorpay credentials. Use TEST keys for staging.

## Automated tests

From the `server` directory:
```bash
npm install
npm run typecheck
npm run test:ai-friend
```

The unit tests cover exact plan amounts/durations, invalid plan IDs, 24-hour expiry, one-time trial rules, normalized mobile hashing, subscription expiry, and Razorpay HMAC signature validation. The GitHub Actions workflow runs backend typecheck and this unit suite on feature-branch pushes and pull requests to main.

The unit suite does not replace staging tests against Razorpay TEST mode and a dedicated Supabase test project. Apply the migration to the test database and verify the complete authenticated purchase/trial/chat flow before production.
