# YorBuddy AI Friend setup

AI Friend uses the existing `users.email_verified_at`, `users.phone_verified_at`, and latest `verifications.status` records. Chat is permitted only when email and phone are verified and the latest KYC status is `approved` (legacy `verified` is also accepted).

## Backend environment

Add the following to the backend environment (Render or local server environment):

- `GEMINI_API_KEY`: server-side Google Gemini API key. Never add this key to Vite variables or browser code.
- `GEMINI_MODEL`: optional model override; defaults to `gemini-2.5-flash`.

No new database table is required by this first implementation. Conversation history is held in the browser session and only the latest 12 turns are sent with each request. The backend independently re-checks verification on every chat request; frontend checks are only for user experience.

## Verification delivery prerequisite

The existing verification endpoints currently generate/store OTP hashes, but the service code in this repository logs codes in development and contains TODO comments for production email/SMS delivery. Configure and test the email and MSG91/SMS provider integrations before production launch. A user cannot complete a real-world OTP flow until those providers are active.

KYC remains subject to the existing admin approval workflow. Do not treat a submitted or pending KYC as approved.
