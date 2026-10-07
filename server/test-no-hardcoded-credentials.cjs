/**
 * ============================================================================
 * Credential Hygiene Guard
 * ============================================================================
 *
 * Static scan that fails the build if a hard-coded credential reappears in the
 * repository. Intended to run in CI alongside the other tests.
 *
 * It reports file paths and line numbers ONLY — never the matched value.
 *
 * Scope: source, tests, fixtures, seeds, scripts and docs. Excludes
 * node_modules, dist, backups (local-only dumps) and lockfiles.
 *
 * Run: node server/test-no-hardcoded-credentials.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.vite', 'backups']);

const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.json',
  '.md', '.sql', '.yml', '.yaml', '.txt', '.html',
]);

// A password assignment whose right-hand side is a non-empty string literal.
// Allow-list: obviously-fake placeholders and deliberate invalid inputs.
const PASSWORD_ASSIGN = /(?:new_)?password\s*[:=]\s*(['"`])((?:(?!\1).)+)\1/gi;

const ALLOWED_VALUES = new Set([
  'short',              // deliberate invalid input for length validation
  'change-me',          // documented placeholder
  'password',           // generic placeholder used in docs
  'MY_PASSWORD',
  '',
]);

const CREDENTIAL_PATTERNS = [
  ['bcrypt hash', /\$2[aby]\$\d\d\$[./A-Za-z0-9]{53}/],
  ['argon2 hash', /\$argon2(?:id|i|d)\$/],
  ['jwt literal', /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./],
  ['openai-style key', /\bsk-[A-Za-z0-9]{20,}\b/],
  ['razorpay live/test key', /\brzp_(?:test|live)_[A-Za-z0-9]{10,}\b/],
  ['telegram bot token', /\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/],
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['aws access key', /\bAKIA[0-9A-Z]{16}\b/],
];

const findings = [];

function scanFile(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');

  // .env.example is documentation; it must not contain real values but is
  // allowed to contain placeholder text.
  let lines;
  try {
    lines = fs.readFileSync(filePath, 'utf8').split('\n');
  } catch {
    return;
  }

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;

    PASSWORD_ASSIGN.lastIndex = 0;
    let m;
    while ((m = PASSWORD_ASSIGN.exec(line)) !== null) {
      const value = m[2];
      if (ALLOWED_VALUES.has(value)) continue;
      // Ignore values that are clearly interpolations / references.
      if (/[$<{%]/.test(value)) continue;
      findings.push({ rel, lineNo, kind: 'hard-coded password literal' });
    }

    for (const [kind, rx] of CREDENTIAL_PATTERNS) {
      if (rx.test(line)) findings.push({ rel, lineNo, kind });
    }
  });
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!TEXT_EXT.has(ext)) continue;
      scanFile(path.join(dir, entry.name));
    }
  }
}

console.log('\n=== CREDENTIAL HYGIENE GUARD ===\n');
walk(ROOT);

if (findings.length === 0) {
  console.log('  PASS: no hard-coded credentials found');
  console.log('\n=== SUMMARY ===');
  console.log('Passed: 1, Failed: 0');
  process.exit(0);
}

console.log(`  FAIL: ${findings.length} potential hard-coded credential(s) found:\n`);
for (const f of findings) {
  console.log(`    ${f.rel}:${f.lineNo}  [${f.kind}]`);
}
console.log('\n  Values are intentionally not printed.');
console.log('\n=== SUMMARY ===');
console.log(`Passed: 0, Failed: ${findings.length}`);
process.exit(1);
