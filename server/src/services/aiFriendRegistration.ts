import { z } from 'zod';

export const aiFriendRegistrationSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  full_name: z.string().trim().min(1, 'Full name is required').max(100),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  adult_confirmed: z.literal(true),
}).strict();

export function buildAiFriendUserInsert(input: {
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
}, confirmedAt = new Date().toISOString()) {
  return {
    ...input,
    role: 'user' as const,
    ai_friend_adult_confirmed_at: confirmedAt,
  };
}

type CleanupResult = { error: { message: string } | null };
type CleanupLogger = { error: (...args: unknown[]) => void };

export async function compensateAiFriendRegistration(input: {
  userId: string;
  tokenId: string | null;
  deleteRefreshToken: () => Promise<CleanupResult>;
  deleteFreeAccess: () => Promise<CleanupResult>;
  deleteUser: () => Promise<CleanupResult>;
  logger?: CleanupLogger;
}): Promise<void> {
  const failures: string[] = [];
  const attempt = async (label: string, action: () => Promise<CleanupResult>) => {
    try {
      const result = await action();
      if (result.error) failures.push(label + ': ' + result.error.message);
    } catch (error) {
      failures.push(label + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  if (input.tokenId) await attempt('refresh token', input.deleteRefreshToken);
  await attempt('free access', input.deleteFreeAccess);
  await attempt('user', input.deleteUser);

  if (failures.length) {
    (input.logger ?? console).error(
      '[AI_FRIEND_REGISTER] Compensating cleanup incomplete:',
      failures.join('; '),
    );
  }
}

export async function finalizeAiFriendRegistration<T>(input: {
  userId: string;
  createSession: () => Promise<{ result: T; tokenId: string }>;
  assignFreeAccess: () => Promise<void>;
  cleanup: (tokenId: string | null) => Promise<void>;
}): Promise<T> {
  let tokenId: string | null = null;
  try {
    const session = await input.createSession();
    tokenId = session.tokenId;
    await input.assignFreeAccess();
    return session.result;
  } catch (error) {
    await input.cleanup(tokenId);
    throw error;
  }
}
