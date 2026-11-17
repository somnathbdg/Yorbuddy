import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aiFriendRegistrationSchema,
  buildAiFriendUserInsert,
  compensateAiFriendRegistration,
  finalizeAiFriendRegistration,
} from './src/services/aiFriendRegistration.js';

const validInput = {
  email: 'person@example.com',
  password: 'StrongPass123',
  full_name: 'Test Person',
};

test('AI Friend registration rejects missing adult_confirmed consent', () => {
  assert.throws(() => aiFriendRegistrationSchema.parse(validInput));
});

test('AI Friend registration rejects adult_confirmed=false', () => {
  assert.throws(() => aiFriendRegistrationSchema.parse({ ...validInput, adult_confirmed: false }));
});

test('AI Friend registration accepts explicit adult consent', () => {
  assert.equal(aiFriendRegistrationSchema.parse({ ...validInput, adult_confirmed: true }).adult_confirmed, true);
});

test('adult consent timestamp is included in the database insert payload', () => {
  const confirmedAt = '2026-11-04T06:30:00.000Z';
  const row = buildAiFriendUserInsert({
    email: validInput.email,
    password_hash: 'hashed-password',
    full_name: validInput.full_name,
    phone: null,
  }, confirmedAt);

  assert.equal(row.ai_friend_adult_confirmed_at, confirmedAt);
  assert.equal(row.role, 'user');
});

test('refresh-token insert failure triggers compensating cleanup and preserves original error', async () => {
  const calls: string[] = [];
  const originalError = new Error('refresh token insert failed');

  await assert.rejects(
    finalizeAiFriendRegistration({
      userId: 'user-1',
      createSession: async (setTokenId) => { setTokenId('token-1'); throw originalError; },
      assignFreeAccess: async () => { calls.push('assign-free-access'); },
      cleanup: async (tokenId) => {
        assert.equal(tokenId, 'token-1');
        calls.push('delete-refresh-token');
        calls.push('delete-free-access');
        calls.push('delete-user');
      },
    }),
    (error) => error === originalError,
  );

  assert.deepEqual(calls, ['delete-refresh-token', 'delete-free-access', 'delete-user']);
});

test('free-access assignment failure triggers cleanup including inserted refresh token', async () => {
  const calls: string[] = [];
  const originalError = new Error('free access assignment failed');

  await assert.rejects(
    finalizeAiFriendRegistration({
      userId: 'user-2',
      createSession: async (setTokenId) => { setTokenId('token-2'); return { tokenId: 'token-2', result: 'session' }; },
      assignFreeAccess: async () => { throw originalError; },
      cleanup: async (tokenId) => {
        assert.equal(tokenId, 'token-2');
        calls.push('delete-refresh-token');
        calls.push('delete-free-access');
        calls.push('delete-user');
      },
    }),
    (error) => error === originalError,
  );

  assert.deepEqual(calls, ['delete-refresh-token', 'delete-free-access', 'delete-user']);
});

test('cleanup continues after individual deletion failures and logs them', async () => {
  const calls: string[] = [];
  const logged: unknown[][] = [];

  await compensateAiFriendRegistration({
    userId: 'user-3',
    tokenId: 'token-3',
    deleteRefreshToken: async () => { calls.push('refresh'); return { error: { message: 'refresh cleanup failed' } }; },
    deleteFreeAccess: async () => { calls.push('membership'); throw new Error('membership cleanup threw'); },
    deleteUser: async () => { calls.push('user'); return { error: null }; },
    logger: { error: (...args: unknown[]) => logged.push(args) },
  });

  assert.deepEqual(calls, ['refresh', 'membership', 'user']);
  assert.equal(logged.length, 1);
  assert.match(String(logged[0][0]), /Compensating cleanup incomplete/);
  assert.match(String(logged[0][1]), /refresh cleanup failed/);
  assert.match(String(logged[0][1]), /membership cleanup threw/);
});

test('AI Friend registration rejects invalid email and weak password', () => {
  assert.throws(() => aiFriendRegistrationSchema.parse({ ...validInput, email: 'not-an-email', adult_confirmed: true }));
  assert.throws(() => aiFriendRegistrationSchema.parse({ ...validInput, password: 'short', adult_confirmed: true }));
});

test('AI Friend registration rejects unknown fields and oversized names', () => {
  assert.throws(() => aiFriendRegistrationSchema.parse({ ...validInput, adult_confirmed: true, role: 'admin' }));
  assert.throws(() => aiFriendRegistrationSchema.parse({ ...validInput, full_name: 'x'.repeat(101), adult_confirmed: true }));
});

test('empty optional phone is accepted and user insert remains role=user', () => {
  const parsed = aiFriendRegistrationSchema.parse({ ...validInput, phone: '', adult_confirmed: true });
  assert.equal(parsed.phone, '');
  const row = buildAiFriendUserInsert({ email: parsed.email, password_hash: 'hash', full_name: parsed.full_name, phone: null });
  assert.equal(row.role, 'user');
});
