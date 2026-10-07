import { apiClient } from './api';

export interface ReportPayload {
  category: 'safety_concern' | 'harassment' | 'non_platonic_behavior' | 'unpunctual' | 'commercial_services' | 'other';
  description: string;
  reported_id?: string;
  booking_id?: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  category: string;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  admin_notes?: string;
  created_at: string;
}

class ReportService {
  async createReport(payload: ReportPayload): Promise<{ data: Report; message: string }> {
    const response = await apiClient.post('/reports', payload);
    return response.data;
  }

  async getReports(): Promise<{ data: Report[]; count: number }> {
    const response = await apiClient.get('/reports');
    return response.data;
  }

  async updateReportStatus(id: string, status: string): Promise<{ data: Report; message: string }> {
    const response = await apiClient.patch(`/reports/${id}`, { status });
    return response.data;
  }
}

export const reportService = new ReportService();
