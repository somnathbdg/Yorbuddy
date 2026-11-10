import { apiClient } from './api';

export interface AiFriendVerificationStatus {
  email: 'verified' | 'unverified';
  phone: 'verified' | 'unverified';
  kyc: 'not_required';
  adult_confirmed: boolean;
  is_fully_verified: boolean;
}
export interface AiFriendMessage { id?: string; role: 'user' | 'model'; text: string; created_at?: string; }
export type AiFriendPersonality = 'friend' | 'listener' | 'motivator' | 'funny' | 'mentor';
export interface AiFriendPlan { id: string; name: string; amount: number; currency: 'INR'; duration_hours?: number; duration_days?: number; }
export interface AiFriendSubscriptionStatus {
  verification: AiFriendVerificationStatus;
  subscription: { id: string; plan_id: string; amount_paise: number; status: string; starts_at: string; expires_at: string } | null;
  has_active_subscription: boolean;
  included_with_membership: boolean;
  yorbuddy_membership: { plan_id: string; expires_at: string | null } | null;
  trial_available: boolean;
  trial_used: boolean;
  can_chat: boolean;
  plans: AiFriendPlan[];
}
export interface AiFriendOrder { order_id: string; amount: number; currency: string; key_id: string; plan_id: string; plan_name: string; }

class AiFriendService {
  async getStatus(): Promise<AiFriendSubscriptionStatus> {
    const response = await apiClient.get('/ai-friend/status');
    return response.data.data;
  }
  async confirmAdultStatus() {
    const response = await apiClient.post('/ai-friend/adult-confirmation', {});
    return response.data.data;
  }
  async getHistory(personality: AiFriendPersonality): Promise<AiFriendMessage[]> {
    const response = await apiClient.get(`/ai-friend/history/${personality}`);
    return response.data.data.messages;
  }
  async sendMessage(message: string, personality: AiFriendPersonality = 'friend'): Promise<string> {
    const response = await apiClient.post('/ai-friend/chat', { message, personality }, { timeout: 30000 });
    return response.data.data.reply;
  }
  async startTrial() {
    const response = await apiClient.post('/ai-friend/subscription/trial', {});
    return response.data.data;
  }
  async createOrder(planId: 'DAY_1' | 'WEEK_1' | 'MONTH_1'): Promise<AiFriendOrder> {
    const response = await apiClient.post('/ai-friend/subscription/create-order', { plan_id: planId });
    return response.data.data;
  }
  async verifyPayment(payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
    const response = await apiClient.post('/ai-friend/subscription/verify', payload);
    return response.data.data;
  }
}
export const aiFriendService = new AiFriendService();
