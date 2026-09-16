import express, { Express } from 'express';
import { env } from './config/env.js';
import { helmetMiddleware, corsMiddleware, compressionMiddleware, apiLimiter, requestLogger } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthCheck, apiInfo } from './routes/health.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import buddyRoutes from './routes/buddies.js';
import bookingRoutes from './routes/bookings.js';
import paymentRoutes from './routes/payments.js';
import membershipRoutes from './routes/memberships.js';
import { checkAuthSchema } from './middleware/auth.js';

/**
 * Create and configure the Express application.
 */
export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmetMiddleware);
  app.use(corsMiddleware);

  // Body parsing
  // Save raw body for webhook signature verification (must be before JSON parsing)
  app.use(express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      if (req.url?.startsWith('/api/payments/webhook')) {
        req.rawBody = buf.toString('utf8');
      }
    },
  }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Note: webhook route uses the rawBody saved above

  // Compression
  app.use(compressionMiddleware);

  // Request logging (development only)
  app.use(requestLogger);

  // Rate limiting
  app.use('/api/', apiLimiter);

  // Health check (no auth required)
  app.get('/api/health', healthCheck);
  app.get('/api', apiInfo);

  // Authentication routes
  app.use('/api/auth', authRoutes);

  // User profile routes
  app.use('/api/users', userRoutes);

  // Buddy discovery routes
  app.use('/api/buddies', buddyRoutes);

  // Booking routes
  app.use('/api/bookings', bookingRoutes);

  // Payment routes
  app.use('/api/payments', paymentRoutes);

  // Membership routes
  app.use('/api/memberships', membershipRoutes);

  // API routes will be added here in subsequent steps
  // app.use('/api/payments', paymentRoutes);
  // app.use('/api/chat', chatRoutes);
  // app.use('/api/reviews', reviewRoutes);
  // app.use('/api/kyc', kycRoutes);
  // app.use('/api/safety', safetyRoutes);
  // app.use('/api/admin', adminRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Centralized error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server.
 */
export function startServer(): ReturnType<Express['listen']> {
  const app = createApp();

  // Check auth schema on startup
  checkAuthSchema();

  const server = app.listen(env.PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║        YorBuddy API Server               ║');
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
    console.log(`  Environment: ${env.NODE_ENV}`);
    console.log(`  Port:        ${env.PORT}`);
    console.log(`  Frontend:    ${env.CLIENT_URL}`);
    console.log(`  Health:      http://localhost:${env.PORT}/api/health`);
    console.log('');
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n[SERVER] ${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('[SERVER] Closed. Process terminated.');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('[SERVER] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('[SERVER] Uncaught Exception:', err);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[SERVER] Unhandled Rejection:', reason);
  });

  return server;
}
