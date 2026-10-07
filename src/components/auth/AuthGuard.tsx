import React from 'react';
import { Lock, ShieldAlert } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  currentUser: any;
  requiredRole?: 'user' | 'buddy' | 'admin';
  onLoginClick: () => void;
}

/**
 * Decode JWT token to extract role without verifying signature.
 * This is safe for UI gating because the backend verifies the signature
 * on every API call. This prevents frontend state manipulation from
 * granting access to admin/buddy panels.
 */
function getRoleFromToken(): string | null {
  try {
    const token = localStorage.getItem('yorbuddy_access_token');
    if (!token) return null;
    // Decode payload without verification (backend verifies signature)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  isAuthenticated,
  currentUser,
  requiredRole,
  onLoginClick,
}) => {
  // Not logged in - show login required screen
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="bg-slate-50 min-h-screen py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
            <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Authentication Required</h2>
            <p className="text-slate-500 mb-6">Please login to access your dashboard.</p>
            <button
              onClick={onLoginClick}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-pink-600 text-white text-sm font-bold shadow-md hover:opacity-95 transition-opacity"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verify role from JWT token (not from React state which can be manipulated)
  const tokenRole = getRoleFromToken();

  // Check role requirement for admin panel
  if (requiredRole === 'admin' && tokenRole !== 'admin') {
    return (
      <div className="bg-slate-50 min-h-screen py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
            <ShieldAlert className="w-16 h-16 text-rose-300 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-500">You do not have permission to access this panel.</p>
          </div>
        </div>
      </div>
    );
  }

  // Check role requirement for buddy dashboard
  if (requiredRole === 'buddy' && tokenRole !== 'buddy' && tokenRole !== 'admin') {
    return (
      <div className="bg-slate-50 min-h-screen py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
            <ShieldAlert className="w-16 h-16 text-rose-300 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Buddy Access Required</h2>
            <p className="text-slate-500">You need a buddy account to access this dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  // Authorized - render children
  return <>{children}</>;
};
