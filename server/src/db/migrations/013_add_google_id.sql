-- Migration: Add google_id column to users table
-- Purpose: Enable Google OAuth account linking
-- Date: 2026-10-05
--
-- SAFETY:
--   - ADD COLUMN IF NOT EXISTS: safe to run multiple times
--   - No existing data is modified
--   - No columns are dropped or renamed
--   - No tables are dropped
--   - Existing email/password accounts are unaffected
--   - New column is nullable (NULL = not linked to Google)

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;

-- Add index for faster lookups during Google OAuth callback
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
