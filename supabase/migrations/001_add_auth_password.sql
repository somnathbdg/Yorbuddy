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
