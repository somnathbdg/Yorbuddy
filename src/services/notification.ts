import { apiClient } from './api';

class NotificationService {
  async getNotifications(): Promise<{ data: any[]; meta: { total: number; unread: number } }> {
    const response = await apiClient.get('/notifications');
    return response.data;
  }

  async markRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
  }

  async markAllRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  }

  async createNotification(payload: {
    type: string;
    title: string;
    message: string;
    link?: string;
  }): Promise<void> {
    await apiClient.post('/notifications', payload);
  }

  async getUnreadCount(): Promise<{ data: { unread: number } }> {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  }
}

export const notificationService = new NotificationService();
