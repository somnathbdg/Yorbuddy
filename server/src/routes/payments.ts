import { Router } from 'express';
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
} from '../services/paymentService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/payments/create-order
 * Create a Razorpay order for a booking.
 */
router.post('/create-order', authenticate, createOrder);

/**
 * POST /api/payments/verify
 * Verify Razorpay payment signature.
 */
router.post('/verify', authenticate, verifyPayment);

/**
 * GET /api/payments/status/:booking_id
 * Get payment status for a booking.
 */
router.get('/status/:booking_id', authenticate, getPaymentStatus);

/**
 * POST /api/payments/webhook
 * Razorpay webhook endpoint (no auth, uses signature verification).
 */
router.post('/webhook', handleWebhook);

export default router;
