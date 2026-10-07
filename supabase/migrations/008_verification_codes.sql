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
