import React, { useState } from 'react';
import { X, Lock, Mail, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/auth';

/**
 * Reset Password page component.
 * Accessible via URL: /reset-password?token=***
 * Users arrive here from the reset link emailed to them.
 */
export const ResetPasswordPage: React.FC = () => {
  const { setActiveTab } = useApp();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [success, setSuccess] = useState(false);

  // Extract token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (!token) {
      setErrorText('Invalid reset link. Please request a new password reset.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorText('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorText('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setErrorText(apiError?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // No token in URL — invalid link
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-pink-50 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Invalid Reset Link</h2>
          <p className="text-sm text-slate-600 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              setActiveTab('home');
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-bold text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-pink-50 p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Password Reset Successful!</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your password has been updated. You can now log in with your new password.
          </p>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              setActiveTab('home');
              // Trigger login modal
              window.dispatchEvent(new CustomEvent('yorbuddy:show-login'));
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-bold text-sm"
          >
            Log In Now
          </button>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-pink-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Set New Password</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter your new password below</p>
          </div>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              setActiveTab('home');
            }}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              New Password (min 8 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 left-3 top-1/2 -translate-y-1/2 absolute" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 left-3 top-1/2 -translate-y-1/2 absolute" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          {errorText && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
              {errorText}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Resetting Password...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              window.history.pushState({}, '', '/');
              setActiveTab('home');
            }}
            className="w-full flex items-center justify-center space-x-1 text-xs text-slate-500 hover:text-blue-600 py-2"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Back to Home</span>
          </button>
        </form>
      </div>
    </div>
  );
};
