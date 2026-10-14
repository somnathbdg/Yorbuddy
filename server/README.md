# YorBuddy Backend

Production-ready API server for the YorBuddy companionship platform.

## Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (free tier sufficient for MVP)
- Upstash account (free tier sufficient for MSG91 SMS)

## Setup

1. Install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase and service credentials
   ```

3. Create database tables:
   - Go to Supabase Dashboard > SQL Editor
   - Copy contents of `src/db/schema.sql`
   - Run the query

4. Apply authentication migration:
   - Go to Supabase Dashboard > SQL Editor
   - Copy contents of `src/db/migrations/001_add_auth_password.sql`
   - Run the query

5. Start development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Health
- `GET /api/health` — Server health check
- `GET /api` — API info

### Authentication
- `POST /api/auth/register` — Create new account (email/password)
- `POST /api/auth/login` — Authenticate with email/password
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — End session and revoke refresh token
- `GET /api/auth/me` — Get current authenticated user profile

### Coming in subsequent steps
- `POST /api/auth/otp/send` — Send SMS OTP
- `POST /api/auth/otp/verify` — Verify SMS OTP
- `POST /api/users/me` — Update profile
- `GET /api/buddies/search` — Search buddies
- `POST /api/bookings` — Create booking
- `POST /api/payments/order` — Create payment order
- `WS /chat` — Real-time chat

## Google OAuth and Render cold starts

Google sign-in spans three hosts:

1. **Frontend** (`CLIENT_URL`, e.g. `https://yorbuddy.com`) — `Continue with
   Google` performs a full-page navigation to the backend OAuth entry point
   (`window.location.href`). It is never opened in an iframe or a popup.
2. **Backend** (Render) — `GET /api/auth/google` redirects to Google;
   `GET /api/auth/google/callback` validates the `state` parameter, exchanges the
   authorization code, verifies the Google ID token, and redirects to
   `FRONTEND_URL/auth/callback?code=...` with a one-time code that expires in
   60 seconds.
3. **Google** — the account consent screen.

Production values required for this to work:

| Variable | Where | Example |
| --- | --- | --- |
| `VITE_API_URL` | frontend build | `https://yorbuddy.onrender.com/api` |
| `FRONTEND_URL` | backend | `https://yorbuddy.com` |
| `CLIENT_URL` | backend (CORS) | `https://yorbuddy.com` |
| `GOOGLE_REDIRECT_URI` | backend + Google Cloud console | `https://yorbuddy.onrender.com/api/auth/google/callback` |

`GOOGLE_REDIRECT_URI` must be registered verbatim as an authorised redirect URI
in the Google Cloud console.

### Free-tier cold start (important limitation)

A free Render web service is stopped after a period of inactivity. The next
request that reaches it is answered by Render's own proxy with an
**"Application Loading / Service Waking Up"** page while the instance boots.
This commonly takes 30-60 seconds.

What the frontend does about it, and what it cannot do:

- **It does:** the Google button paints a branded full-screen overlay
  ("Connecting securely to Google…") *before* the browser leaves the page.
  Browsers keep the current page on screen until the next document paints, so
  the overlay covers the part of the cold start that happens before Render
  responds. After 12 seconds the overlay explains that the server may be waking
  up and offers a way to cancel.
- **It does not:** the overlay cannot remove Render's loading page. As soon as
  Render's proxy answers, that page becomes the current document and replaces
  the overlay. **No frontend-only change can make a stopped backend respond
  instantly**, and no frontend change shortens the wake-up time.

Zero-wait Google sign-in therefore requires a hosting-side change:

- an always-on instance (e.g. a paid Render plan without spin-down, or another
  always-on host), or
- an external keep-alive ping against `GET /api/health` at an interval shorter
  than the spin-down window (cheap, but an external dependency and still not a
  guarantee).

Keep-alive pings are not implemented in this repository.

## Scripts

- `npm run dev` — Start dev server with hot reload (tsx)
- `npm run build` — Compile TypeScript to dist/
- `npm run start` — Run compiled server
- `npm run typecheck` — Type-check without emitting

## Project Structure

```
server/
├── src/
│   ├── index.ts           — Entry point
│   ├── app.ts             — Express app configuration
│   ├── config/
│   │   ├── env.ts          — Environment variables
│   │   ├── database.ts     — Supabase client
│   │   └── validation.ts   — Zod validation helpers
│   ├── middleware/
│   │   ├── errorHandler.ts — Centralized error handling
│   │   ├── auth.ts         — JWT authentication middleware
│   │   └── security.ts     — Helmet, CORS, rate limiting
│   ├── routes/
│   │   ├── health.ts       — Health check endpoint
│   │   └── auth.ts         — Authentication routes
│   ├── services/
│   │   └── authService.ts  — Authentication business logic
│   ├── utils/
│   │   ├── apiResponse.ts  — Standardized API responses
│   │   ├── password.ts     — Password hashing (scrypt)
│   │   └── jwt.ts          — JWT token generation/verification
│   ├── types/
│   │   ├── auth.ts         — Auth-related types
│   │   └── express.d.ts    — Express type augmentation
│   └── db/
│       ├── schema.sql      — Database schema
│       └── migrations/     — Database migrations
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript 5.8
- **Server:** Express 4.1
- **Database:** Supabase (PostgreSQL)
- **Cache:** Upstash Redis
- **Validation:** Zod 3.24
- **Security:** Helmet, CORS, express-rate-limit
- **Auth:** JWT (access + refresh tokens), scrypt password hashing
- **Dev tooling:** tsx (TypeScript execution)
