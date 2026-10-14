import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/auth';
import type { AuthResponse } from '../../services/auth';
import { API_BASE_URL } from '../../services/api';
import { OAuthStatusScreen } from './GoogleAuthScreens';

type CallbackStatus = 'exchanging' | 'success' | 'error';

/** What the user can actually do about a failed exchange. */
type Recovery = 'retry' | 'restart' | 'wait';

interface CallbackFailure {
  title: string;
  message: string;
  detail?: string;
  recovery: Recovery;
}

/** Budget for the one-time code exchange (the code itself lives 60s server-side). */
const EXCHANGE_TIMEOUT_MS = 30000;
/** After this long we tell the user the backend may be waking up. */
const SLOW_HINT_MS = 8000;
/** How long the success screen stays up before continuing into the app. */
const SUCCESS_CONTINUE_MS = 1600;

const PRIMARY_BUTTON =
  'w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:opacity-95 transition-opacity';
const SECONDARY_BUTTON =
  'w-full py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors';

function classifyExchangeFailure(err: any): CallbackFailure {
  const status: number | undefined = err?.response?.status;
  const serverMessage: string | undefined = err?.response?.data?.error?.message;

  // No HTTP response at all: offline, DNS failure, or our own timeout.
  if (!err?.response) {
    return {
      title: 'We could not reach YorBuddy',
      message:
        'The connection to our server failed or timed out, so we could not finish signing you in.',
      detail: 'Nothing was signed in. Check your connection and try again.',
      recovery: 'retry',
    };
  }

  if (status === 429) {
    return {
      title: 'Too many sign-in attempts',
      message:
        'We limit repeated sign-in attempts to keep accounts safe. Please wait a few minutes before trying again.',
      detail: serverMessage,
      recovery: 'wait',
    };
  }

  if (status === 400) {
    return {
      title: 'This sign-in link has expired',
      message:
        'The one-time sign-in code is no longer valid, so it cannot be reused. Please start the Google sign-in again.',
      detail: serverMessage,
      recovery: 'restart',
    };
  }

  return {
    title: 'Google sign-in failed',
    message: serverMessage || 'Something went wrong while finishing your Google sign-in.',
    detail: 'You have not been signed in. Please try again.',
    recovery: 'retry',
  };
}

export const GoogleCallback: React.FC = () => {
  const { setCurrentUser, setIsAuthenticated, setActiveRole, setIsRegisterModalOpen } = useApp();

  // The one-time exchange code is read exactly once, so a re-render can never
  // fabricate a new sign-in attempt.
  const [code] = useState(() => new URLSearchParams(window.location.search).get('code'));

  const [status, setStatus] = useState<CallbackStatus>('exchanging');
  const [failure, setFailure] = useState<CallbackFailure | null>(null);
  const [result, setResult] = useState<AuthResponse | null>(null);
  const [isSlow, setIsSlow] = useState(false);

  // Single-flight guard: at most one in-flight exchange request. This also
  // absorbs React StrictMode's double effect invocation in development.
  const isExchangingRef = useRef(false);
  const hasStartedRef = useRef(false);
  const hasContinuedRef = useRef(false);

  const runExchange = useCallback(async () => {
    if (!code) {
      setFailure({
        title: 'Missing sign-in code',
        message:
          'This page only finishes a Google sign-in. Please start again from the login screen.',
        recovery: 'restart',
      });
      setStatus('error');
      return;
    }

    if (isExchangingRef.current) return; // never fire a duplicate request
    isExchangingRef.current = true;

    setStatus('exchanging');
    setFailure(null);

    try {
      const data = await authService.exchangeGoogleCode(code, { timeout: EXCHANGE_TIMEOUT_MS });
      setResult(data);
      setStatus('success');
    } catch (err: any) {
      setFailure(classifyExchangeFailure(err));
      setStatus('error');
    } finally {
      isExchangingRef.current = false;
    }
  }, [code]);

  // Run once on mount. Retries are explicit user actions only — there is no
  // automatic retry, so a failure can never turn into a request loop.
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    void runExchange();
  }, [runExchange]);

  // "Still working" hint while the exchange is in flight.
  useEffect(() => {
    if (status !== 'exchanging') {
      setIsSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setIsSlow(true), SLOW_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  const continueToApp = useCallback(() => {
    if (hasContinuedRef.current || !result) return;
    hasContinuedRef.current = true;

    // Drop the one-time code from the address bar before handing control back to
    // the app, so a refresh cannot replay the callback.
    window.history.replaceState({}, document.title, '/');

    setCurrentUser(result.user);
    setIsAuthenticated(true);
    setActiveRole(result.user.role);
    setIsRegisterModalOpen(false);
  }, [result, setCurrentUser, setIsAuthenticated, setActiveRole, setIsRegisterModalOpen]);

  // Auto-continue once, shortly after a successful exchange.
  useEffect(() => {
    if (status !== 'success') return;
    const timer = window.setTimeout(() => continueToApp(), SUCCESS_CONTINUE_MS);
    return () => window.clearTimeout(timer);
  }, [status, continueToApp]);

  const retryExchange = useCallback(() => {
    void runExchange();
  }, [runExchange]);

  const restartGoogleSignIn = useCallback(() => {
    // Manual, user-initiated full-page navigation to the OAuth entry point.
    // It is never triggered automatically, so it cannot cause a redirect loop.
    window.location.href = `${API_BASE_URL}/auth/google`;
  }, []);

  const goHome = useCallback(() => {
    window.location.replace('/');
  }, []);

  if (status === 'success') {
    return (
      <OAuthStatusScreen
        tone="success"
        title="You're signed in"
        message={
          result?.user?.email
            ? `Signed in as ${result.user.email}.`
            : 'Your Google account is connected.'
        }
        detail="Taking you to your dashboard…"
      >
        <button type="button" onClick={continueToApp} className={PRIMARY_BUTTON}>
          Continue to YorBuddy
        </button>
      </OAuthStatusScreen>
    );
  }

  if (status === 'error') {
    const recovery = failure?.recovery ?? 'retry';
    return (
      <OAuthStatusScreen
        tone="error"
        title={failure?.title ?? 'Google sign-in failed'}
        message={failure?.message ?? 'Please try again.'}
        detail={failure?.detail}
      >
        {recovery === 'retry' ? (
          <button type="button" onClick={retryExchange} className={PRIMARY_BUTTON}>
            Try Again
          </button>
        ) : null}

        {recovery === 'restart' ? (
          <button type="button" onClick={restartGoogleSignIn} className={PRIMARY_BUTTON}>
            Sign in with Google again
          </button>
        ) : null}

        {recovery === 'wait' ? (
          <p className="text-[11px] font-semibold text-slate-500">
            Please wait a few minutes, then start the Google sign-in again from the login screen.
          </p>
        ) : null}

        <button type="button" onClick={goHome} className={SECONDARY_BUTTON}>
          Back to Home
        </button>
      </OAuthStatusScreen>
    );
  }

  return (
    <OAuthStatusScreen
      tone="loading"
      title="Completing Google sign-in"
      message="Verifying your Google account and securing your session."
      hint={
        isSlow
          ? 'This is taking longer than usual. The YorBuddy server may be waking up from sleep — on our current hosting plan this can take up to a minute.'
          : undefined
      }
    />
  );
};
