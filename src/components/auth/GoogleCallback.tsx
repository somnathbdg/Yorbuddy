import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/auth';

export const GoogleCallback: React.FC = () => {
  const { setCurrentUser, setIsAuthenticated, setActiveRole, setIsRegisterModalOpen } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      setError('Invalid OAuth callback. Missing authorization code.');
      setIsLoading(false);
      return;
    }

    const exchangeCode = async () => {
      try {
        const data = await authService.exchangeGoogleCode(code);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setActiveRole(data.user.role);
        setIsRegisterModalOpen(false);

        // Clean URL — remove code from browser history
        window.history.replaceState({}, document.title, '/');
      } catch (err: any) {
        const apiError = err.response?.data?.error;
        setError(apiError?.message || 'Google Login failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    exchangeCode();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-slate-600">Completing Google Login...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Google Login Failed</h2>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
};
