import { Router } from 'express';
import {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
} from '../services/bookingService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/bookings
 * Create a new booking.
 */
router.post('/', authenticate, createBooking);

/**
 * GET /api/bookings
 * Get bookings for the authenticated user (based on role).
 */
router.get('/', authenticate, getBookings);

/**
 * GET /api/bookings/:id
 * Get a specific booking by ID.
 */
router.get('/:id', authenticate, getBookingById);

/**
 * PATCH /api/bookings/:id
 * Update booking status.
 */
router.patch('/:id', authenticate, updateBookingStatus);

export default router;
