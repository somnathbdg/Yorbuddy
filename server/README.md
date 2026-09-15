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
