import { Request, Response } from 'express';
import { successResponse } from '../utils/apiResponse.js';
import { getSupabase } from '../config/database.js';

/**
 * Health check endpoint.
 * Returns server status, database connectivity, and uptime.
 */
export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  // Check database connectivity
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('activities').select('id').limit(1);
    if (error && error.code !== '42P01') {
      // 42P01 = table doesn't exist yet (expected before migrations)
      health.database = 'error';
      health.database_error = error.message;
      health.status = 'degraded';
    } else {
      health.database = 'connected';
    }
  } catch (err) {
    health.database = 'unavailable';
    health.status = 'degraded';
  }

  // Check auth schema
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('users').select('password_hash').limit(0);
    if (error && error.message.includes('password_hash')) {
      health.auth_schema = 'migration_required';
      health.auth_migration = 'Run server/src/db/migrations/001_add_auth_password.sql in Supabase SQL Editor';
    } else {
      health.auth_schema = 'ready';
    }
  } catch (err) {
    health.auth_schema = 'unknown';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  successResponse(res, health, statusCode);
}

/**
 * Root API endpoint.
 * Returns API info and available routes.
 */
export function apiInfo(_req: Request, res: Response): void {
  successResponse(res, {
    name: 'YorBuddy API',
    version: '1.0.0',
    description: 'Verified friendship and companionship platform in India',
    documentation: '/api/health',
    status: 'operational',
  });
}
