import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./src/services/membershipService.ts', import.meta.url), 'utf8');
const expected = [
  "TRIAL_1D: { id: 'TRIAL_1D', name: '1 Day Access', amount: 4900, period: '1 day' }",
  "WEEK_1: { id: 'WEEK_1', name: '1 Week', amount: 29900, period: '7 days' }",
  "MONTH_1: { id: 'MONTH_1', name: '1 Month', amount: 49900, period: '30 days' }",
];
for (const plan of expected) assert.ok(source.includes(plan), 'missing approved backend plan: ' + plan);
assert.ok(source.includes('expiry.setDate(expiry.getDate() + 1);'), 'Free Access must expire after one day');
assert.ok(source.includes("if (plan.period === '1 day') d.setDate(d.getDate() + 1);"), 'paid 1-day plan must expire after one day');
assert.ok(!source.includes('expiry.setDate(expiry.getDate() + 10);'), 'legacy ten-day free period must not remain');
console.log('PASS: backend membership pricing and 1-day expiry match approved configuration');
