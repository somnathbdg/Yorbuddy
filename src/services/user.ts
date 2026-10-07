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
    email_verified_at: string | null;
    phone_verified_at: string | null;
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

export interface VerificationStatusResponse {
  email: 'unverified' | 'verified';
  phone: 'unverified' | 'verified';
  kyc: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  kyc_rejection_reason?: string;
  is_fully_verified: boolean;
}

export interface KycSubmission {
  doc_type: 'aadhaar' | 'pan' | 'passport' | 'voter_id';
  doc_front_url: string;
  selfie_url: string;
}

export interface KycRecord {
  id: string;
  doc_type: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface AdminPendingKyc {
  id: string;
  user_id: string;
  doc_type: string;
  status: string;
  submitted_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
}

export interface AdminKycDetail {
  id: string;
  user_id: string;
  doc_type: string;
  doc_front_url: string;
  selfie_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    email_verified: boolean;
    phone_verified: boolean;
  };
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

  // ========== Verification & KYC ==========

  async getVerificationStatus(): Promise<VerificationStatusResponse> {
    const response = await apiClient.get('/verification/me');
    return response.data.data;
  }

  async requestEmailCode(): Promise<{ message: string; dev_code?: string }> {
    const response = await apiClient.post('/verification/email/request');
    return response.data;
  }

  async verifyEmail(code: string): Promise<{ message: string }> {
    const response = await apiClient.post('/verification/email/verify', { code });
    return response.data;
  }

  async requestPhoneCode(phone: string): Promise<{ message: string; dev_code?: string }> {
    const response = await apiClient.post('/verification/phone/request', { phone });
    return response.data;
  }

  async verifyPhone(code: string): Promise<{ message: string }> {
    const response = await apiClient.post('/verification/phone/verify', { code });
    return response.data;
  }

  async submitKyc(payload: KycSubmission): Promise<{ data: { id: string; status: string }; message: string }> {
    const response = await apiClient.post('/kyc/submit', payload);
    return response.data;
  }

  async getMyKycStatus(): Promise<{ data: KycRecord | null }> {
    const response = await apiClient.get('/kyc/status');
    return response.data;
  }

  // ========== Admin KYC ==========

  async getPendingKyc(): Promise<{ data: AdminPendingKyc[]; count: number }> {
    const response = await apiClient.get('/admin/kyc/pending');
    return response.data;
  }

  async getKycById(id: string): Promise<{ data: AdminKycDetail }> {
    const response = await apiClient.get(`/admin/kyc/${id}`);
    return response.data;
  }

  async approveKyc(id: string): Promise<{ data: { id: string; status: string; reviewed_at: string; reviewed_by: string }; message: string }> {
    const response = await apiClient.post(`/admin/kyc/${id}/approve`);
    return response.data;
  }

  async rejectKyc(id: string, reason: string): Promise<{ data: { id: string; status: string; rejection_reason: string; reviewed_at: string; reviewed_by: string }; message: string }> {
    const response = await apiClient.post(`/admin/kyc/${id}/reject`, { reason });
    return response.data;
  }

  // ========== Admin Dashboard Stats ==========

  async getAdminStats(): Promise<{ data: { total_members: number; verified_buddies: number; total_bookings: number; pending_kyc: number } }> {
    const response = await apiClient.get('/admin/stats');
    return response.data;
  }

  async getVerifiedBuddies(): Promise<{ data: any[]; count: number }> {
    const response = await apiClient.get('/admin/verified-buddies');
    return response.data;
  }
}

export const userService = new UserService();
