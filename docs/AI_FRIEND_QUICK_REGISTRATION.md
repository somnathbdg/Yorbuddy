# AI Friend Quick Registration

## Goal

Provide a short, AI-Friend-only onboarding path without changing the existing YorBuddy Buddy registration, human Buddy KYC, or membership checkout flows.

## User journey

1. Visitor opens the AI Friend section and selects **Try AI Friend Chat**.
2. If signed out, show the dedicated Quick Registration screen:
   - Full name
   - Email address
   - Password and confirmation
   - Optional mobile number (not required for AI Friend registration)
3. Create a normal YorBuddy user account through a dedicated backend endpoint. Do not silently create a Buddy profile or mark email/mobile as verified.
4. Require one contact verification method:
   - Email OTP, OR
   - Mobile OTP (only when a mobile number was supplied and verified).
5. Ask for explicit 18+ self-confirmation.
6. Check AI Friend entitlement:
   - Active paid YorBuddy membership: AI Friend included at no extra charge.
   - Otherwise: one-time 24-hour free trial, then ₹49/day, ₹299/week, or ₹499/month.
7. Open the AI Friend chat only when the backend confirms contact verification, 18+ confirmation, and an active entitlement.

## Existing contracts verified

- Public general registration currently requires a mobile number in `server/src/services/authService.ts`.
- Existing email/mobile OTP endpoints are mounted under `/api/verification` and operate on the authenticated account.
- AI Friend backend currently checks `email_verified_at OR phone_verified_at`, plus `ai_friend_adult_confirmed_at`; KYC is explicitly not required.
- AI Friend entitlement and chat endpoints already exist under `/api/ai-friend`.
- The existing `AuthModal` is a multi-step general registration experience (Basics, Profile, Verification, Membership Payment). It must remain unchanged for ordinary YorBuddy registration.

## Implementation plan

### Backend
- Add a dedicated `POST /api/auth/ai-friend/register` endpoint and a separate validation schema.
- Accept name, email, password, and optional mobile; validate password strength and normalize a supplied mobile number.
- Enforce email uniqueness and mobile uniqueness when supplied; retain database unique-index race protection.
- Create only a standard user account, issue the same secure access/refresh token pair, store refresh token, and apply the existing account-level free-access grant only if that is a required invariant for all users. Do not create KYC approval, verified flags, Buddy profile, or AI Friend entitlement.
- Keep the endpoint rate-limited and return generic conflict/error messages that do not disclose account existence unnecessarily.
- Reuse existing authenticated OTP endpoints; do not introduce a bypass or return OTP values to the browser.
- Confirm the account registration flow handles email-only accounts safely throughout existing user/profile code.

### Frontend
- Add a dedicated `AiFriendQuickRegister` component, separate from `AuthModal`.
- Add a distinct app-context modal state or route so AI Friend registration cannot mutate the general registration step state.
- Use existing auth service token storage only after the backend returns a valid registration response.
- After registration, show the two verification choices and route to the existing email/mobile OTP UI.
- Display the 18+ confirmation after one contact method is verified.
- Fetch entitlement from the server and render the existing free trial / paid plan controls.
- Keep the AI Friend chat preview visible before login; do not allow sending messages until server-side checks pass.
- Provide a clear link to the standard YorBuddy registration for users who want to become a human Buddy.

### Safety and compatibility
- Never change general Buddy registration requirements or KYC rules.
- Never treat an unverified email/mobile as verified.
- Never expose Gemini or payment secrets in frontend code.
- Do not apply database migrations to Production. Staging migrations require explicit approval.
- Preserve active paid YorBuddy membership inclusion and the existing one-time AI Friend trial guard.

## Acceptance tests

- Email-only account can register, verify email, confirm 18+, and access eligible AI Friend chat.
- Account with optional mobile can verify either email or mobile and proceed.
- Unverified account cannot chat, start trial, or buy an AI Friend plan.
- 18+ confirmation is required before chat or entitlement activation.
- Active paid YorBuddy member receives AI Friend without extra payment.
- YorBuddy 10-day free access alone does not grant included AI Friend access.
- Non-member gets one 24-hour trial; repeat trial is denied.
- Expired trial sees ₹49/day, ₹299/week, and ₹499/month options.
- Existing general registration still requires its current fields and retains its current profile/KYC/membership behavior.
- No Production service, database, or migration is changed by this feature branch.

## Current status

Branch created from `feature/staging-ai-friend-integration`. This document records the scoped implementation contract; application code and automated tests remain to be implemented and validated before deployment.
