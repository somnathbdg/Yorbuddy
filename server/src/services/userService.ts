import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { z } from 'zod';
import { BadRequest, NotFound } from '../middleware/errorHandler.js';

// ========== Validation Schemas ==========

const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100).optional(),
  phone: z.string().max(15).optional().nullable(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional().nullable(),
  gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  photo_url: z.string().url('Invalid URL').max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  area: z.string().max(100).optional().nullable(),
  languages: z.array(z.string().max(50)).max(20).optional(),
  interests: z.array(z.string().max(50)).max(50).optional(),
}).strict(); // Reject unknown fields

const updateBuddyProfileSchema = z.object({
  hourly_rate: z.number().int().min(0).max(10000).optional(),
  headline: z.string().max(200).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  response_time: z.string().max(50).optional().nullable(),
  badge_text: z.string().max(50).optional().nullable(),
  supported_activity_ids: z.array(z.string().uuid()).max(50).optional(),
  safety_pledge_signed: z.boolean().optional(),
}).strict();

// ========== Helper Functions ==========

function buildProfileResponse(userRow: any, profileRow: any, buddyProfileRow: any = null) {
  const response: Record<string, unknown> = {
    user: {
      id: userRow.id,
      email: userRow.email,
      full_name: userRow.full_name,
      phone: userRow.phone,
      dob: userRow.dob,
      gender: userRow.gender,
      role: userRow.role,
      is_active: userRow.is_active,
      is_membership_paid: userRow.is_membership_paid,
      membership_paid_at: userRow.membership_paid_at,
      created_at: userRow.created_at,
      updated_at: userRow.updated_at,
    },
  };

  // Profile info
  if (profileRow) {
    response.profile = {
      id: profileRow.id,
      bio: profileRow.bio,
      photo_url: profileRow.photo_url,
      city: profileRow.city,
      area: profileRow.area,
      languages: profileRow.languages || [],
      interests: profileRow.interests || [],
      is_phone_verified: profileRow.is_phone_verified,
      is_email_verified: profileRow.is_email_verified,
      is_id_verified: profileRow.is_id_verified,
      created_at: profileRow.created_at,
    };
  } else {
    response.profile = null;
  }

  // Buddy profile info
  if (buddyProfileRow) {
    response.buddy_profile = {
      id: buddyProfileRow.id,
      hourly_rate: buddyProfileRow.hourly_rate,
      headline: buddyProfileRow.headline,
      bio: buddyProfileRow.bio,
      rating: buddyProfileRow.rating,
      review_count: buddyProfileRow.review_count,
      is_verified: buddyProfileRow.is_verified,
      verification_status: buddyProfileRow.verification_status,
      is_online: buddyProfileRow.is_online,
      response_time: buddyProfileRow.response_time,
      badge_text: buddyProfileRow.badge_text,
      supported_activity_ids: buddyProfileRow.supported_activity_ids || [],
      total_earnings: buddyProfileRow.total_earnings,
      profile_views: buddyProfileRow.profile_views,
      safety_pledge_signed: buddyProfileRow.safety_pledge_signed,
      created_at: buddyProfileRow.created_at,
    };
  } else {
    response.buddy_profile = null;
  }

  return response;
}

// ========== User Profile Controllers ==========

export async function getUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();

    // Fetch user
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      throw NotFound('User not found.');
    }

    // Fetch profile (may not exist yet)
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Fetch buddy profile (may not exist)
    const { data: buddyProfileRow } = await supabase
      .from('buddy_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    res.status(200).json({
      data: buildProfileResponse(userRow, profileRow, buddyProfileRow),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();
    const input = updateProfileSchema.parse(req.body);

    // Separate user fields from profile fields
    const userFields: Record<string, unknown> = {};
    const profileFields: Record<string, unknown> = {};

    // User table fields
    if (input.full_name !== undefined) userFields.full_name = input.full_name;
    if (input.phone !== undefined) userFields.phone = input.phone;
    if (input.dob !== undefined) userFields.dob = input.dob;
    if (input.gender !== undefined) userFields.gender = input.gender;

    // Profile table fields
    if (input.bio !== undefined) profileFields.bio = input.bio;
    if (input.photo_url !== undefined) profileFields.photo_url = input.photo_url;
    if (input.city !== undefined) profileFields.city = input.city;
    if (input.area !== undefined) profileFields.area = input.area;
    if (input.languages !== undefined) profileFields.languages = input.languages;
    if (input.interests !== undefined) profileFields.interests = input.interests;

    // Update user record if needed
    if (Object.keys(userFields).length > 0) {
      const { error: userError } = await supabase
        .from('users')
        .update(userFields)
        .eq('id', userId);

      if (userError) {
        if (userError.code === '23505') throw BadRequest('This phone number is already in use.');
        throw userError;
      }
    }

    // Upsert profile record if needed
    if (Object.keys(profileFields).length > 0) {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileFields)
          .eq('user_id', userId);

        if (profileError) throw profileError;
      } else {
        // Create new profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ user_id: userId, ...profileFields });

        if (profileError) throw profileError;
      }
    }

    // Return updated profile
    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: buddyProfileRow } = await supabase
      .from('buddy_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    res.status(200).json({
      data: buildProfileResponse(userRow, profileRow, buddyProfileRow),
      message: 'Profile updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

// ========== Buddy Profile Controllers ==========

export async function getBuddyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();

    // Verify user has buddy role
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError || !userRow) {
      throw NotFound('User not found.');
    }

    // Fetch buddy profile
    const { data: buddyProfileRow, error: buddyError } = await supabase
      .from('buddy_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (buddyError || !buddyProfileRow) {
      throw NotFound('Buddy profile not found.');
    }

    res.status(200).json({
      data: {
        id: buddyProfileRow.id,
        hourly_rate: buddyProfileRow.hourly_rate,
        headline: buddyProfileRow.headline,
        bio: buddyProfileRow.bio,
        rating: buddyProfileRow.rating,
        review_count: buddyProfileRow.review_count,
        is_verified: buddyProfileRow.is_verified,
        verification_status: buddyProfileRow.verification_status,
        is_online: buddyProfileRow.is_online,
        response_time: buddyProfileRow.response_time,
        badge_text: buddyProfileRow.badge_text,
        supported_activity_ids: buddyProfileRow.supported_activity_ids || [],
        total_earnings: buddyProfileRow.total_earnings,
        profile_views: buddyProfileRow.profile_views,
        safety_pledge_signed: buddyProfileRow.safety_pledge_signed,
        created_at: buddyProfileRow.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateBuddyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const supabase = getSupabase();
    const input = updateBuddyProfileSchema.parse(req.body);

    // Ensure profiles row exists (required for Find a Buddy display)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ user_id: userId });

      if (profileError) throw profileError;
    }

    // Check if buddy profile exists
    const { data: existingBuddyProfile } = await supabase
      .from('buddy_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!existingBuddyProfile) {
      // Create buddy profile
      const { error: createError } = await supabase
        .from('buddy_profiles')
        .insert({ user_id: userId, ...input });

      if (createError) throw createError;
    } else {
      // Update buddy profile
      const { error: updateError } = await supabase
        .from('buddy_profiles')
        .update(input)
        .eq('user_id', userId);

      if (updateError) throw updateError;
    }

    // Reverse sync: if user has approved KYC, sync verification status
    // This handles the case where KYC was approved BEFORE buddy profile creation
    const { data: approvedKycRows } = await supabase
      .from('verifications')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .limit(1);

    if (approvedKycRows && approvedKycRows.length > 0) {
      await supabase
        .from('buddy_profiles')
        .update({ verification_status: 'approved', is_verified: true })
        .eq('user_id', userId);
    }

    // Return updated buddy profile
    const { data: buddyProfileRow } = await supabase
      .from('buddy_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    res.status(200).json({
      data: {
        id: buddyProfileRow.id,
        hourly_rate: buddyProfileRow.hourly_rate,
        headline: buddyProfileRow.headline,
        bio: buddyProfileRow.bio,
        rating: buddyProfileRow.rating,
        review_count: buddyProfileRow.review_count,
        is_verified: buddyProfileRow.is_verified,
        verification_status: buddyProfileRow.verification_status,
        is_online: buddyProfileRow.is_online,
        response_time: buddyProfileRow.response_time,
        badge_text: buddyProfileRow.badge_text,
        supported_activity_ids: buddyProfileRow.supported_activity_ids || [],
        total_earnings: buddyProfileRow.total_earnings,
        profile_views: buddyProfileRow.profile_views,
        safety_pledge_signed: buddyProfileRow.safety_pledge_signed,
        created_at: buddyProfileRow.created_at,
      },
      message: 'Buddy profile updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Export schemas for route validation
export { updateProfileSchema, updateBuddyProfileSchema };
