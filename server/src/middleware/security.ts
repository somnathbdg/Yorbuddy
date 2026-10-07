import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Helmet: sets security headers (X-Content-Type-Options, X-Frame-Options, etc.)
 * Disables Content-Security-Policy for API (not needed for JSON API).
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

/**
 * CORS: allow requests from frontend only.
 */
export const corsMiddleware = cors({
  origin: env.CLIENT_URL,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
});

/**
 * Compression: gzip responses to reduce payload size.
 */
export const compressionMiddleware = compression();

/**
 * Rate limiter: general API rate limiting.
 * 100 requests per 15 minutes per IP in production.
 * Relaxed for development/testing.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});

/**
 * Stricter rate limiter for auth endpoints.
 * 5 requests per 10 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // Relaxed for development/testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many attempts, please try again later.',
    },
  },
});

/**
 * Rate limiter for verification/OTP endpoints.
 * 5 requests per 10 minutes per IP in production.
 * Prevents brute-force of 6-digit codes when an attacker has a valid JWT.
 */
export const verificationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // Relaxed for development/testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many verification attempts, please try again later.',
    },
  },
});

/**
 * Rate limiter for Telegram webhook.
 * 30 requests per minute per IP — enough for legitimate Telegram retries
 * while providing basic abuse protection.
 */
export const telegramLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 30 : 200, // Relaxed for development/testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});

/**
 * Request logger (development only).
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV === 'development') {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${req.method}] ${req.path} ${res.statusCode} ${duration}ms`);
    });
  }
  next();
}
