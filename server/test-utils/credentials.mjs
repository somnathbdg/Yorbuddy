/**
 * ============================================================================
 * Test Credentials Helper (ESM)
 * ============================================================================
 *
 * ESM twin of credentials.cjs. Keep the two in sync.
 *
 * No test script may contain a hard-coded password. New throwaway accounts use
 * a generated password (or TEST_USER_PASSWORD when provided); existing
 * accounts must supply credentials through the environment.
 *
 * NEVER put a real credential value in this file or in any test file.
 * ============================================================================
 */

import crypto from 'crypto';

/**
 * Generate a strong random password for a throwaway test account.
 */
export function generatedPassword() {
  return 'YbTest!' + crypto.randomBytes(24).toString('base64url');
}

/** Password used for newly registered throwaway users. */
export const testPassword = process.env.TEST_USER_PASSWORD || generatedPassword();

/** True when the password came from the environment rather than being generated. */
export const testPasswordFromEnv = Boolean(process.env.TEST_USER_PASSWORD);

/**
 * Read an optional environment value, returning null when absent/blank.
 */
export function optionalEnv(name) {
  const v = process.env[name];
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Throw a clear, non-secret-leaking error when a required credential is absent.
 */
export function requireEnv(name, hint) {
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

/** Credentials for an EXISTING admin account (must come from the environment). */
export const testAdminEmail = optionalEnv('TEST_ADMIN_EMAIL');
export const testAdminPassword = optionalEnv('TEST_ADMIN_PASSWORD');

/** Whether admin-credential-dependent tests can run at all. */
export function hasAdminCredentials() {
  return Boolean(testAdminEmail && testAdminPassword);
}

/** Print a single, non-sensitive notice when admin credentials are missing. */
export function reportMissingAdminCredentials(label) {
  console.log(
    `  SKIP: ${label} - set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD to run this test`
  );
}
