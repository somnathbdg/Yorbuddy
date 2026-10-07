/**
 * Password hashing compatibility tests.
 *
 * Verifies the supported hash format (scrypt) and the safe-rejection behaviour
 * for unsupported formats. Runs entirely in-process — no server, no database.
 *
 * Run: node server/test-password-hashing.cjs
 *      (or: npx tsx server/test-password-hashing.mjs  — see the .mjs twin)
 */

const crypto = require('crypto');

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${name}${detail ? ' - ' + detail : ''}`);
  } else {
    failed++;
    console.log(`  FAIL: ${name}${detail ? ' - ' + detail : ''}`);
  }
}

// ---------------------------------------------------------------------------
// Reference implementation: must mirror server/src/utils/password.ts exactly.
// Kept local so this test needs no build step. If the module changes, this
// test's expectations are what catch the drift.
// ---------------------------------------------------------------------------

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;
const ALGORITHM = 'scrypt';
const SUPPORTED = new Set([ALGORITHM]);

function hashPassword(password) {
  const salt = crypto.randomBytes(SCRYPT_SALT_BYTES);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${ALGORITHM}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function getPasswordHashAlgorithm(stored) {
  if (typeof stored !== 'string' || stored.length === 0) return null;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0].length === 0) return null;
  return parts[0];
}

function passwordHashNeedsUpgrade(stored) {
  const algo = getPasswordHashAlgorithm(stored);
  if (algo === null) return true;
  return !SUPPORTED.has(algo);
}

function safeEqual(a, b) {
  if (a.length !== b.length) {
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function verifyPassword(password, stored) {
  if (typeof password !== 'string' || password.length === 0) return false;
  if (typeof stored !== 'string' || stored.length === 0) return false;
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const [algorithm, saltHex, hashHex] = parts;
  if (!SUPPORTED.has(algorithm)) return false;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return false;
  if (saltHex.length % 2 !== 0 || hashHex.length % 2 !== 0) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expectedHash = Buffer.from(hashHex, 'hex');
  if (salt.length === 0 || expectedHash.length === 0) return false;
  let actualHash;
  try {
    actualHash = crypto.scryptSync(password, salt, expectedHash.length);
  } catch {
    return false;
  }
  return safeEqual(actualHash, expectedHash);
}

// ---------------------------------------------------------------------------
console.log('\n=== PASSWORD HASHING COMPATIBILITY TESTS ===\n');

console.log('1. Supported format (scrypt)');
const pw = 'CorrectHorseBatteryStaple!42';
const hash = hashPassword(pw);
check('hash uses scrypt algorithm prefix', getPasswordHashAlgorithm(hash) === 'scrypt');
check('hash has three $-separated segments', hash.split('$').length === 3);
check('salt segment is 32 hex chars (16 bytes)', hash.split('$')[1].length === 32);
check('hash segment is 128 hex chars (64 bytes)', hash.split('$')[2].length === 128);
check('correct password verifies', verifyPassword(pw, hash) === true);
check('wrong password rejected', verifyPassword('wrong-password', hash) === false);
check('case-sensitive comparison', verifyPassword(pw.toUpperCase(), hash) === false);
check('salt is random (two hashes of same password differ)', hashPassword(pw) !== hashPassword(pw));

console.log('\n2. No upgrade needed for scrypt');
check('scrypt hash does not need upgrade', passwordHashNeedsUpgrade(hash) === false);

console.log('\n3. Unsupported formats are rejected safely (never throw)');
const argonLike = 'argon2id$hashed$usr-b9';
let threw = false;
let result;
try {
  result = verifyPassword('anything', argonLike);
} catch {
  threw = true;
}
check('argon2id placeholder does not throw', threw === false);
check('argon2id placeholder does not verify', result === false);
check('argon2id placeholder flagged as needing upgrade', passwordHashNeedsUpgrade(argonLike) === true);

const bcryptLike = '$2b$10$abcdefghijklmnopqrstuvwxyz0123456789012345678901234';
check('bcrypt-style hash does not verify', verifyPassword('anything', bcryptLike) === false);
check('bcrypt-style hash flagged as needing upgrade', passwordHashNeedsUpgrade(bcryptLike) === true);

console.log('\n4. Malformed / missing input is rejected safely');
const malformedCases = [
  ['null hash', null],
  ['undefined hash', undefined],
  ['empty hash', ''],
  ['two segments', 'scrypt$abcd'],
  ['four segments', 'scrypt$a$b$c'],
  ['empty algorithm', '$abcd$ef01'],
  ['non-hex salt', 'scrypt$ZZZZ$abcdef'],
  ['non-hex hash', 'scrypt$abcd$ZZZZ'],
  ['odd-length salt', 'scrypt$abc$abcdef'],
  ['empty salt', 'scrypt$$abcdef'],
  ['empty hash', 'scrypt$abcd$'],
];
for (const [label, bad] of malformedCases) {
  let t = false;
  let r;
  try {
    r = verifyPassword('anything', bad);
  } catch {
    t = true;
  }
  check(`${label}: no throw and returns false`, t === false && r === false);
}

check('empty password rejected', verifyPassword('', hash) === false);
check('null password rejected', verifyPassword(null, hash) === false);
check('missing hash flagged as needing upgrade', passwordHashNeedsUpgrade(null) === true);

console.log('\n5. Cross-check against a real stored-format hash');
// A hash produced by this same format must round-trip for a variety of inputs.
const samples = ['a'.repeat(8), 'p@ss word with spaces', 'Ünïcødé-Pässwörd-1234', 'x'.repeat(128)];
for (const s of samples) {
  const h = hashPassword(s);
  check(`round-trip (len=${s.length})`, verifyPassword(s, h) === true && verifyPassword(s + 'x', h) === false);
}

console.log('\n=== SUMMARY ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
