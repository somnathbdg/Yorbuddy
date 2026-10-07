import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { env } from '../config/env.js';
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

// ========== Pagination Constants & Helper ==========

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse and validate pagination parameters from query string.
 * Returns safe defaults for missing/invalid params.
 * Throws BadRequest for malformed values.
 */
export function parsePaginationParams(query: Record<string, unknown>): { page: number; limit: number } {
  let page = DEFAULT_PAGE;
  let limit = DEFAULT_LIMIT;

  if (query.page !== undefined) {
    const raw = String(query.page);
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw BadRequest('Invalid page parameter. Must be a positive integer.');
    }
    page = parsed;
  }

  if (query.limit !== undefined) {
    const raw = String(query.limit);
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw BadRequest('Invalid limit parameter. Must be a positive integer.');
    }
    if (parsed > MAX_LIMIT) {
      throw BadRequest(`Limit cannot exceed ${MAX_LIMIT}.`);
    }
    limit = parsed;
  }

  return { page, limit };
}

// ========== Helper: Build safe public buddy summary ==========
// Exposes ONLY public, non-sensitive buddy info needed for booking UI.
// Deliberately excludes: email, phone, password_hash, tokens, dob, doc URLs, etc.
function buildBuddySummary(userRow: any, profileRow: any, buddyProfileRow: any) {
  if (!userRow) return null;
  const summary: Record<string, any> = {
    id: userRow.id,
    full_name: userRow.full_name,
  };
  if (profileRow) {
    summary.photo_url = profileRow.photo_url;
    summary.city = profileRow.city;
    summary.area = profileRow.area;
  }
  if (buddyProfileRow) {
    summary.hourly_rate = buddyProfileRow.hourly_rate;
    summary.rating = buddyProfileRow.rating;
    summary.review_count = buddyProfileRow.review_count;
    summary.is_verified = buddyProfileRow.is_verified;
    summary.badge_text = buddyProfileRow.badge_text;
    summary.response_time = buddyProfileRow.response_time;
  }
  return summary;
}

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

async function checkOverlap(supabase: any, buddyId: string, userId: string, bookingDate: string, bookingTime: string, durationHours: number, excludeBookingId?: string): Promise<{ hasOverlap: boolean; conflictType: 'user' | 'buddy' | null }> {
  // Get all active bookings for this buddy OR this user on this date
  // Only pending and confirmed bookings block slots - expired/cancelled/rejected do not
  const { data: existingBookings, error } = await supabase
    .from('bookings')
    .select('id, booking_time, duration_hours, status, user_id, buddy_id')
    .eq('booking_date', bookingDate)
    .in('status', ['pending', 'confirmed']);

  if (error) {
    throw error;
  }

  if (!existingBookings || existingBookings.length === 0) {
    return { hasOverlap: false, conflictType: null };
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

    // Check overlap only for same buddy OR same user
    const sameBuddy = booking.buddy_id === buddyId;
    const sameUser = booking.user_id === userId;
    if (!sameBuddy && !sameUser) continue;
    
    const existingStart = parseTime(booking.booking_time);
    const existingEnd = existingStart + booking.duration_hours * 60;

    // Check overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      return { 
        hasOverlap: true, 
        conflictType: sameUser ? 'user' : 'buddy'
      };
    }
  }

  return { hasOverlap: false, conflictType: null };
}

function canCancel(status: string): boolean {
  return status === 'pending' || status === 'confirmed';
}

function canUpdateStatus(currentStatus: string, newStatus: string): boolean {
  const allowedTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'rejected', 'cancelled', 'expired'],
    confirmed: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    rejected: [],
    expired: [],
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



    // Verify buddy exists and get hourly rate
    const buddy = await getBuddyProfile(supabase, input.buddy_id);
    if (!buddy) {
      throw NotFound('Buddy not found or not available for bookings.');
    }

    // Prevent self-booking: a user cannot book themselves as a buddy
    if (buddy.userId === userId) {
      throw Conflict('You cannot book yourself as a buddy.');
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
    const overlap = await checkOverlap(supabase, input.buddy_id, userId, input.booking_date, input.booking_time, input.duration_hours);
    if (overlap.hasOverlap) {
      if (overlap.conflictType === 'user') {
        throw Conflict('You already have a booking during this time. Please choose a different time slot.');
      } else {
        throw Conflict('This buddy is already booked for an overlapping time slot on this date.');
      }
    }

    // Calculate pricing server-side
    const hourlyRate = buddy.hourlyRate;
    const bookingAmount = hourlyRate * input.duration_hours;
    const platformFee = 0;
    const totalAmount = bookingAmount + platformFee;

    // Generate booking code
    const bookingCode = generateBookingCode();

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + env.BOOKING_EXPIRY_MINUTES * 60 * 1000);

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
        expires_at: expiresAt.toISOString(),
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

    // Parse pagination params (used for admin; non-admin roles get all their own bookings)
    const { page, limit } = parsePaginationParams(req.query);

    // Query based on role
    let query = supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }); // deterministic tiebreaker

    if (userRole === 'user') {
      query = query.eq('user_id', userId);
    } else if (userRole === 'buddy') {
      query = query.eq('buddy_id', userId);
    }
    // Admin sees all — apply pagination at the DB level
    if (userRole === 'admin') {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const bookings = data || [];
    const total = count ?? bookings.length;

    // Collect all unique buddy_ids from bookings
    const buddyIds = [...new Set(bookings.map((b: any) => b.buddy_id))];

    // Fetch user, profile, and buddy_profiles for all buddies in one batch
    let buddyUsers: any[] = [];
    let buddyProfiles: any[] = [];
    let buddyBuddyProfiles: any[] = [];

    if (buddyIds.length > 0) {
      const [usersRes, profilesRes, buddyProfilesRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, full_name')
          .in('id', buddyIds),
        supabase
          .from('profiles')
          .select('user_id, photo_url, city, area')
          .in('user_id', buddyIds),
        supabase
          .from('buddy_profiles')
          .select('user_id, hourly_rate, rating, review_count, is_verified, badge_text, response_time')
          .in('user_id', buddyIds),
      ]);
      buddyUsers = usersRes.data || [];
      buddyProfiles = profilesRes.data || [];
      buddyBuddyProfiles = buddyProfilesRes.data || [];
    }

    // Build a lookup map: buddy_id -> safe public buddy summary
    const buddyMap: Record<string, any> = {};
    for (const buddyId of buddyIds) {
      const user = buddyUsers.find((u: any) => u.id === buddyId);
      const profile = buddyProfiles.find((p: any) => p.user_id === buddyId);
      const buddyProfile = buddyBuddyProfiles.find((bp: any) => bp.user_id === buddyId);
      buddyMap[buddyId] = buildBuddySummary(user, profile, buddyProfile);
    }

    // Attach buddy summary to each booking (security: never expose private fields)
    const enrichedBookings = bookings.map((booking: any) => ({
      ...booking,
      buddy: buddyMap[booking.buddy_id] || null,
    }));

    // Build pagination metadata
    const totalPages = Math.ceil(total / limit);
    const isAdmin = userRole === 'admin';

    res.status(200).json({
      data: enrichedBookings,
      meta: {
        total,
        page: isAdmin ? page : 1,
        limit: isAdmin ? limit : enrichedBookings.length,
        totalPages: isAdmin ? totalPages : 1,
        hasNextPage: isAdmin ? page < totalPages : false,
        hasPreviousPage: isAdmin ? page > 1 : false,
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

    // Fetch safe public buddy summary
    const buddyId = booking.buddy_id;
    const [userRes, profileRes, buddyProfileRes] = await Promise.all([
      supabase.from('users').select('id, full_name').eq('id', buddyId).single(),
      supabase.from('profiles').select('user_id, photo_url, city, area').eq('user_id', buddyId).single(),
      supabase.from('buddy_profiles').select('user_id, hourly_rate, rating, review_count, is_verified, badge_text, response_time').eq('user_id', buddyId).single(),
    ]);

    const buddySummary = buildBuddySummary(
      userRes.data,
      profileRes.data || null,
      buddyProfileRes.data || null,
    );

    res.status(200).json({
      data: {
        ...booking,
        buddy: buddySummary,
      },
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
