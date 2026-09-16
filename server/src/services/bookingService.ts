import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { z } from 'zod';
import { BadRequest, NotFound, Forbidden, Conflict } from '../middleware/errorHandler.js';
import { checkUserMembership } from './membershipService.js';

// ========== Validation Schemas ==========

const createBookingSchema = z.object({
  buddy_id: z.string().uuid('Invalid buddy ID'),
  activity_id: z.string().uuid('Invalid activity ID'),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  booking_time: z.string().max(20, 'Invalid time format'),
  duration_hours: z.number().int().min(1, 'Minimum 1 hour').max(8, 'Maximum 8 hours'),
  location_name: z.string().min(1, 'Location name is required').max(200),
  location_address: z.string().min(1, 'Location address is required').max(500),
  special_notes: z.string().max(1000).optional(),
}).strict();

const updateBookingStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'rejected']),
}).strict();

const bookingIdSchema = z.object({
  id: z.string().uuid('Invalid booking ID'),
});

// ========== Helper Functions ==========

function generateBookingCode(): string {
  const prefix = 'YB';
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${random}`;
}

async function getBuddyProfile(supabase: any, buddyId: string) {
  const { data: buddyUser, error: buddyError } = await supabase
    .from('users')
    .select('id, role, is_active')
    .eq('id', buddyId)
    .eq('role', 'buddy')
    .eq('is_active', true)
    .single();

  if (buddyError || !buddyUser) {
    return null;
  }

  const { data: buddyProfile, error: profileError } = await supabase
    .from('buddy_profiles')
    .select('id, hourly_rate')
    .eq('user_id', buddyId)
    .single();

  if (profileError || !buddyProfile) {
    return null;
  }

  return {
    userId: buddyUser.id,
    hourlyRate: buddyProfile.hourly_rate,
  };
}

async function checkOverlap(supabase: any, buddyId: string, bookingDate: string, bookingTime: string, durationHours: number, excludeBookingId?: string) {
  // Get all active bookings for this buddy on this date
  const { data: existingBookings, error } = await supabase
    .from('bookings')
    .select('id, booking_time, duration_hours, status')
    .eq('buddy_id', buddyId)
    .eq('booking_date', bookingDate)
    .in('status', ['pending', 'confirmed']);

  if (error) {
    throw error;
  }

  if (!existingBookings || existingBookings.length === 0) {
    return false;
  }

  // Parse time to minutes for overlap check
  const parseTime = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = hours * 60 + (minutes || 0);
    if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60;
    return totalMinutes;
  };

  const newStart = parseTime(bookingTime);
  const newEnd = newStart + durationHours * 60;

  for (const booking of existingBookings) {
    if (excludeBookingId && booking.id === excludeBookingId) continue;
    
    const existingStart = parseTime(booking.booking_time);
    const existingEnd = existingStart + booking.duration_hours * 60;

    // Check overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      return true;
    }
  }

  return false;
}

function canCancel(status: string): boolean {
  return status === 'pending' || status === 'confirmed';
}

function canUpdateStatus(currentStatus: string, newStatus: string): boolean {
  const allowedTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'rejected', 'cancelled'],
    confirmed: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    rejected: [],
  };
  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
}

// ========== Controllers ==========

export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createBookingSchema.parse(req.body);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const supabase = getSupabase();

    // Check companion membership (skip for admin)
    if (userRole !== 'admin') {
      const companionCheck = await checkUserMembership(supabase, userId);
      if (!companionCheck.isActive) {
        throw Forbidden('Active membership is required to book a Buddy.');
      }
    }

    // Verify buddy exists and get hourly rate
    const buddy = await getBuddyProfile(supabase, input.buddy_id);
    if (!buddy) {
      throw NotFound('Buddy not found or not available for bookings.');
    }

    // Check buddy membership (skip for admin)
    if (userRole !== 'admin') {
      const buddyCheck = await checkUserMembership(supabase, buddy.userId);
      if (!buddyCheck.isActive) {
        throw Forbidden('This Buddy does not have an active membership and cannot accept bookings.');
      }
    }

    // Verify activity exists
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('id')
      .eq('id', input.activity_id)
      .single();

    if (activityError || !activity) {
      throw NotFound('Activity not found.');
    }

    // Validate date is not in the past
    const bookingDate = new Date(input.booking_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      throw BadRequest('Booking date cannot be in the past.');
    }

    // Check for overlapping bookings
    const hasOverlap = await checkOverlap(supabase, input.buddy_id, input.booking_date, input.booking_time, input.duration_hours);
    if (hasOverlap) {
      throw Conflict('This buddy is already booked for an overlapping time slot on this date.');
    }

    // Calculate pricing server-side
    const hourlyRate = buddy.hourlyRate;
    const bookingAmount = hourlyRate * input.duration_hours;
    const platformFee = 0;
    const totalAmount = bookingAmount + platformFee;

    // Generate booking code
    const bookingCode = generateBookingCode();

    // Create booking
    const { data: newBooking, error } = await supabase
      .from('bookings')
      .insert({
        booking_code: bookingCode,
        user_id: userId,
        buddy_id: input.buddy_id,
        activity_id: input.activity_id,
        booking_date: input.booking_date,
        booking_time: input.booking_time,
        duration_hours: input.duration_hours,
        hourly_rate: hourlyRate,
        booking_amount: bookingAmount,
        platform_fee: platformFee,
        total_amount: totalAmount,
        status: 'pending',
        location_name: input.location_name,
        location_address: input.location_address,
        special_notes: input.special_notes || null,
        meet_safety_acknowledged: true,
        has_review: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      data: newBooking,
      message: 'Booking created successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function getBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const supabase = getSupabase();

    // Query based on role
    let query = supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (userRole === 'user') {
      query = query.eq('user_id', userId);
    } else if (userRole === 'buddy') {
      query = query.eq('buddy_id', userId);
    }
    // Admin sees all

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.status(200).json({
      data: data || [],
      meta: {
        total: data?.length || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getBookingById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = bookingIdSchema.parse(req.params);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const supabase = getSupabase();

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !booking) {
      throw NotFound('Booking not found.');
    }

    // Check authorization
    const isOwner = booking.user_id === userId;
    const isBuddy = booking.buddy_id === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isBuddy && !isAdmin) {
      throw Forbidden('You do not have permission to view this booking.');
    }

    res.status(200).json({
      data: booking,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateBookingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = bookingIdSchema.parse(req.params);
    const { status } = updateBookingStatusSchema.parse(req.body);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const supabase = getSupabase();

    // Get current booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      throw NotFound('Booking not found.');
    }

    // Check authorization
    const isOwner = booking.user_id === userId;
    const isBuddy = booking.buddy_id === userId;
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isBuddy && !isAdmin) {
      throw Forbidden('You do not have permission to update this booking.');
    }

    // Check status transition validity
    if (!canUpdateStatus(booking.status, status)) {
      throw BadRequest(`Cannot transition from '${booking.status}' to '${status}'.`);
    }

    // Additional rules based on role
    if (status === 'cancelled') {
      // Only owner or admin can cancel
      if (!isOwner && !isAdmin) {
        throw Forbidden('Only the booking owner or admin can cancel a booking.');
      }
      // Cannot cancel already cancelled/completed/rejected
      if (!canCancel(booking.status)) {
        throw BadRequest(`Cannot cancel a booking with status '${booking.status}'.`);
      }
    }

    if (status === 'confirmed' || status === 'rejected') {
      // Only buddy or admin can confirm/reject
      if (!isBuddy && !isAdmin) {
        throw Forbidden('Only the buddy or admin can confirm or reject a booking.');
      }
    }

    if (status === 'completed') {
      // Only buddy or admin can mark completed
      if (!isBuddy && !isAdmin) {
        throw Forbidden('Only the buddy or admin can mark a booking as completed.');
      }
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.status(200).json({
      data: updatedBooking,
      message: `Booking status updated to '${status}'`,
    });
  } catch (err) {
    next(err);
  }
}

// Export schemas for route validation
export { createBookingSchema, updateBookingStatusSchema, bookingIdSchema };
