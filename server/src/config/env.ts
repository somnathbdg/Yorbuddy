import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  CLIENT_URL: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_TTL: string;
  JWT_REFRESH_TTL: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  MSG91_AUTH_KEY: string;
  MSG91_SENDER_ID: string;
  EMAIL_PROVIDER: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  BOOKING_EXPIRY_MINUTES: number;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
}

const requiredEnvVars: (keyof EnvConfig)[] = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

function loadEnv(): EnvConfig {
  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    // In development, warn but don't crash (for initial setup)
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[ENV] Missing required env vars: ${missing.join(', ')}`);
      console.warn('[ENV] Using placeholder values for development. Set real values in .env file.');
    } else {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || '15m',
    JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL || '7d',
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || '',
    MSG91_SENDER_ID: process.env.MSG91_SENDER_ID || 'YORBUD',
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'console',
    EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@yorbuddy.in',
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'YorBuddy',
    BOOKING_EXPIRY_MINUTES: parseInt(process.env.BOOKING_EXPIRY_MINUTES || '30', 10),
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback',
  };
}

export const env = loadEnv();

/**
 * Warn if JWT secrets are still set to development defaults.
 * This helps prevent accidental production use of weak secrets.
 */
if (env.NODE_ENV === 'production') {
  if (env.JWT_ACCESS_SECRET === 'dev-access-secret-change-me') {
    console.error('[SECURITY WARNING] JWT_ACCESS_SECRET is still set to the default development value.');
    console.error('[SECURITY WARNING] Set a strong, unique JWT_ACCESS_SECRET in production.');
  }
  if (env.JWT_REFRESH_SECRET === 'dev-refresh-secret-change-me') {
    console.error('[SECURITY WARNING] JWT_REFRESH_SECRET is still set to the default development value.');
    console.error('[SECURITY WARNING] Set a strong, unique JWT_REFRESH_SECRET in production.');
  }
}
