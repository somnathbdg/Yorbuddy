import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAuthenticatedUser } from '../src/middleware/auth.js';

const activeUser = {
  id: 'buddy-1',
  email: 'buddy@example.test',
  role: 'buddy',
  is_active: true,
  full_name: 'Test Buddy',
};

test('valid stale access token cannot authorize a currently suspended account', async () => {
  await assert.rejects(
    resolveAuthenticatedUser('buddy-1', async () => ({ ...activeUser, is_active: false })),
    (error: unknown) => {
      assert.equal((error as { statusCode?: number }).statusCode, 403);
      assert.match((error as Error).message, /deactivated/i);
      return true;
    },
  );
});

test('active user is hydrated from the current database record, not stale JWT claims', async () => {
  const user = await resolveAuthenticatedUser('buddy-1', async () => activeUser);
  assert.equal(user.id, activeUser.id);
  assert.equal(user.role, 'buddy');
  assert.equal(user.is_active, true);
  assert.equal(user.full_name, 'Test Buddy');
});

test('deleted user is rejected even when JWT signature is valid', async () => {
  await assert.rejects(
    resolveAuthenticatedUser('deleted-user', async () => null),
    (error: unknown) => {
      assert.equal((error as { statusCode?: number }).statusCode, 401);
      assert.match((error as Error).message, /no longer exists/i);
      return true;
    },
  );
});

test('database lookup failure fails closed', async () => {
  await assert.rejects(
    resolveAuthenticatedUser('buddy-1', async () => { throw new Error('database unavailable'); }),
    /database unavailable/,
  );
});
