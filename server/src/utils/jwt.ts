import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UserRole } from '../types/auth.js';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  tokenId: string;
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

/**
 * Generate a short-lived access token.
 */
export function generateAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  const fullPayload: AccessTokenPayload = { ...payload, type: 'access' };
  return jwt.sign(fullPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    issuer: 'yorbuddy-api',
  } as SignOptions);
}

/**
 * Generate a long-lived refresh token.
 * Returns the token and its internal ID for database tracking.
 */
export function generateRefreshToken(userId: string): { token: string; tokenId: string } {
  const tokenId = crypto.randomUUID();
  const payload: RefreshTokenPayload = { userId, type: 'refresh', tokenId };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
    issuer: 'yorbuddy-api',
  } as SignOptions);
  return { token, tokenId };
}

/**
 * Verify an access token and return its payload.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'yorbuddy-api',
  }) as AccessTokenPayload;
  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return payload;
}

/**
 * Verify a refresh token and return its payload.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'yorbuddy-api',
  }) as RefreshTokenPayload;
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return payload;
}
