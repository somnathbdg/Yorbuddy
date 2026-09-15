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
 * 100 requests per 15 minutes per IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
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
  max: 5,
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
