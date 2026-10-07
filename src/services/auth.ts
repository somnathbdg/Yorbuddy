import { apiClient } from './api';

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
  city?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    dob?: string | null;
    gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null;
    role: 'user' | 'buddy' | 'admin';
    is_active: boolean;
    is_membership_paid: boolean;
    created_at: string;
  };
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/register', payload);
    const data = response.data.data;
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/login', payload);
    const data = response.data.data;
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('yorbuddy_refresh_token');
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore errors during logout
    }
    this.clearTokens();
  }

  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  }

  /**
   * Request a password reset link.
   * Always returns success message regardless of whether email exists.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  }

  /**
   * Reset password using a valid reset token.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return response.data;
  }

  async exchangeGoogleCode(code: string): Promise<AuthResponse> {
    const response = await apiClient.post('/auth/google/exchange', { code });
    const data = response.data.data;
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('yorbuddy_access_token', accessToken);
    localStorage.setItem('yorbuddy_refresh_token', refreshToken);
  }

  clearTokens(): void {
    localStorage.removeItem('yorbuddy_access_token');
    localStorage.removeItem('yorbuddy_refresh_token');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('yorbuddy_access_token');
  }
}

export const authService = new AuthService();
