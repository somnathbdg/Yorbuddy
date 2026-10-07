/**
 * Password hashing tests against the REAL application module.
 *
 * Unlike test-password-hashing.cjs (which mirrors the format to stay
 * dependency-free), this imports server/src/utils/password.ts directly, so it
 * catches any drift between the shipped implementation and the expected
 * behaviour.
 *
 * Run: cd server && npx tsx test-password-hashing-real.mjs
 */

import {
  hashPassword,
  verifyPassword,
  getPasswordHashAlgorithm,
  passwordHashNeedsUpgrade,
  PASSWORD_HASHING,
} from './src/utils/password.js';

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

console.log('\n=== REAL MODULE: PASSWORD HASHING TESTS ===\n');

console.log('1. Module contract');
check('algorithm is scrypt', PASSWORD_HASHING.algorithm === 'scrypt');
check('only scrypt is supported', PASSWORD_HASHING.supportedAlgorithms.length === 1
  && PASSWORD_HASHING.supportedAlgorithms[0] === 'scrypt');
check('keylen is 64', PASSWORD_HASHING.keylen === 64);
check('salt is 16 bytes', PASSWORD_HASHING.saltBytes === 16);

console.log('\n2. hashPassword / verifyPassword round-trip');
const pw = 'YorBuddy-Test-Passphrase-9x!';
const h = hashPassword(pw);
check('produced hash has scrypt prefix', h.startsWith('scrypt$'));
check('produced hash has 3 segments', h.split('$').length === 3);
check('correct password verifies', verifyPassword(pw, h) === true);
check('incorrect password rejected', verifyPassword('not-the-password', h) === false);
check('same password hashes differently (random salt)', hashPassword(pw) !== hashPassword(pw));

console.log('\n3. Real verifyPassword accepts null/undefined safely');
check('null hash returns false', verifyPassword(pw, null) === false);
check('undefined hash returns false', verifyPassword(pw, undefined) === false);
check('empty hash returns false', verifyPassword(pw, '') === false);
check('empty password returns false', verifyPassword('', h) === false);

console.log('\n4. Unsupported formats rejected by the real implementation');
const unsupported = [
  ['argon2id placeholder', 'argon2id$hashed$usr-b9'],
  ['bcrypt', '$2b$10$abcdefghijklmnopqrstuvwxyz0123456789012345678901234'],
  ['plain text', 'password123'],
  ['scrypt with bad hex', 'scrypt$nothex$alsonothex'],
  ['scrypt missing segment', 'scrypt$abcd'],
];
for (const [label, value] of unsupported) {
  let threw = false;
  let r;
  try {
    r = verifyPassword('anything', value);
  } catch {
    threw = true;
  }
  check(`${label}: false, no throw`, threw === false && r === false);
}

console.log('\n5. Upgrade detection');
check('scrypt does not need upgrade', passwordHashNeedsUpgrade(h) === false);
check('argon2id placeholder needs upgrade', passwordHashNeedsUpgrade('argon2id$hashed$usr-b9') === true);
check('null needs upgrade', passwordHashNeedsUpgrade(null) === true);
check('getPasswordHashAlgorithm(scrypt) === scrypt', getPasswordHashAlgorithm(h) === 'scrypt');
check('getPasswordHashAlgorithm(null) === null', getPasswordHashAlgorithm(null) === null);

console.log('\n6. Unicode / length edge cases');
for (const s of ['a'.repeat(8), 'pässwörd-ünicode-1234', 'x'.repeat(128), '   spaces   ']) {
  const hh = hashPassword(s);
  check(`round-trip len=${s.length}`, verifyPassword(s, hh) === true);
}

console.log('\n=== SUMMARY ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
