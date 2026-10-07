'use strict';

/**
 * ============================================================================
 * Test Credentials Helper (CommonJS)
 * ============================================================================
 *
 * Central place for test credentials so that NO test script contains a
 * hard-coded password.
 *
 * Resolution order for a test password:
 *   1. process.env.TEST_USER_PASSWORD   (explicit override, e.g. CI secret)
 *   2. A cryptographically random password generated per process run
 *
 * Generated passwords are only ever used to REGISTER brand-new throwaway
 * accounts, so there is nothing to look up: the test registers the account
 * with the generated value and immediately uses it.
 *
 * Existing accounts (e.g. a pre-provisioned admin) cannot use a generated
 * password. Those tests must supply credentials through the environment; use
 * requireEnv() so the test fails loudly and safely instead of guessing.
 *
 * NEVER put a real credential value in this file or in any test file.
 * ============================================================================
 */

const crypto = require('crypto');

/**
 * Generate a strong random password for a throwaway test account.
 * Format is deliberately far from any human/real-world password.
 */
function generatedPassword() {
  return 'YbTest!' + crypto.randomBytes(24).toString('base64url');
}

/** Password used for newly registered throwaway users. */
const testPassword = process.env.TEST_USER_PASSWORD || generatedPassword();

/** True when the password came from the environment rather than being generated. */
const testPasswordFromEnv = Boolean(process.env.TEST_USER_PASSWORD);

/**
 * Read a required environment value. Returns null when absent so callers can
 * skip the test explicitly instead of falling back to a guessed value.
 */
function optionalEnv(name) {
  const v = process.env[name];
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Throw a clear, non-secret-leaking error when a required credential is absent.
 */
function requireEnv(name, hint) {
  const v = optionalEnv(name);
  if (!v) {
    const err = new Error(
      `Missing required environment variable ${name}. ${hint || ''}`.trim()
    );
    err.code = 'MISSING_TEST_CREDENTIAL';
    err.envName = name;
    throw err;
  }
  return v;
}

/**
 * Credentials for an EXISTING admin account. Never generated: must be supplied
 * by the environment, because the account already exists in the database.
 */
const testAdminEmail = optionalEnv('TEST_ADMIN_EMAIL');
const testAdminPassword = optionalEnv('TEST_ADMIN_PASSWORD');

/**
 * Whether admin-credential-dependent tests can run at all.
 */
function hasAdminCredentials() {
  return Boolean(testAdminEmail && testAdminPassword);
}

/**
 * Print a single, non-sensitive notice when admin credentials are missing.
 */
function reportMissingAdminCredentials(label) {
  console.log(
    `  SKIP: ${label} - set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run this test`
  );
}

module.exports = {
  generatedPassword,
  testPassword,
  testPasswordFromEnv,
  optionalEnv,
  requireEnv,
  testAdminEmail,
  testAdminPassword,
  hasAdminCredentials,
  reportMissingAdminCredentials,
};
