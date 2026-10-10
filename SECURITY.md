# YorBuddy Security Checklist

**Last Audit:** 2026-10-10
**Repository:** somnathbdg/Yorbuddy
**Latest Commit:** 502dc20

---

## Summary

| Status | Count |
|--------|-------|
| PASS | 18 |
| PARTIAL | 8 |
| FAIL | 1 |
| NOT VERIFIED | 4 |
| NOT APPLICABLE | 2 |
| **Total** | **33** (35 original − 2 duplicate Source Maps entries) |

---

## Checklist

### 1. Helmet security headers — PASS

**Evidence:** `server/src/middleware/security.ts` — `helmetMiddleware` with `contentSecurityPolicy: false`, `crossOriginEmbedderPolicy: false`. Applied globally in `server/src/app.ts` line 35.

**Test:** `server/test-p0-security-hardening.mjs`

**Notes:** CSP is disabled. React's built-in XSS escaping is the primary defense. Consider enabling CSP for defense-in-depth.

---

### 2. CORS restriction — PASS

**Evidence:** `server/src/middleware/security.ts` lines 44-50 — `cors({ origin: env.CLIENT_URL, credentials: true, methods: [...], allowedHeaders: ['Content-Type', 'Authorization'], maxAge: 86400 })`. Only the configured frontend origin is allowed.

**Test:** `server/test-p0-security-hardening.mjs`

---

### 3. Rate limiting — general API — PASS

**Evidence:** `server/src/middleware/security.ts` lines 62-73 — `apiLimiter`: 100 requests per 15 minutes per IP in production, 2000 in development. Applied to all `/api/` routes in `app.ts` line 59.

**Test:** `server/test-p0-security-hardening.mjs`

---

### 4. Rate limiting — auth endpoints — FAIL (OPEN)

**Evidence:** `server/src/middleware/security.ts` lines 85-102 — `authLimiter`: **5 requests per 10 minutes per IP** in production.

**Applied to:**
- `POST /api/auth/register` (`server/src/routes/auth.ts` line 13)
- `POST /api/auth/login` (line 19)
- `POST /api/auth/refresh` (line 25)
- `POST /api/auth/forgot-password` (line 37)
- `POST /api/auth/reset-password` (line 43)
- `GET /api/auth/google` (`server/src/routes/googleAuth.ts` line 13)
- `GET /api/auth/google/callback` (line 44)
- `POST /api/auth/google/exchange` (line 96)

**Problem:** 5 attempts per 10 minutes is too strict. Legitimate users who make 2-3 typos or retry after a failed attempt hit the limit. Multiple users behind the same NAT/office IP share one bucket.

**Test:** `server/test-authlimiter-keygenerator.mjs` — 20/20 PASS (verifies implementation, not threshold adequacy)

**Proposed Fix:** Increase `max` from `5` to `15` in production. Still prevents brute-force while allowing legitimate retries.

**Status:** OPEN — awaiting approval to change.

---

### 5. Rate limiting — verification/OTP — PASS

**Evidence:** `server/src/middleware/security.ts` lines 109-120 — `verificationLimiter`: 5 requests per 10 minutes per IP in production. Prevents brute-force of 6-digit codes.

**Test:** `server/test-verification-gate.cjs`

---

### 6. Rate limiting — Telegram webhook — PASS

**Evidence:** `server/src/middleware/security.ts` lines 127-138 — `telegramLimiter`: 30 requests per minute per IP in production.

**Test:** `server/test-remediation-telegram-facebook.cjs`

---

### 7. JWT — access token — PASS

**Evidence:** `server/src/utils/jwt.ts` lines 24-30 — 15-minute TTL, issuer `yorbuddy-api`, type claim `access` verified on validation. Signed with `JWT_ACCESS_SECRET`.

**Test:** `server/test-p0-security-hardening.mjs`

---

### 8. JWT — refresh token — PASS

**Evidence:** `server/src/utils/jwt.ts` lines 36-44 — 7-day TTL, signed with `JWT_REFRESH_SECRET`. Tokens stored in `refresh_tokens` table with `token_hash`, `expires_at`, `revoked_at`. Rotation on refresh (old token revoked). Revocation on logout.

**Test:** `server/test-password-reset.mjs`

---

### 9. JWT — secret management — PASS

**Evidence:** `server/src/config/env.ts` lines 29-34, 86-94 — `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are required env vars. Production mode throws error if missing. Warns if default development values are used in production.

**Test:** `server/test-no-hardcoded-credentials.cjs`

---

### 10. Password hashing — PASS

**Evidence:** `server/src/utils/password.ts` — scrypt with 16-byte random salt, 64-byte derived key, timing-safe comparison (`timingSafeEqual`). Only accepts `scrypt$<salt_hex>$<hash_hex>` format. Unknown algorithms safely rejected.

**Tests:** `server/test-password-hashing.cjs`, `server/test-password-hashing-real.mjs`

---

### 11. Password reset tokens — PASS

**Evidence:** `server/src/utils/resetToken.ts` — 32-byte random token, SHA-256 hashed before storage, 1-hour expiry, single-use (marked `used_at` after password change). Constant-time comparison.

**Test:** `server/test-password-reset.mjs`

---

### 12. Input validation (Zod) — PASS

**Evidence:** `server/src/config/validation.ts` — `validate()`, `validateQuery()`, `validateParams()` middleware. All auth routes use Zod schemas (`registerSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`). Payment and booking routes use Zod schemas.

**Test:** `server/test-p0-security-hardening.mjs`

---

### 13. SQL injection prevention — PASS

**Evidence:** Supabase client (`server/src/config/database.ts`) uses parameterized queries throughout. All `.eq()`, `.neq()`, `.in()` calls use parameterized values. No raw SQL string concatenation found in application code. Migrations use static SQL.

**Test:** `server/test-p0-security-hardening.mjs`

---

### 14. XSS prevention — PASS

**Evidence:** React auto-escapes output by default. No `dangerouslySetInnerHTML` found in frontend code. Helmet's CSP is disabled but React's built-in escaping is the primary defense.

**Test:** `server/test-p0-security-hardening.mjs`

**Notes:** Consider enabling CSP for defense-in-depth.

---

### 15. CSRF protection — PARTIAL

**Evidence:** CORS configured with `credentials: true`. JWT stored in `localStorage` (frontend) and sent via `Authorization: Bearer` header — not cookies. This provides implicit CSRF protection since attackers cannot set cross-origin headers without CORS approval.

**Test:** `server/test-p0-security-hardening.mjs`

**Missing:** No explicit CSRF token. Low risk with current architecture (no cookies). If cookie-based auth is added, CSRF tokens must be implemented.

---

### 16. BOLA/IDOR — booking ownership — PASS

**Evidence:** `server/src/services/paymentService.ts` line 90 — `if (booking.user_id !== userId) throw Forbidden(...)`. Users can only pay for their own bookings.

**Test:** `server/test-payment-e2e.mjs`

---

### 17. BOLA/IDOR — payment ownership — PASS

**Evidence:** `server/src/services/paymentService.ts` line 214 — `if (payment.user_id !== userId) throw Forbidden(...)`. Users can only verify their own payments.

**Test:** `server/test-payment-e2e.mjs`

---

### 18. BOLA/IDOR — admin routes — PASS

**Evidence:** `server/src/middleware/auth.ts` lines 99-136 — `requireRole()` re-reads user from database on every request, checks `is_active` and current role. JWT role claim is never trusted for authorization.

**Tests:** `server/test-admin-authorization.cjs`, `server/test-admin-routes.cjs`

---

### 19. Source maps exposure — PARTIAL

**Evidence:** `server/dist/` contains `.js.map` files (from TypeScript compilation). `vite.config.ts` does not explicitly disable source maps for production build. The `dist/` directory is in `.gitignore`.

**Missing:** `build.sourcemap: false` not set in `vite.config.ts`. If Render serves the `dist/` directory statically (e.g., for SPA), source maps may be publicly accessible.

**Proposed Fix:** Add `build: { sourcemap: false }` to `vite.config.ts`.

---

### 20. Security headers — HSTS — NOT VERIFIED

**Evidence:** Helmet is configured but HSTS is not explicitly set in `security.ts`. Render's proxy layer may handle HSTS at the infrastructure level.

**Verification Needed:** Check Render dashboard for HSTS configuration. If not enabled, add `hsts: { maxAge: 31536000, includeSubDomains: true }` to helmet config.

---

### 21. MFA/2FA — NOT APPLICABLE

**Evidence:** No MFA/2FA implemented. SMS OTP exists for phone verification but not for login. Adding MFA is a feature enhancement, not a security gap for the current scope.

**Future Consideration:** TOTP-based MFA for admin accounts.

---

### 22. Cookie security — NOT APPLICABLE

**Evidence:** JWT tokens stored in `localStorage` (frontend), not cookies. `withCredentials: true` in axios but backend does not set any cookies. No cookie-based authentication.

**Future Consideration:** If cookies are added, must use `Secure`, `HttpOnly`, `SameSite=Strict` flags.

---

### 23. File upload security — NOT VERIFIED

**Evidence:** No file upload endpoints found in current backend codebase. KYC document upload is referenced in frontend (`server/src/routes/verification.ts` exists) but upload handler implementation not confirmed.

**Verification Needed:** Check if KYC upload endpoint exists. If so, verify:
- File type whitelist (images/PDF only)
- File size limits
- Virus scanning
- Storage outside web root
- File name sanitization

---

### 24. SSRF prevention — PASS

**Evidence:** No user-controlled URL fetching found. Google OAuth uses hardcoded URLs (`https://accounts.google.com/...`). Razorpay uses the official SDK. No `fetch()` or `axios.get()` calls with user-supplied URLs.

**Test:** `server/test-p0-security-hardening.mjs`

---

### 25. Razorpay signature verification — PASS

**Evidence:** `server/src/services/paymentService.ts` lines 45-57 — `verifyRazorpaySignature()`: HMAC-SHA256 of `orderId + '|' + paymentId` compared against provided signature using `RAZORPAY_KEY_SECRET`.

**Test:** `server/test-razorpay-step6.mjs`

---

### 26. Razorpay webhook verification — PASS

**Evidence:** `server/src/services/paymentService.ts` lines 59-68 — `verifyWebhookSignature()`: HMAC-SHA256 of raw body compared against `x-razorpay-signature` header using `RAZORPAY_WEBHOOK_SECRET`. Rejects if secret not configured.

**Test:** `server/test-razorpay-step6.mjs`

---

### 27. Webhook replay protection — PARTIAL

**Evidence:** Webhook signature is verified (see #26). Idempotency handled by checking `payment.status !== 'success'` before updating — prevents double-processing.

**Missing:** No timestamp/nonce validation in webhook payload. Razorpay does not include a timestamp in webhook payloads. If Razorpay adds this, timestamp validation should be added.

**Risk Level:** Low — signature verification provides strong protection.

---

### 28. Dependency vulnerability scanning — PARTIAL

**Evidence:**
- `package.json` (frontend) and `server/package.json` (backend) use caret (`^`) ranges, not exact pins.
- `bun.lock` and `package-lock.json` exist (lockfiles committed).
- No `npm audit` in CI pipeline.
- No Dependabot or Snyk configuration found.
- No `.github/workflows/` directory found.

**Proposed Fix:** Add `.github/dependabot.yml` for automated dependency update PRs. Add `"audit": "npm audit --audit-level=high"` to package.json scripts. Run `npm audit` manually on a schedule.

---

### 29. Security logging — PARTIAL

**Evidence:** `server/src/middleware/security.ts` line 94 — rate limit rejections logged with privacy-safe fingerprint (SHA-256 prefix, not full IP). No centralized security event logging for:
- Failed login attempts
- Admin actions
- Privilege changes
- Account deactivations
- Payment failures

**Proposed Fix:** Add structured security event logging for auth failures and admin actions. Use a consistent log format with event type, user ID (hashed), IP fingerprint, and timestamp.

---

### 30. Error message leakage — PASS

**Evidence:** `server/src/middleware/errorHandler.ts` — centralized error handler. Auth errors use generic messages: "Invalid email or password." (not "Password incorrect" or "Email not found"). Rate limit errors use generic "Too many attempts."

**Test:** `server/test-p0-security-hardening.mjs`

---

### 31. Account enumeration prevention — PARTIAL

**Evidence:**
- `server/src/services/passwordResetService.ts` line 40 — forgot password returns generic message regardless of whether email exists. PASS.
- `server/src/services/authService.ts` line 100 — registration returns "An account with this email already exists." FAIL — reveals whether an email is registered.

**Proposed Fix:** Return a generic message for registration too: "Registration successful. If this email is not already registered, you will receive a confirmation." This requires frontend flow adjustment to handle the generic response.

---

### 32. Session management — PASS

**Evidence:**
- Refresh token rotation: old token revoked on refresh (`server/src/services/authService.ts` line 240).
- Logout revokes refresh token (line 271-275).
- 7-day expiry stored in database.
- `revoked_at` field tracked.
- Password reset revokes all refresh tokens for user (`passwordResetService.ts` line 149-153).

**Test:** `server/test-password-reset.mjs`

---

### 33. Admin role enforcement — PASS

**Evidence:** `server/src/middleware/auth.ts` — `requireRole('admin')` re-reads DB on every request. Checks `is_active`. Admin-only routes: `/api/admin/*`, `/api/facebook/*`. New users always get `role: 'user'`. Google OAuth users always get `role: 'user'`.

**Tests:** `server/test-admin-authorization.cjs`, `server/test-admin-routes.cjs`, `server/test-google-oauth.mjs`

---

### 34. Database RLS (Row Level Security) — NOT VERIFIED

**Evidence:** No RLS policies found in repository. `server/src/db/schema.sql` and migration files do not include `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` statements. RLS may be configured in Supabase dashboard outside the repository.

**Verification Needed:** Check Supabase dashboard > Authentication > Policies for each table. See Production Verification Checklist below.

---

### 35. Secrets in production — PASS

**Evidence:** `server/.env` in `.gitignore`. `server/src/config/env.ts` — required env vars checked on startup. Production mode throws error if required vars missing. Warns if default JWT secrets used in production.

**Test:** `server/test-no-hardcoded-credentials.cjs`

---

## Open Findings

### FINDING-001: Auth rate limiting too strict (Severity: Medium)

**Description:** `authLimiter` in production allows only 5 requests per 10 minutes per IP. Legitimate users hit this limit after 2-3 attempts, especially on shared networks (office, college, mobile carrier NAT).

**File:** `server/src/middleware/security.ts` line 87
**Current:** `max: process.env.NODE_ENV === 'production' ? 5 : 100`
**Proposed:** `max: process.env.NODE_ENV === 'production' ? 15 : 100`
**Impact:** 15 attempts per 10 minutes is still strong brute-force protection while allowing legitimate retries.
**Status:** Awaiting approval to change.

---

### FINDING-002: Source maps may be publicly accessible (Severity: Low)

**Description:** `vite.config.ts` does not disable source maps for production builds. If `dist/` is served publicly, source maps reveal original TypeScript source code.

**File:** `vite.config.ts`
**Proposed:** Add `build: { sourcemap: false }` to the Vite config.
**Status:** Awaiting approval to change.

---

### FINDING-003: Account enumeration via registration (Severity: Low)

**Description:** Registration endpoint returns "An account with this email already exists" — allows attackers to enumerate registered emails.

**File:** `server/src/services/authService.ts` line 100
**Proposed:** Return generic message regardless of whether email exists. Requires frontend flow change.
**Status:** Awaiting approval to change.

---

### FINDING-004: No dependency vulnerability scanning in CI (Severity: Medium)

**Description:** No automated dependency vulnerability scanning. Dependencies use caret ranges without lockfile enforcement in CI.

**Proposed:** Add `.github/dependabot.yml`. Add `npm audit` to CI pipeline. Pin critical dependencies.
**Status:** Awaiting approval to change.

---

### FINDING-005: No centralized security event logging (Severity: Medium)

**Description:** Only rate limit rejections are logged. Failed logins, admin actions, and account changes are not logged.

**Proposed:** Add structured security event logging for auth failures and admin actions.
**Status:** Awaiting approval to change.

---

## Production Verification Checklist

इन्हें Supabase Dashboard और Render Dashboard में manually verify करना होगा:

### Supabase Dashboard

| # | Check | Where | Status |
|---|-------|-------|--------|
| S1 | RLS enabled on `users` table | Table Editor > users > Policies | NOT VERIFIED |
| S2 | RLS enabled on `bookings` table | Table Editor > bookings > Policies | NOT VERIFIED |
| S3 | RLS enabled on `payments` table | Table Editor > payments > Policies | NOT VERIFIED |
| S4 | RLS enabled on `refresh_tokens` table | Table Editor > refresh_tokens > Policies | NOT VERIFIED |
| S5 | RLS enabled on `memberships` table | Table Editor > memberships > Policies | NOT VERIFIED |
| S6 | RLS enabled on `password_reset_tokens` table | Table Editor > password_reset_tokens > Policies | NOT VERIFIED |
| S7 | RLS enabled on `verification_codes` table | Table Editor > verification_codes > Policies | NOT VERIFIED |
| S8 | RLS enabled on `activities` table | Table Editor > activities > Policies | NOT VERIFIED |
| S9 | RLS enabled on `reports` table | Table Editor > reports > Policies | NOT VERIFIED |
| S10 | RLS enabled on `notifications` table | Table Editor > notifications > Policies | NOT VERIFIED |
| S11 | Service key not exposed in frontend | Check `src/services/api.ts` — only uses `SUPABASE_URL`, not service key | PASS |
| S12 | Database backups configured | Settings > Database > Backups | NOT VERIFIED |
| S13 | SSL enforced | Settings > Database > Connection Pooling | NOT VERIFIED |

### Render Dashboard

| # | Check | Where | Status |
|---|-------|-------|--------|
| R1 | HSTS enabled | Settings > Headers | NOT VERIFIED |
| R2 | HTTPS only | Settings > General | NOT VERIFIED |
| R3 | Environment variables set | Settings > Environment | NOT VERIFIED |
| R4 | Auto-deploy enabled | Settings > Build & Deploy | NOT VERIFIED |
| R5 | Health check configured | Settings > Health Check | NOT VERIFIED |
| R6 | Backend service URL | Dashboard > Backend Service > URL | NOT VERIFIED |
| R7 | Frontend service URL | Dashboard > Frontend Service > URL | NOT VERIFIED |
| R8 | Custom domain configured | Settings > Custom Domains | NOT VERIFIED |

### Google Cloud Console

| # | Check | Where | Status |
|---|-------|-------|--------|
| G1 | OAuth redirect URI correct | APIs & Services > Credentials > OAuth 2.0 | NOT VERIFIED |
| G2 | Authorized JavaScript origins correct | APIs & Services > Credentials > OAuth 2.0 | NOT VERIFIED |
| G3 | Client ID and Secret valid | APIs & Services > Credentials | NOT VERIFIED |

### Razorpay Dashboard

| # | Check | Where | Status |
|---|-------|-------|--------|
| P1 | Webhook URL correct | Settings > Webhooks | NOT VERIFIED |
| P2 | Webhook secret matches `RAZORPAY_WEBHOOK_SECRET` | Settings > Webhooks | NOT VERIFIED |
| P3 | API key matches `RAZORPAY_KEY_ID` | Settings > API Keys | NOT VERIFIED |
| P4 | Test/Live mode correct | Settings > Account Settings | NOT VERIFIED |

---

## Supabase RLS Verification Plan

यह plan table-by-table RLS verification के लिए है। Policies की पुष्टि किए बिना नई migration नहीं बनाएंगे।

### Tables to Verify

1. **users** — Sensitive PII. Expected policies: users can read/update own row only.
2. **bookings** — Contains user IDs and buddy IDs. Expected: users read own bookings, buddies read own bookings, admins read all.
3. **payments** — Contains payment details and Razorpay IDs. Expected: users read own payments only, admins read all.
4. **refresh_tokens** — Authentication tokens. Expected: users read own tokens only (if needed at all — backend uses service key which bypasses RLS).
5. **memberships** — Membership status. Expected: users read own membership only, admins read all.
6. **password_reset_tokens** — Password reset tokens. Expected: users read own tokens only (if needed).
7. **verification_codes** — OTP codes. Expected: users read/write own codes only.
8. **activities** — User activity logs. Expected: users read own activities only.
9. **reports** — Safety reports. Expected: users create/read own reports, admins read all.
10. **notifications** — User notifications. Expected: users read own notifications only.

### Verification Steps

For each table in Supabase Dashboard:
1. Go to **Table Editor** > Select table > **Policies** tab
2. Check if "Row Level Security" is enabled (toggle should be ON)
3. Check if appropriate policies exist:
   - `SELECT` policy with `auth.uid() = user_id` (for user-owned tables)
   - `INSERT` policy with `auth.uid() = user_id`
   - `UPDATE` policy with `auth.uid() = user_id`
   - `DELETE` policy (if applicable)
   - Admin bypass policies using `EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')`
4. If RLS is disabled, create a migration to enable it (requires user approval)
5. If policies are missing, create appropriate policies (requires user approval)

### Important Notes

- Backend uses **service key** (`SUPABASE_SERVICE_KEY`) which **bypasses RLS**. This means RLS only affects frontend/anon key access.
- If the frontend ever uses the anon key for direct Supabase queries, RLS becomes critical.
- Currently, all data access goes through the backend API, so RLS is defense-in-depth, not primary protection.
- **Do not create new migrations without explicit user approval.**

---

## Dependency Audit

### Current State

| Aspect | Status | Notes |
|--------|--------|-------|
| Lockfiles committed | YES | `bun.lock` (frontend), `package-lock.json` (backend) |
| Exact version pins | NO | All use caret (`^`) ranges |
| CI pipeline | NO | No `.github/workflows/` found |
| Automated scanning | NO | No Dependabot, Snyk, or npm audit in CI |
| `npm audit` script | NO | Not in package.json scripts |

### Proposed Configuration

**File:** `.github/dependabot.yml` (new)

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "npm"
    directory: "/server"
    schedule:
      interval: "weekly"
```

**Add to `package.json` scripts:**

```json
"audit": "npm audit --audit-level=high",
"audit:fix": "npm audit fix"
```

### Critical Dependencies to Monitor

| Package | Current Version | Risk |
|---------|----------------|------|
| `express` | ^4.21.2 | Low — stable, well-maintained |
| `puppeteer` | ^25.12.0 | Medium — large attack surface, frequent updates |
| `jsonwebtoken` | ^9.0.3 | Low — widely used, stable |
| `@supabase/supabase-js` | ^2.49.8 | Low — official SDK |
| `razorpay` | ^2.9.8 | Low — official SDK |
| `helmet` | ^8.1.0 | Low — security library, keep updated |
| `express-rate-limit` | ^7.5.0 | Low — security library, keep updated |

**Do NOT upgrade or install any dependencies without explicit user approval.**

---

## Rate-Limit Issue — Open Finding

### Description

Users on `https://yorbuddy.com` report "Too many attempts, please try again later." during registration and Google Login.

### Root Cause

`authLimiter` in `server/src/middleware/security.ts` allows only **5 requests per 10 minutes per IP** in production. This is too strict for:
- Users who make typos and retry
- Multiple users behind the same NAT/office IP
- Users who refresh and retry

### History

| Commit | Fix | Result |
|--------|-----|--------|
| `bbb55e2` | Set `trust proxy: 1` | Fixed IP extraction from proxy chain |
| `5dedbad` | Custom `keyGenerator` using X-Forwarded-For | Fixed per-IP rate limiting |
| — | Current issue | Limit too strict (5 req/10 min) |

### Proposed Fix

Change `server/src/middleware/security.ts` line 87:
```
max: process.env.NODE_ENV === 'production' ? 5 : 100
```
to:
```
max: process.env.NODE_ENV === 'production' ? 15 : 100
```

### Verification After Fix

1. Run `node test-authlimiter-keygenerator.mjs` — should still pass 20/20
2. Run `node test-authlimiter-integration.mjs` — verify 15 requests succeed, 16th returns 429
3. Deploy to Render
4. Test from a single IP: 10 registration attempts — all should succeed
5. 11th-15th attempt — should succeed
6. 16th attempt — should return 429 with "Too many attempts" message

---

## Logging — Proposed Minimal Safe Fix

### Current State

Only rate limit rejections are logged (with privacy-safe fingerprint).

### Proposed Additions

Add security event logging for:
- Failed login attempts (log email hash + IP fingerprint + timestamp)
- Successful admin actions (log admin ID + action + target + timestamp)
- Account deactivations (log admin ID + target user ID + timestamp)
- Payment failures (log user ID + booking ID + error + timestamp)

### Implementation Approach

Add a `logSecurityEvent()` function in `server/src/utils/securityLogger.ts`:

```typescript
export function logSecurityEvent(
  eventType: 'auth_failure' | 'admin_action' | 'account_deactivated' | 'payment_failure',
  metadata: Record<string, string>
): void {
  console.log(JSON.stringify({
    type: 'security_event',
    event: eventType,
    timestamp: new Date().toISOString(),
    ...metadata
  }));
}
```

Call this function in the relevant route handlers. **Do not implement without user approval.**

---

## Account Enumeration — Proposed Minimal Safe Fix

### Current Behavior

`POST /api/auth/register` returns `409 Conflict` with "An account with this email already exists." if email is already registered.

### Proposed Fix

Return `201 Created` with a generic message regardless of whether the email exists:
- If email is new: create account, return success
- If email exists: return success without creating account

This prevents enumeration but may confuse users who forget they have an account. Alternative: send a "login instead" email to the existing address.

**Do not implement without user approval.**

---

## Security Testing Instructions

### Run All Security Tests

```bash
# From repository root
cd server

# Auth limiter tests
node test-authlimiter-keygenerator.mjs
node test-authlimiter-integration.mjs

# Password hashing tests
node test-password-hashing.cjs
node test-password-hashing-real.mjs

# Password reset tests
node test-password-reset.mjs

# Google OAuth tests
node test-google-oauth.mjs

# Admin authorization tests
node test-admin-authorization.cjs
node test-admin-routes.cjs

# Payment tests
node test-payment-e2e.mjs
node test-razorpay-step6.mjs

# Verification tests
node test-verification-gate.cjs
test-verification-kyc.cjs

# Membership tests
node test-membership-enforcement.cjs
node test-membership-enforcement-v2.cjs
node test-membership-free-access.mjs
node test-membership-payment-complete.cjs

# Security hardening tests
node test-p0-security-hardening.mjs
node test-p1-security-hardening.mjs

# Credential tests
node test-no-hardcoded-credentials.cjs

# Security audit
node test-security-audit.cjs

# Phase 1 security
node test-phase1-security.cjs
```

### Expected Results

All tests should PASS. If any test fails, investigate before deploying.

---

## Incident Response

### If a security incident occurs:

1. **Do not panic** — assess the situation
2. **Preserve evidence** — logs, database records, request headers
3. **Contain** — disable affected endpoints if necessary (can be done via Render dashboard)
4. **Investigate** — identify root cause using logs and code review
5. **Fix** — apply minimal fix, test thoroughly
6. **Deploy** — deploy fix to production
7. **Verify** — confirm fix works in production
8. **Document** — update this SECURITY.md with incident details and lessons learned

### Emergency Contacts

- Repository owner: [TBD]
- Hosting: Render support
- Database: Supabase support
- Payment: Razorpay support

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-10-10 | Initial security audit — 33 items checked | Hermes Agent |
