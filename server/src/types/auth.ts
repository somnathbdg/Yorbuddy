export type UserRole = 'user' | 'buddy' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  is_active: boolean;
}
