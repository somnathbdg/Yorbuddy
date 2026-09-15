export type UserRole = 'user' | 'buddy' | 'admin';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  mobile: string;
  full_name: string;
  dob: string; // YYYY-MM-DD
  gender: 'female' | 'male' | 'non-binary' | 'prefer-not-to-say';
  role: UserRole;
  is_active: boolean;
  is_membership_paid: boolean;
  membership_paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  bio: string;
  photo_url: string;
  gallery_urls?: string[];
  city: string;
  area: string;
  languages: string[];
  interests: string[];
  is_phone_verified: boolean;
  is_email_verified: boolean;
  is_id_verified: boolean;
  id_doc_type?: 'aadhaar' | 'pan' | 'passport' | 'voter_id';
  id_doc_url?: string;
  created_at: string;
}

export interface BuddyProfile {
  id: string;
  user_id: string;
  hourly_rate: number; // in INR e.g. 600
  bio: string;
  headline: string;
  rating: number; // e.g. 4.9
  review_count: number; // e.g. 128
  is_verified: boolean;
  verification_status: 'pending' | 'approved' | 'rejected';
  kyc_notes?: string;
  total_earnings: number;
  profile_views: number;
  is_online: boolean;
  response_time: string; // e.g. "Usually responds in 15 mins"
  badge_text?: string;
  supported_activity_ids: string[];
  safety_pledge_signed: boolean;
  created_at: string;
}

export interface Activity {
  id: string;
  slug: string;
  title: string;
  icon: string;
  category: string;
  description: string;
  popular: boolean;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_id: string;
}

export interface AvailabilitySlot {
  id: string;
  buddy_id: string;
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  start_time: string; // "10:00"
  end_time: string;   // "20:00"
  is_available: boolean;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';

export interface Booking {
  id: string;
  booking_code: string; // e.g. YB-2026-9812
  user_id: string;
  buddy_id: string;
  activity_id: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "4:00 PM"
  duration_hours: number;
  hourly_rate: number;
  booking_amount: number;
  platform_fee: number;
  total_amount: number;
  status: BookingStatus;
  location_name: string;
  location_address: string;
  special_notes?: string;
  meet_safety_acknowledged: boolean;
  created_at: string;
  has_review?: boolean;
}

export interface BookingMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  booking_id?: string;
  payment_type: 'membership' | 'booking';
  amount: number; // in INR
  currency: string; // "INR"
  payment_method: 'upi' | 'credit_card' | 'debit_card' | 'net_banking';
  transaction_id: string;
  status: 'success' | 'pending' | 'failed' | 'refunded';
  payment_gateway: 'Razorpay Sandbox' | 'Cashfree Sandbox';
  created_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  amount: number; // 499
  status: 'active' | 'inactive';
  activated_at: string;
  membership_type: 'one_time_lifetime';
  payment_id: string;
}

export interface Review {
  id: string;
  booking_id: string;
  user_id: string;
  buddy_id: string;
  author_name: string;
  author_city: string;
  rating: number; // 1-5
  comment: string;
  tags: string[]; // e.g. ["Friendly", "Respectful", "Punctual", "Good Conversation", "Fun Experience"]
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  booking_id?: string;
  category: 'safety_concern' | 'harassment' | 'non_platonic_behavior' | 'unpunctual' | 'commercial_services' | 'other';
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  admin_notes?: string;
  created_at: string;
}

export interface Verification {
  id: string;
  user_id: string;
  doc_type: 'aadhaar' | 'pan' | 'passport' | 'voter_id';
  doc_number: string;
  doc_front_url: string;
  selfie_url: string;
  status: 'pending' | 'verified' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

export type NotificationType =
  | 'booking_request'
  | 'booking_accepted'
  | 'booking_rejected'
  | 'payment_success'
  | 'upcoming_booking'
  | 'new_message'
  | 'review_received'
  | 'verification_approved'
  | 'account_warning';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  buddy_id: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'moderator' | 'support';
  permissions: string[];
}

export interface CompatibilityScore {
  overallPercentage: number;
  locationScore: number;      // weight 30%
  activitiesScore: number;    // weight 25%
  interestsScore: number;     // weight 20%
  availabilityScore: number;  // weight 15%
  languageScore: number;      // weight 10%
  explanation: string;
  sharedActivities: string[];
  sharedLanguages: string[];
  sharedInterests: string[];
}
