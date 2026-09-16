import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../config/database.js';
import { z } from 'zod';
import { NotFound } from '../middleware/errorHandler.js';
import { checkUserMembership } from './membershipService.js';

// ========== Validation Schemas ==========

const buddySearchSchema = z.object({
  city: z.string().max(100).optional(),
  activity: z.string().max(50).optional(),
  interest: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
  max_rate: z.coerce.number().int().min(0).max(10000).optional(),
  min_rate: z.coerce.number().int().min(0).max(10000).optional(),
  online: z.enum(['true', 'false']).optional(),
  query: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['rating_desc', 'rating_asc', 'rate_asc', 'rate_desc', 'reviews_desc', 'newest']).default('rating_desc'),
});

const buddyIdSchema = z.object({
  id: z.string().uuid('Invalid buddy ID format'),
});

// ========== Helper: Build safe public buddy response ==========

function buildPublicBuddyResponse(userRow: any, profileRow: any, buddyProfileRow: any) {
  return {
    user: {
      id: userRow.id,
      full_name: userRow.full_name,
      gender: userRow.gender,
    },
    profile: {
      photo_url: profileRow.photo_url,
      city: profileRow.city,
      area: profileRow.area,
      languages: profileRow.languages || [],
      interests: profileRow.interests || [],
    },
    buddy_profile: {
      id: buddyProfileRow.id,
      hourly_rate: buddyProfileRow.hourly_rate,
      headline: buddyProfileRow.headline,
      bio: buddyProfileRow.bio,
      rating: buddyProfileRow.rating,
      review_count: buddyProfileRow.review_count,
      is_verified: buddyProfileRow.is_verified,
      is_online: buddyProfileRow.is_online,
      response_time: buddyProfileRow.response_time,
      badge_text: buddyProfileRow.badge_text,
      supported_activity_ids: buddyProfileRow.supported_activity_ids || [],
      safety_pledge_signed: buddyProfileRow.safety_pledge_signed,
    },
  };
}

function getSortParts(sort: string): { column: string; ascending: boolean } {
  switch (sort) {
    case 'rating_desc': return { column: 'rating', ascending: false };
    case 'rating_asc': return { column: 'rating', ascending: true };
    case 'rate_asc': return { column: 'hourly_rate', ascending: true };
    case 'rate_desc': return { column: 'hourly_rate', ascending: false };
    case 'reviews_desc': return { column: 'review_count', ascending: false };
    case 'newest': return { column: 'created_at', ascending: false };
    default: return { column: 'rating', ascending: false };
  }
}

// ========== Controllers ==========

export async function searchBuddies(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = buddySearchSchema.parse(req.query);
    const supabase = getSupabase();

    // Step 1: Get buddy_profiles with filters that apply to buddy_profiles table
    let buddyQuery = supabase
      .from('buddy_profiles')
      .select('user_id, id, hourly_rate, headline, bio, rating, review_count, is_verified, is_online, response_time, badge_text, supported_activity_ids, safety_pledge_signed, created_at');

    if (params.min_rating !== undefined) {
      buddyQuery = buddyQuery.gte('rating', params.min_rating);
    }
    if (params.max_rate !== undefined) {
      buddyQuery = buddyQuery.lte('hourly_rate', params.max_rate);
    }
    if (params.min_rate !== undefined) {
      buddyQuery = buddyQuery.gte('hourly_rate', params.min_rate);
    }
    if (params.online === 'true') {
      buddyQuery = buddyQuery.eq('is_online', true);
    } else if (params.online === 'false') {
      buddyQuery = buddyQuery.eq('is_online', false);
    }

    if (params.activity) {
      const { data: activity } = await supabase
        .from('activities')
        .select('id')
        .eq('slug', params.activity)
        .single();

      if (activity) {
        buddyQuery = buddyQuery.contains('supported_activity_ids', [activity.id]);
      }
    }

    const sortParts = getSortParts(params.sort);
    buddyQuery = buddyQuery.order(sortParts.column, { ascending: sortParts.ascending });

    const offset = (params.page - 1) * params.per_page;
    buddyQuery = buddyQuery.range(offset, offset + params.per_page - 1);

    const { data: buddyProfiles, error: buddyError } = await buddyQuery;

    if (buddyError) {
      console.error('[BUDDY_SEARCH] Error:', buddyError);
      throw buddyError;
    }

    if (!buddyProfiles || buddyProfiles.length === 0) {
      res.status(200).json({
        data: [],
        meta: {
          page: params.page,
          per_page: params.per_page,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: params.page > 1,
        },
      });
      return;
    }

    // Step 2: Get user and profile data
    const userIds = buddyProfiles.map((bp: any) => bp.user_id);

    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, gender')
      .in('id', userIds)
      .eq('is_active', true);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, photo_url, city, area, languages, interests')
      .in('user_id', userIds);

    // Step 3: Filter by active membership (buddies must have active membership)
    let membershipFilteredBuddies = [];
    for (const bp of buddyProfiles) {
      const membershipCheck = await checkUserMembership(supabase, bp.user_id);
      if (membershipCheck.isActive) {
        membershipFilteredBuddies.push(bp);
      }
    }

    // Step 4: Apply profile-based filters in memory
    let filteredBuddies = membershipFilteredBuddies.map((bp: any) => {
      const user = users?.find((u: any) => u.id === bp.user_id);
      const profile = profiles?.find((p: any) => p.user_id === bp.user_id);
      return { ...bp, user, profile };
    }).filter((item: any) => {
      if (!item.user || !item.profile) return false;

      if (params.city) {
        if (!item.profile.city || !item.profile.city.toLowerCase().includes(params.city!.toLowerCase())) {
          return false;
        }
      }
      if (params.language) {
        const langs = item.profile.languages || [];
        if (!langs.some((l: string) => l.toLowerCase() === params.language!.toLowerCase())) {
          return false;
        }
      }
      if (params.interest) {
        const interests = item.profile.interests || [];
        if (!interests.some((i: string) => i.toLowerCase().includes(params.interest!.toLowerCase()))) {
          return false;
        }
      }
      if (params.query) {
        const q = params.query.toLowerCase();
        const matchesName = item.user.full_name.toLowerCase().includes(q);
        const matchesCity = item.profile.city?.toLowerCase().includes(q) || false;
        const matchesArea = item.profile.area?.toLowerCase().includes(q) || false;
        const matchesBio = item.bio?.toLowerCase().includes(q) || false;
        const matchesHeadline = item.headline?.toLowerCase().includes(q) || false;
        const matchesInterests = (item.profile.interests || []).some((i: string) => i.toLowerCase().includes(q));
        if (!matchesName && !matchesCity && !matchesArea && !matchesBio && !matchesHeadline && !matchesInterests) {
          return false;
        }
      }
      return true;
    });

    const total = filteredBuddies.length;
    const totalPages = Math.ceil(total / params.per_page);

    const buddies = filteredBuddies.map((item: any) => buildPublicBuddyResponse(item.user, item.profile, item));

    res.status(200).json({
      data: buddies,
      meta: {
        page: params.page,
        per_page: params.per_page,
        total,
        total_pages: totalPages,
        has_next: params.page < totalPages,
        has_prev: params.page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getBuddyById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = buddyIdSchema.parse(req.params);
    const supabase = getSupabase();

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, full_name, gender, role')
      .eq('id', id)
      .eq('role', 'buddy')
      .eq('is_active', true)
      .single();

    if (userError || !userRow) {
      throw NotFound('Buddy not found.');
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    if (profileError || !profileRow) {
      throw NotFound('Buddy profile not found.');
    }

    const { data: buddyProfileRow, error: buddyError } = await supabase
      .from('buddy_profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    if (buddyError || !buddyProfileRow) {
      throw NotFound('Buddy profile not found.');
    }

    res.status(200).json({
      data: buildPublicBuddyResponse(userRow, profileRow, buddyProfileRow),
    });
  } catch (err) {
    next(err);
  }
}

// Export schemas for route validation
export { buddySearchSchema, buddyIdSchema };
