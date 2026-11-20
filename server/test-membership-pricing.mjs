import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./src/services/membershipService.ts', import.meta.url), 'utf8');
const expected = {
  TRIAL_1D: { amount: 4900, period: '1 day' },
  WEEK_1: { amount: 29900, period: '7 days' },
  MONTH_1: { amount: 49900, period: '30 days' },
};
for (const [id, plan] of Object.entries(expected)) {
  const pattern = new RegExp(id + ":\\s*\\{[^}]*amount:\\s*" + plan.amount + "\\b[^}]*period:\\s*'" + plan.period + "'");
  assert.match(source, pattern, id + ' amount/period must match the approved price table');
}
assert.match(source, /expiry\\.setDate\\(expiry\\.getDate\\(\\) \\+ 1\\)/, 'Free Access must expire after one day');
assert.match(source, /if \\(plan\\.period === '1 day'\\) d\\.setDate\\(d\\.getDate\\(\\) \\+ 1\\)/, 'paid 1-day plan must expire after one day');
assert.doesNotMatch(source, /expiry\\.setDate\\(expiry\\.getDate\\(\\) \\+ 10\\)/, 'legacy ten-day free period must not remain');
console.log('PASS: backend membership pricing and 1-day expiry match approved configuration');
