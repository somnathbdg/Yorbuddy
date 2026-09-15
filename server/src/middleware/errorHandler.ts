import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

/**
 * Custom application error class.
 */
export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found error helper.
 */
export function NotFound(message: string = 'Resource not found'): AppError {
  return new AppError(message, 404, 'NOT_FOUND');
}

/**
 * Bad Request error helper.
 */
export function BadRequest(message: string = 'Bad request'): AppError {
  return new AppError(message, 400, 'BAD_REQUEST');
}

/**
 * Unauthorized error helper.
 */
export function Unauthorized(message: string = 'Unauthorized'): AppError {
  return new AppError(message, 401, 'UNAUTHORIZED');
}

/**
 * Forbidden error helper.
 */
export function Forbidden(message: string = 'Forbidden'): AppError {
  return new AppError(message, 403, 'FORBIDDEN');
}

/**
 * Conflict error helper.
 */
export function Conflict(message: string = 'Resource already exists'): AppError {
  return new AppError(message, 409, 'CONFLICT');
}

/**
 * Centralized error handler middleware.
 * Must be registered AFTER all routes.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  } else if (err instanceof ZodError) {
    // Zod validation error
    statusCode = 400;
    message = 'Request validation failed';
    code = 'VALIDATION_ERROR';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    // JSON parse error
    statusCode = 400;
    message = 'Invalid JSON in request body';
    code = 'INVALID_JSON';
  }

  // Log error in development
  if (env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${req.method} ${req.path}:`, {
      code,
      message: err.message,
      stack: err.stack,
    });
  }

  // In production, log full error details but don't expose to client
  if (env.NODE_ENV === 'production') {
    // TODO: send to Sentry/Logtail
    console.error(`[ERROR] ${req.method} ${req.path}: ${err.message}`);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(env.NODE_ENV === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
    },
  });
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
