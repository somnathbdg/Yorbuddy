import { apiClient } from './api';

export interface BuddySearchResult {
  user: {
    id: string;
    full_name: string;
    gender: string;
  };
  profile: {
    photo_url: string;
    city: string;
    area: string;
    languages: string[];
    interests: string[];
  };
  buddy_profile: {
    id: string;
    hourly_rate: number;
    headline: string;
    bio: string;
    rating: number;
    review_count: number;
    is_verified: boolean;
    is_online: boolean;
    response_time: string;
    badge_text: string;
    supported_activity_ids: string[];
    safety_pledge_signed: boolean;
  };
}

export interface BuddySearchResponse {
  data: BuddySearchResult[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface BuddySearchParams {
  city?: string;
  activity?: string;
  interest?: string;
  language?: string;
  min_rating?: number;
  max_rate?: number;
  min_rate?: number;
  online?: boolean;
  query?: string;
  page?: number;
  per_page?: number;
  sort?: 'rating_desc' | 'rating_asc' | 'rate_asc' | 'rate_desc' | 'reviews_desc' | 'newest';
}

class BuddyService {
  async searchBuddies(params: BuddySearchParams = {}): Promise<BuddySearchResponse> {
    const queryParams = new URLSearchParams();

    if (params.city) queryParams.set('city', params.city);
    if (params.activity) queryParams.set('activity', params.activity);
    if (params.interest) queryParams.set('interest', params.interest);
    if (params.language) queryParams.set('language', params.language);
    if (params.min_rating !== undefined) queryParams.set('min_rating', String(params.min_rating));
    if (params.max_rate !== undefined) queryParams.set('max_rate', String(params.max_rate));
    if (params.min_rate !== undefined) queryParams.set('min_rate', String(params.min_rate));
    if (params.online !== undefined) queryParams.set('online', String(params.online));
    if (params.query) queryParams.set('query', params.query);
    if (params.page !== undefined) queryParams.set('page', String(params.page));
    if (params.per_page !== undefined) queryParams.set('per_page', String(params.per_page));
    if (params.sort) queryParams.set('sort', params.sort);

    const response = await apiClient.get(`/buddies?${queryParams.toString()}`);
    return response.data;
  }

  async getBuddyById(id: string): Promise<BuddySearchResult> {
    const response = await apiClient.get(`/buddies/${id}`);
    return response.data.data;
  }
}

export const buddyService = new BuddyService();
