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
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
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
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  };
}

export const env = loadEnv();

/**
 * Fail closed when production is configured with weak or reused JWT secrets.
 * Each secret must be independently generated, unique, and at least 32 chars.
 */
if (env.NODE_ENV === 'production') {
  const insecureDefaults = new Set([
    'dev-access-secret-change-me',
    'dev-refresh-secret-change-me',
    'change-me',
    'changeme',
    'secret',
    'password',
  ]);
  const accessSecret = env.JWT_ACCESS_SECRET.trim();
  const refreshSecret = env.JWT_REFRESH_SECRET.trim();
  const problems: string[] = [];

  if (accessSecret.length < 32 || insecureDefaults.has(accessSecret.toLowerCase())) {
    problems.push('JWT_ACCESS_SECRET must be a unique secret of at least 32 characters.');
  }
  if (refreshSecret.length < 32 || insecureDefaults.has(refreshSecret.toLowerCase())) {
    problems.push('JWT_REFRESH_SECRET must be a unique secret of at least 32 characters.');
  }
  if (accessSecret === refreshSecret) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
  }

  if (problems.length > 0) {
    throw new Error(`Unsafe production JWT configuration: ${problems.join(' ')}`);
  }
}
