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
  doc_type VARCHAR(20) NOT NULL CHECK (doc_type IN ('aadhaar', 'pan', 'passport', 'voter_id')),
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
