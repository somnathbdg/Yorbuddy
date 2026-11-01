import { apiClient } from './api';

export interface AiFriendVerificationStatus {
  email: 'verified' | 'unverified';
  phone: 'verified' | 'unverified';
  kyc: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  is_fully_verified: boolean;
}

export interface AiFriendMessage {
  role: 'user' | 'model';
  text: string;
}

class AiFriendService {
  async getStatus(): Promise<AiFriendVerificationStatus> {
    const response = await apiClient.get('/ai-friend/status');
    return response.data.data;
  }

  async sendMessage(message: string, history: AiFriendMessage[]): Promise<string> {
    const response = await apiClient.post('/ai-friend/chat', { message, history });
    return response.data.data.reply;
  }
}

export const aiFriendService = new AiFriendService();
