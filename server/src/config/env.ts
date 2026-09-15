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
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  MSG91_AUTH_KEY: string;
  MSG91_SENDER_ID: string;
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
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || '',
    MSG91_SENDER_ID: process.env.MSG91_SENDER_ID || 'YORBUD',
  };
}

export const env = loadEnv();
