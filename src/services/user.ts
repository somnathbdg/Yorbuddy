import { apiClient } from './api';

export interface UserProfile {
  user: {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    dob: string | null;
    gender: string | null;
    role: 'user' | 'buddy' | 'admin';
    is_active: boolean;
    is_membership_paid: boolean;
    membership_paid_at: string | null;
    created_at: string;
    updated_at: string;
  };
  profile: {
    id: string;
    bio: string | null;
    photo_url: string | null;
    city: string | null;
    area: string | null;
    languages: string[];
    interests: string[];
    is_phone_verified: boolean;
    is_email_verified: boolean;
    is_id_verified: boolean;
    created_at: string;
  } | null;
  buddy_profile: {
    id: string;
    hourly_rate: number;
    headline: string | null;
    bio: string | null;
    rating: number;
    review_count: number;
    is_verified: boolean;
    verification_status: 'pending' | 'approved' | 'rejected';
    is_online: boolean;
    response_time: string | null;
    badge_text: string | null;
    supported_activity_ids: string[];
    total_earnings: number;
    profile_views: number;
    safety_pledge_signed: boolean;
    created_at: string;
  } | null;
}

export interface UpdateProfilePayload {
  full_name?: string;
  phone?: string | null;
  dob?: string | null;
  gender?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  city?: string | null;
  area?: string | null;
  languages?: string[];
  interests?: string[];
}

export interface BuddyProfilePayload {
  hourly_rate?: number;
  headline?: string | null;
  bio?: string | null;
  response_time?: string | null;
  badge_text?: string | null;
  supported_activity_ids?: string[];
  safety_pledge_signed?: boolean;
}

class UserService {
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/users/me');
    return response.data.data;
  }

  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    const response = await apiClient.patch('/users/me', payload);
    return response.data.data;
  }

  async getBuddyProfile() {
    const response = await apiClient.get('/users/me/buddy');
    return response.data.data;
  }

  async updateBuddyProfile(payload: BuddyProfilePayload) {
    const response = await apiClient.patch('/users/me/buddy', payload);
    return response.data.data;
  }
}

export const userService = new UserService();
