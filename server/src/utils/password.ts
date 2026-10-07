import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * ============================================================================
 * Password Hashing
 * ============================================================================
 *
 * Supported storage format (the application's production strategy):
 *
 *     scrypt$<salt_hex>$<hash_hex>
 *
 *   - Algorithm: scrypt (Node built-in), 16-byte random salt, 64-byte derived key.
 *   - Comparison is timing-safe.
 *   - This is the ONLY format hashPassword() produces and the only format
 *     verifyPassword() accepts.
 *
 * Unsupported formats (e.g. `argon2id$...`, `$2b$...` bcrypt) are rejected
 * safely: verifyPassword() returns false and never throws. This matters because
 * a stored hash in an unknown format must never be treated as a valid match,
 * and must never crash the login path.
 *
 * MIGRATION NOTE (do not run without review):
 *   Some historical/seeded rows contain a placeholder string that looks like
 *   `argon2id$hashed$<something>`. That is NOT a real Argon2 hash — it can never
 *   verify. Those accounts simply have no usable password and must be reset
 *   through the normal password-reset flow (or src/scripts/reset-admin-password.ts),
 *   which writes a real scrypt hash. See passwordHashNeedsUpgrade().
 * ============================================================================
 */

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;
const ALGORITHM = 'scrypt';

/** Formats this build can verify. */
const SUPPORTED_ALGORITHMS = new Set<string>([ALGORITHM]);

/**
 * Hash a password using scrypt with a random salt.
 * Format: scrypt$<salt_hex>$<hash_hex>
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${ALGORITHM}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * Extract the algorithm prefix from a stored hash.
 * Returns null when the value is missing or not in `algorithm$...` form.
 */
export function getPasswordHashAlgorithm(storedHash: string | null | undefined): string | null {
  if (typeof storedHash !== 'string' || storedHash.length === 0) return null;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0].length === 0) return null;
  return parts[0];
}

/**
 * True when the stored hash is in a format this build cannot verify and the
 * user therefore needs a password reset (or a future re-hash) to log in.
 */
export function passwordHashNeedsUpgrade(storedHash: string | null | undefined): boolean {
  const algorithm = getPasswordHashAlgorithm(storedHash);
  if (algorithm === null) return true;
  return !SUPPORTED_ALGORITHMS.has(algorithm);
}

/**
 * Compare two buffers in constant time, tolerating length differences without
 * leaking which side was shorter.
 */
function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    // Still perform a comparison so the failure path costs the same as the
    // success path; the result is discarded.
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Verify a password against a stored hash.
 *
 * - Supports only the scrypt format described above.
 * - Returns false (never throws) for unknown algorithms, malformed hashes,
 *   empty passwords, or absent hashes.
 * - Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (typeof password !== 'string' || password.length === 0) return false;
  if (typeof storedHash !== 'string' || storedHash.length === 0) return false;

  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;

  const [algorithm, saltHex, hashHex] = parts;
  if (!SUPPORTED_ALGORITHMS.has(algorithm)) return false;

  // Reject malformed hex before handing it to Buffer.from (which silently
  // truncates on invalid input).
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return false;
  if (saltHex.length % 2 !== 0 || hashHex.length % 2 !== 0) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expectedHash = Buffer.from(hashHex, 'hex');
  if (salt.length === 0 || expectedHash.length === 0) return false;

  let actualHash: Buffer;
  try {
    actualHash = scryptSync(password, salt, expectedHash.length);
  } catch {
    return false;
  }

  return safeEqual(actualHash, expectedHash);
}

/** Exported for tests and for future algorithm migration work. */
export const PASSWORD_HASHING = {
  algorithm: ALGORITHM,
  keylen: SCRYPT_KEYLEN,
  saltBytes: SCRYPT_SALT_BYTES,
  supportedAlgorithms: Array.from(SUPPORTED_ALGORITHMS),
} as const;
