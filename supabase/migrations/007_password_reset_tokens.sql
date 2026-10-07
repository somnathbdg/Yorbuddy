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
