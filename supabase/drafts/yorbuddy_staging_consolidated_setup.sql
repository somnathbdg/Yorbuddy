-- =============================================================================
-- YorBuddy STAGING DATABASE - CONSOLIDATED SETUP
-- Target project: yorbuddy-dev (Supabase project ref: iecqqwqpqfubjpssokvc)
-- Git branch source: feature/secure-kyc-storage
--
-- IMPORTANT:
-- 1) Run ONLY in the yorbuddy-dev Supabase SQL Editor, after confirming the
--    project ref in the dashboard URL is iecqqwqpqfubjpssokvc.
-- 2) This script is for a FRESH public schema with NO existing application tables.
--    It aborts if public tables already exist.
-- 3) Do NOT run this script in the live/production Supabase project.
-- 4) This is a one-time bootstrap. Do not rerun after a successful commit.
-- 5) Migration 010 (old free-trial logic) is intentionally excluded.
-- 6) Current agreed KYC document types: pan, driving_license, voter_id.
-- 7) This script does NOT create or expose public Storage policies.
--    Configure kyc-documents as PRIVATE separately in Storage settings.
-- 8) No user/customer records are inserted; only the activity reference seed rows
--    from the original initial schema are inserted.
--
-- Review this complete script before execution. Take a database backup first.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ) THEN
    RAISE EXCEPTION 'ABORTED: public schema already contains tables. This bootstrap is only for an empty yorbuddy-dev database.';
  END IF;
END $$;

BEGIN;
SET LOCAL search_path = public, extensions;


-- =============================================================================
-- SECTION 1: Initial YorBuddy schema
-- =============================================================================
-- ============================================================================
-- YorBuddy MVP - Initial Database Schema
-- ============================================================================
-- Run this in the Supabase SQL Editor to create all required tables.
-- Supabase URL: https://xxxx.supabase.co/project/default/sql
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Trigram for text search
CREATE EXTENSION IF NOT EXISTS "postgis";       -- Geospatial queries

-- ============================================================================
-- 1. USERS
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  dob DATE,
  gender VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'buddy', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_membership_paid BOOLEAN NOT NULL DEFAULT false,
  membership_paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================================================
-- 2. PROFILES
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  photo_url TEXT,
  city VARCHAR(100),
  area VARCHAR(100),
  languages TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  is_phone_verified BOOLEAN NOT NULL DEFAULT false,
  is_email_verified BOOLEAN NOT NULL DEFAULT false,
  is_id_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_user ON profiles(user_id);

-- ============================================================================
-- 3. BUDDY PROFILES
-- ============================================================================
CREATE TABLE buddy_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hourly_rate INTEGER NOT NULL DEFAULT 500,
  headline VARCHAR(200),
  bio TEXT,
  rating DECIMAL(3, 2) NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  is_online BOOLEAN NOT NULL DEFAULT false,
  response_time VARCHAR(50),
  badge_text VARCHAR(50),
  supported_activity_ids TEXT[] NOT NULL DEFAULT '{}',
  total_earnings INTEGER NOT NULL DEFAULT 0,
  profile_views INTEGER NOT NULL DEFAULT 0,
  safety_pledge_signed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_buddy_profiles_user ON buddy_profiles(user_id);
CREATE INDEX idx_buddy_profiles_verified ON buddy_profiles(is_verified, is_online);
CREATE INDEX idx_buddy_profiles_rating ON buddy_profiles(rating DESC, review_count DESC);

-- ============================================================================
-- 4. ACTIVITIES
-- ============================================================================
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  category VARCHAR(50),
  description TEXT,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_slug ON activities(slug);
CREATE INDEX idx_activities_popular ON activities(is_popular);

-- ============================================================================
-- 5. BOOKINGS
-- ============================================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  buddy_id UUID NOT NULL REFERENCES users(id),
  activity_id UUID NOT NULL REFERENCES activities(id),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration_hours INTEGER NOT NULL DEFAULT 1,
  hourly_rate INTEGER NOT NULL,
  booking_amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')),
  location_name VARCHAR(200),
  location_address TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  special_notes TEXT,
  meet_safety_acknowledged BOOLEAN NOT NULL DEFAULT false,
  has_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_user ON bookings(user_id, created_at DESC);
CREATE INDEX idx_bookings_buddy ON bookings(buddy_id, created_at DESC);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date, booking_time);

-- Prevent double-booking: unique constraint on buddy+date+time for active bookings
-- Note: Partial unique index via a function or trigger is better, but for MVP we'll handle in app layer

-- ============================================================================
-- 6. MESSAGES
-- ============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  text TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_booking ON messages(booking_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- ============================================================================
-- 7. REVIEWS
-- ============================================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES users(id),
  buddy_id UUID NOT NULL REFERENCES users(id),
  author_name VARCHAR(100),
  author_city VARCHAR(100),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_buddy ON reviews(buddy_id, created_at DESC);
CREATE INDEX idx_reviews_rating ON reviews(buddy_id, rating);

-- ============================================================================
-- 8. PAYMENTS
-- ============================================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('membership', 'booking')),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  payment_method VARCHAR(20),
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_razorpay ON payments(razorpay_payment_id);

-- ============================================================================
-- 9. VERIFICATIONS (KYC)
-- ============================================================================
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  doc_type VARCHAR(20) NOT NULL CHECK (doc_type IN ('pan', 'driving_license', 'voter_id')),
  doc_number VARCHAR(50),
  doc_front_url TEXT,
  selfie_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id)
);

CREATE INDEX idx_verifications_user ON verifications(user_id);
CREATE INDEX idx_verifications_status ON verifications(status);

-- ============================================================================
-- 10. REPORTS
-- ============================================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  reported_id UUID NOT NULL REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),
  category VARCHAR(50) NOT NULL CHECK (category IN ('safety_concern', 'harassment', 'non_platonic_behavior', 'unpunctual', 'commercial_services', 'other')),
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_reported ON reports(reported_id);
CREATE INDEX idx_reports_status ON reports(status);

-- ============================================================================
-- 11. NOTIFICATIONS
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- ============================================================================
-- 12. FAVORITES
-- ============================================================================
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buddy_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, buddy_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Activities
-- ============================================================================
INSERT INTO activities (slug, title, icon, category, description, is_popular) VALUES
  ('coffee-chat', 'Coffee & Chat', 'Coffee', 'Casual', 'Catch up over artisanal brews, espresso, or masala chai in cozy public cafes.', true),
  ('movies', 'Movies', 'Film', 'Entertainment', 'Watch the latest Bollywood, regional, or Hollywood blockbuster with a movie buddy.', true),
  ('shopping', 'Shopping', 'ShoppingBag', 'Lifestyle', 'Get an honest second opinion on outfits, thrift store hunts, or mall sprees.', true),
  ('dining', 'Dining', 'Utensils', 'Food', 'Try that new rooftop diner, street food lane, or authentic regional cuisine.', true),
  ('city-walk', 'City Walk', 'Footprints', 'Exploration', 'Brisk evening walks along promenades, heritage lanes, lakefronts, or parks.', true),
  ('explore', 'Explore', 'Compass', 'Exploration', 'Discover hidden museums, weekend flea markets, botanical gardens, and viewpoints.', false),
  ('events', 'Events', 'PartyPopper', 'Culture', 'Attend standup comedy shows, indie concerts, art workshops, or tech meetups.', false),
  ('gaming', 'Gaming', 'Gamepad2', 'Fun', 'Play board games, VR arcades, escape rooms, or console gaming in gaming cafes.', false),
  ('just-talk', 'Just Talk', 'MessageSquare', 'Wellness', 'A genuine, non-judgmental listening ear to vent, reflect, and share life updates.', true),
  ('fitness', 'Fitness', 'Dumbbell', 'Health', 'Workout partners for morning jogs, badminton games, yoga in the park, or gym sessions.', false);


-- =============================================================================
-- SECTION 2: 001_add_auth_password.sql
-- =============================================================================
-- ============================================================================
-- Migration: Add password-based authentication support
-- ============================================================================
-- This migration adds password_hash column to users table and creates
-- refresh_tokens table for JWT refresh token storage.
-- It preserves all existing data and tables.
-- ============================================================================

-- Add password_hash column to users (nullable for backward compat with OTP-only users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Make phone nullable to support email-only registration initially
-- (Phone can be added later via phone OTP step)
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Add index on email for login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- Refresh Tokens Table
-- Stores hashed refresh tokens for session management
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================================================
-- Enable RLS on refresh_tokens
-- ============================================================================
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- SECTION 3: 002_fix_payments_status_check.sql
-- =============================================================================
-- ============================================================================
-- Migration: Fix payments_status_check constraint
-- ============================================================================
-- The payments table has a CHECK constraint that doesn't include 'created'
-- as a valid status. The payment service inserts with status='created' which
-- violates this constraint, causing a 500 error on order creation.
-- ============================================================================

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (status IN ('initiated', 'created', 'pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'));


-- =============================================================================
-- SECTION 4: 003_add_razorpay_signature.sql
-- =============================================================================
-- Add razorpay_signature column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;

-- =============================================================================
-- SECTION 5: 005_kyc_verification_final.sql
-- =============================================================================
-- ============================================================================
-- Migration 005: KYC Verification System — Final Corrected
-- ============================================================================
-- Safe for: Existing YorBuddy Step 1-7 architecture
-- Impact: Non-destructive, idempotent, backward-compatible
--
-- PREREQUISITE: schema.sql must have been run first (creates verifications table)
-- PREREQUISITE: Migrations 001-003 must have been run
--
-- WHAT THIS MIGRATION DOES:
--   1. Adds email_verified_at and phone_verified_at columns to users
--   2. Migrates existing 'verified' KYC status to 'approved'
--   3. Updates verifications.status CHECK constraint for new KYC states
--   4. Creates indexes for verification lookups
--   5. Creates read-only is_user_verified() helper function
--
-- WHAT THIS MIGRATION DOES NOT DO:
--   - Does NOT create new tables (uses existing verifications table from schema.sql)
--   - Does NOT delete or modify existing verification data
--   - Does NOT change existing user/profile/buddy_profiles schemas
--   - Does NOT store raw Aadhaar/PAN/passport numbers
--   - Does NOT add or modify any RLS policies (RLS already enabled by schema.sql)
-- ============================================================================

-- ============================================================================
-- STEP 1: Add verification timestamp columns to users
-- ============================================================================
-- These are NULLABLE — existing rows are unaffected.
-- Existing INSERT statements that omit these columns will continue to work.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Migrate existing KYC status values safely
-- ============================================================================
-- Old constraint allowed: ('pending', 'verified', 'rejected')
-- New constraint will allow: ('not_submitted', 'pending', 'approved', 'rejected')
--
-- Any existing row with status 'verified' is migrated to 'approved'.
-- Rows with 'pending' or 'rejected' are unchanged.
-- This is idempotent — safe to re-run.

-- Drop the old CHECK before converting 'verified' rows; otherwise the UPDATE
-- would violate the old constraint.
ALTER TABLE verifications DROP CONSTRAINT IF EXISTS verifications_status_check;

UPDATE verifications
SET status = 'approved'
WHERE status = 'verified';

-- ============================================================================
-- STEP 3: Update verifications status CHECK constraint
-- ============================================================================
-- Drop old constraint and add new one with expanded status values.
-- All existing data has been migrated in Step 2.

ALTER TABLE verifications ADD CONSTRAINT verifications_status_check
  CHECK (status IN ('not_submitted', 'pending', 'approved', 'rejected'));

-- ============================================================================
-- STEP 4: Create indexes for verification lookups
-- ============================================================================
-- Partial indexes: only index rows where verification timestamp is non-null.
-- Keeps index small for the common case (most users unverified).

CREATE INDEX IF NOT EXISTS idx_users_email_verified
  ON users(email_verified_at) WHERE email_verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_phone_verified
  ON users(phone_verified_at) WHERE phone_verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_verifications_user_status
  ON verifications(user_id, status);

-- ============================================================================
-- STEP 5: Create read-only is_user_verified() helper function
-- ============================================================================
-- SECURITY DEFINER: runs with function owner privileges (service role).
-- Read-only: only SELECTs, does NOT expose any sensitive data.
-- Returns a simple BOOLEAN.
--
-- Logic: user is verified if ALL three conditions are true:
--   1. email_verified_at IS NOT NULL
--   2. phone_verified_at IS NOT NULL
--   3. At least one verification record with status = 'approved' exists
--
-- This mirrors the logic already in verificationService.ts (isUserVerified).

CREATE OR REPLACE FUNCTION is_user_verified(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  email_verified BOOLEAN;
  phone_verified BOOLEAN;
  kyc_approved BOOLEAN;
BEGIN
  SELECT (email_verified_at IS NOT NULL) INTO email_verified
    FROM users WHERE id = check_user_id;

  SELECT (phone_verified_at IS NOT NULL) INTO phone_verified
    FROM users WHERE id = check_user_id;

  SELECT EXISTS(
    SELECT 1 FROM verifications
    WHERE user_id = check_user_id AND status = 'approved'
  ) INTO kyc_approved;

  RETURN COALESCE(email_verified, false)
     AND COALESCE(phone_verified, false)
     AND COALESCE(kyc_approved, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_user_verified(UUID) IS
  'Read-only check: returns true if user has verified email, verified phone, and approved KYC. Returns false for any missing or unverified component.';

-- ============================================================================
-- END OF MIGRATION 005
-- ============================================================================


-- =============================================================================
-- SECTION 6: 006_duplicate_booking_protection.sql
-- =============================================================================
-- ============================================================================
-- Migration: Add duplicate booking protection
-- ============================================================================
-- This migration adds a partial unique index to prevent duplicate active bookings
-- for the same user + buddy + date + time combination.
-- This provides database-level enforcement against race conditions.
-- ============================================================================

-- Prevent overlapping active bookings for the same user on the same date+time
-- Note: Full overlap prevention requires application logic (variable duration),
-- but exact duplicate prevention is handled here at the DB level.
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_no_duplicate_active
  ON bookings (user_id, buddy_id, booking_date, booking_time)
  WHERE status IN ('pending', 'confirmed');

-- Add comment explaining the constraint
COMMENT ON INDEX idx_booking_no_duplicate_active IS
  'Prevents duplicate active bookings for the same user+buddy+date+time. Overlap prevention for variable durations is handled in application logic (checkOverlap).';


-- =============================================================================
-- SECTION 7: 007_password_reset_tokens.sql
-- =============================================================================
-- ============================================================================
-- Migration: Password Reset Tokens Table
-- ============================================================================
-- Creates a table to store hashed password reset tokens with expiry.
-- Tokens are single-use and expire after 1 hour.
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

COMMENT ON TABLE password_reset_tokens IS 'Stores hashed password reset tokens. Raw tokens are sent to users; only SHA-256 hashes are stored.';


-- =============================================================================
-- SECTION 8: 008_verification_codes.sql
-- =============================================================================
-- ============================================================================
-- Migration: Verification Codes Table
-- ============================================================================
-- Creates a table to store hashed verification codes for email/phone verification.
-- Codes are stored as SHA-256 hashes with expiration and one-time-use behavior.
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_key ON verification_codes(key);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

COMMENT ON TABLE verification_codes IS 'Stores hashed verification codes for email/phone verification. Codes are hashed with SHA-256 and expire after 10 minutes. One-time use enforced via used_at timestamp.';


-- =============================================================================
-- SECTION 9: 009_add_booking_expiry.sql
-- =============================================================================
-- ============================================================================
-- Migration 009: Add booking expiry support
-- ============================================================================
-- Safe for: Existing YorBuddy Step 1-8 architecture
-- Impact: Non-destructive, idempotent, backward-compatible
--
-- PREREQUISITE: schema.sql must have been run first
-- PREREQUISITE: Migrations 001-008 must have been run
--
-- WHAT THIS MIGRATION DOES:
--   1. Adds expires_at column to bookings table
--   2. Adds updated_at column to bookings table
--   3. Updates bookings.status CHECK constraint to include 'expired'
--   4. Creates index for efficient expiry queries
--   5. Creates trigger to auto-update updated_at
--   6. Backfills existing pending test bookings with expires_at = created_at + 30 min
--
-- WHAT THIS MIGRATION DOES NOT DO:
--   - Does NOT delete any bookings
--   - Does NOT modify confirmed, completed, or cancelled bookings
--   - Does NOT change pricing or payment logic
--   - Does NOT add or modify any RLS policies
-- ============================================================================

-- ============================================================================
-- STEP 1: Add expires_at column
-- ============================================================================
-- Nullable by default. Existing rows will have NULL until backfilled.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Add updated_at column
-- ============================================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================================================
-- STEP 3: Update bookings status CHECK constraint to include 'expired'
-- ============================================================================
-- Old constraint: ('pending', 'confirmed', 'completed', 'cancelled', 'rejected')
-- New constraint: ('pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'expired')

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'expired'));

-- ============================================================================
-- STEP 4: Create index for efficient expiry queries
-- ============================================================================
-- Partial index: only indexes pending bookings with non-null expires_at
-- This makes the cleanup job query very fast
CREATE INDEX IF NOT EXISTS idx_bookings_expires_at ON bookings(expires_at) 
  WHERE status = 'pending';

-- ============================================================================
-- STEP 5: Create trigger to auto-update updated_at
-- ============================================================================
-- Drop trigger if exists, then create (PostgreSQL compatible)
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Backfill existing pending test bookings
-- ============================================================================
-- Existing pending bookings are 5-7 days old abandoned test data.
-- Set expires_at = created_at + 30 minutes so cleanup job will expire them.
-- This is safe because:
--   - They are all old test bookings (confirmed via pre-migration check)
--   - No user action is pending on them
--   - They will be expired within 5 minutes of cleanup job running

UPDATE bookings 
SET expires_at = created_at + INTERVAL '30 minutes'
WHERE status = 'pending' AND expires_at IS NULL;

-- ============================================================================
-- END OF MIGRATION 009
-- ============================================================================


-- =============================================================================
-- SECTION 10: 011_create_memberships_table.sql
-- =============================================================================
-- ============================================================================
-- Migration: Create memberships table
-- ============================================================================
-- Safe for: Existing YorBuddy Step 1-10 architecture
-- Impact: Creates memberships table required by application code
--
-- PREREQUISITE: schema.sql must have been run first
-- PREREQUISITE: Migrations 001-010 must have been run
--
-- WHAT THIS MIGRATION DOES:
--   1. Creates memberships table with exact schema from production
--   2. Adds foreign key constraint to users table
--   3. Adds indexes for common query patterns
--   4. Enables Row Level Security (RLS)
--   5. Creates trigger for updated_at auto-update
--
-- WHAT THIS MIGRATION DOES NOT DO:
--   - Does NOT modify existing tables
--   - Does NOT delete or modify existing data
--   - Does NOT add new pricing plans
--   - Does NOT apply commission logic
--   - Does NOT migrate data from OLD database
--
-- HISTORICAL PLAN VALUES PRESERVED:
--   MONTH_1, MONTH_6, YEAR_1, LIFETIME
-- ============================================================================

-- ============================================================================
-- STEP 1: Create memberships table
-- ============================================================================
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(20) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'success', 'failed', 'cancelled')),
  membership_start_date TIMESTAMPTZ,
  membership_expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create indexes for common query patterns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_plan ON memberships(plan_id);

-- ============================================================================
-- STEP 3: Enable Row Level Security
-- ============================================================================
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create trigger for updated_at auto-update
-- ============================================================================
-- Drop trigger if exists, then create (PostgreSQL compatible)
DROP TRIGGER IF EXISTS update_memberships_updated_at ON memberships;
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF MIGRATION 011
-- ============================================================================


-- =============================================================================
-- SECTION 11: 012_rls_hardening_token_and_activities_tables.sql
-- =============================================================================
-- ============================================================================
-- Migration: RLS hardening for activities, password_reset_tokens, verification_codes
-- ============================================================================
-- Context (from the read-only RLS audit):
--   Every application table had RLS enabled EXCEPT these three, which were left
--   with RLS DISABLED:
--     - activities
--     - password_reset_tokens
--     - verification_codes
--   No RLS policies exist anywhere in this schema (RLS-on tables are default-deny).
--
-- Objective:
--   Bring these three tables to the SAME safe posture as the rest of the schema,
--   without changing application behaviour.
--
-- Design rationale (why this is safe):
--   * The backend accesses Supabase exclusively with SUPABASE_SERVICE_KEY
--     (server/src/config/database.ts -> createClient(SUPABASE_URL, SERVICE_KEY)).
--     The service_role role has BYPASSRLS and is NEVER subject to RLS, so enabling
--     RLS on these tables cannot affect any backend query.
--   * NO policy is created. In PostgreSQL, "RLS enabled + no policy" means
--     DEFAULT DENY for every non-bypass role. anon/authenticated therefore get
--     no SELECT, INSERT, UPDATE or DELETE -- exactly the intended restriction.
--   * FORCE ROW LEVEL SECURITY is deliberately NOT set: it is unnecessary because
--     service_role bypasses RLS regardless, and forcing it would only add risk.
--   * Existing table GRANTs to anon/authenticated are REVOKEd as defense-in-depth.
--     This is redundant with default-deny, but it makes the intent explicit and
--     protects against a future accidental permissive policy being added.
--
-- Explicitly NOT done by this migration:
--   - No CREATE POLICY (no allow-all / public policy).
--   - No INSERT / UPDATE / DELETE on any row (no data is modified or deleted).
--   - No changes to any other table (bookings, users, memberships, payments,
--     messages, etc. are untouched).
--   - No changes to service_role privileges.
--   - No changes to application, authentication or configuration code.
--
-- This migration is idempotent and safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. activities
--    Public reference data (seeded list of activities). The backend only ever
--    SELECTs from it, via service_role. No browser Supabase client exists.
-- ----------------------------------------------------------------------------
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.activities FROM anon;
REVOKE ALL ON TABLE public.activities FROM authenticated;

COMMENT ON TABLE public.activities IS
  'Public reference data. RLS enabled with NO policies => default deny for anon/authenticated. Backend reads via service_role (BYPASSRLS). Do not add an allow-all policy.';

-- ----------------------------------------------------------------------------
-- B. password_reset_tokens
--    Stores SHA-256 hashes of live password-reset tokens (single-use, 1h expiry).
--    Backend-only access via service_role.
-- ----------------------------------------------------------------------------
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.password_reset_tokens FROM anon;
REVOKE ALL ON TABLE public.password_reset_tokens FROM authenticated;

COMMENT ON TABLE public.password_reset_tokens IS
  'Stores hashed password reset tokens. RLS enabled with NO policies => default deny for anon/authenticated. Backend accesses via service_role only. Do not add an allow-all policy.';

-- ----------------------------------------------------------------------------
-- C. verification_codes
--    Stores SHA-256 hashes of email/phone verification codes (single-use).
--    Backend-only access via service_role.
-- ----------------------------------------------------------------------------
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.verification_codes FROM anon;
REVOKE ALL ON TABLE public.verification_codes FROM authenticated;

COMMENT ON TABLE public.verification_codes IS
  'Stores hashed verification codes for email/phone verification. RLS enabled with NO policies => default deny for anon/authenticated. Backend accesses via service_role only. Do not add an allow-all policy.';

-- ============================================================================
-- END OF MIGRATION 012
-- ============================================================================


-- Final KYC document-type enforcement (reassert agreed allowed values).
ALTER TABLE public.verifications DROP CONSTRAINT IF EXISTS verifications_doc_type_check;
ALTER TABLE public.verifications
  ADD CONSTRAINT verifications_doc_type_check
  CHECK (doc_type IN ('pan', 'driving_license', 'voter_id'));

COMMIT;

-- =============================================================================
-- POST-RUN VERIFICATION (run these SELECT statements separately)
-- =============================================================================
-- 1. List created public tables:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;
--
-- 2. Confirm KYC allowed document types and status constraint:
-- SELECT pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid='public.verifications'::regclass
--   AND contype='c';
--
-- 3. Confirm RLS is enabled:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
--
-- 4. Confirm activities seed data:
-- SELECT slug, title FROM public.activities ORDER BY title;
--
-- STORAGE SETUP (Dashboard > Storage > Buckets):
-- Bucket name: kyc-documents
-- Public bucket: OFF (PRIVATE)
-- File size limit: 5 MB
-- Allowed MIME types: image/jpeg,image/png,application/pdf
-- No anon/authenticated read policies. Backend service-role only.
-- =============================================================================
