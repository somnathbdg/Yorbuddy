import { apiClient } from './api';

export interface CreateBookingPayload {
  buddy_id: string;
  activity_id: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  location_name: string;
  location_address: string;
  special_notes?: string;
}

export interface Booking {
  id: string;
  booking_code: string;
  user_id: string;
  buddy_id: string;
  activity_id: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  hourly_rate: number;
  booking_amount: number;
  platform_fee: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
  location_name: string;
  location_address: string;
  special_notes?: string;
  meet_safety_acknowledged: boolean;
  has_review: boolean;
  created_at: string;
  /** Safe public buddy summary — populated by the backend booking query. */
  buddy?: {
    id: string;
    full_name: string;
    photo_url?: string;
    city?: string;
    area?: string;
    hourly_rate?: number;
    rating?: number;
    review_count?: number;
    is_verified?: boolean;
    badge_text?: string;
    response_time?: string;
  } | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

class BookingService {
  async createBooking(payload: CreateBookingPayload): Promise<Booking> {
    const response = await apiClient.post('/bookings', payload);
    return response.data.data;
  }

  async getBookings(page?: number, limit?: number): Promise<{ bookings: Booking[]; meta: PaginationMeta }> {
    const params: Record<string, number> = {};
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;
    const response = await apiClient.get('/bookings', { params });
    return {
      bookings: response.data.data,
      meta: response.data.meta,
    };
  }

  async getBookingById(id: string): Promise<Booking> {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data.data;
  }

  async cancelBooking(id: string): Promise<Booking> {
    const response = await apiClient.patch(`/bookings/${id}`, { status: 'cancelled' });
    return response.data.data;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking> {
    const response = await apiClient.patch(`/bookings/${id}`, { status });
    return response.data.data;
  }
}

export const bookingService = new BookingService();
