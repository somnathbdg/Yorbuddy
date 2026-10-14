import React from 'react';
import { Users, Loader2, CheckCircle2, AlertTriangle, Chrome } from 'lucide-react';

/**
 * Shared YorBuddy brand lockup for the Google OAuth screens.
 * Kept in one place so the pre-redirect overlay and the callback page stay
 * visually identical.
 */
export const OAuthBrandLockup: React.FC<{ tagline?: string }> = ({ tagline }) => (
  <div className="flex flex-col items-center">
    <div className="logo-glow w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
      <Users className="w-7 h-7 text-white" />
    </div>
    <div className="mt-4 text-3xl font-black tracking-tight text-slate-900">
      Yor<span className="text-gradient">Buddy</span>
    </div>
    {tagline ? (
      <p className="mt-1 text-xs font-medium tracking-wide text-slate-500">{tagline}</p>
    ) : null}
  </div>
);

/**
 * Full-screen branded overlay shown between the user pressing
 * "Continue with Google" and the browser leaving the page for the backend
 * OAuth endpoint.
 *
 * The click handler commits this overlay synchronously and then issues the real
 * navigation immediately: this component never delays, blocks or intercepts it.
 * Browsers keep the current page on screen until the next document paints, so
 * the overlay covers the wait that happens before the backend responds.
 *
 * It cannot replace a response served by the host. On a free Render instance the
 * wake-up page comes from Render's own proxy and will take over as soon as it
 * arrives — see server/README.md, "Google OAuth and Render cold starts".
 */
export const OAuthRedirectOverlay: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
  const [isSlow, setIsSlow] = React.useState(false);

  React.useEffect(() => {
    // Informational only. It surfaces the cold-start case instead of leaving the
    // user staring at a spinner, and provides a way out if navigation stalls.
    const timer = window.setTimeout(() => setIsSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-sm px-4"
    >
      <div className="w-full max-w-sm text-center">
        <OAuthBrandLockup tagline="Verified Platonic Connections" />

        <div className="mt-8 flex items-center justify-center space-x-2 text-sm font-semibold text-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Connecting securely to Google…</span>
        </div>

        <div className="mt-3 flex items-center justify-center space-x-1.5 text-[11px] font-medium text-slate-400">
          <Chrome className="w-3.5 h-3.5 text-blue-500" />
          <span>You will be redirected to Google to choose your account.</span>
        </div>

        {isSlow ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left">
            <p className="text-[11px] font-bold text-amber-900">This is taking longer than usual</p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
              The YorBuddy server may be waking up from sleep. On our current hosting plan this can
              take up to a minute.
            </p>
            <button
              type="button"
              onClick={onCancel}
              className="mt-2 text-[11px] font-bold text-amber-900 underline hover:no-underline"
            >
              Cancel and go back
            </button>
          </div>
        ) : null}

        <p className="mt-8 text-[10px] leading-relaxed text-slate-400">
          YorBuddy never sees your Google password. We only receive your name, email address and
          profile picture.
        </p>
      </div>
    </div>
  );
};

interface OAuthStatusScreenProps {
  tone: 'loading' | 'success' | 'error';
  title: string;
  message: string;
  detail?: string;
  /** Extra context shown while we are still waiting (e.g. a cold start). */
  hint?: string;
  children?: React.ReactNode;
}

/**
 * Branded full-page state used by the OAuth callback route for its
 * loading / success / error states.
 */
export const OAuthStatusScreen: React.FC<OAuthStatusScreenProps> = ({
  tone,
  title,
  message,
  detail,
  hint,
  children,
}) => {
  const iconRing =
    tone === 'success' ? 'bg-emerald-50' : tone === 'error' ? 'bg-rose-50' : 'bg-blue-50';
  const icon =
    tone === 'success' ? (
      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
    ) : tone === 'error' ? (
      <AlertTriangle className="w-7 h-7 text-rose-500" />
    ) : (
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-md text-center">
        <OAuthBrandLockup />

        <div
          className={`mt-8 w-14 h-14 rounded-full ${iconRing} flex items-center justify-center mx-auto`}
        >
          {icon}
        </div>

        <h1 className="mt-4 text-lg font-black text-slate-900">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{message}</p>

        {detail ? <p className="mt-2 text-xs leading-relaxed text-slate-400">{detail}</p> : null}

        {hint ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left">
            <p className="text-[11px] leading-relaxed text-amber-800">{hint}</p>
          </div>
        ) : null}

        {children ? <div className="mt-6 space-y-2">{children}</div> : null}

        <p className="mt-8 text-[10px] leading-relaxed text-slate-400">
          18+ verified platonic companionship platform. YorBuddy never sees your Google password.
        </p>
      </div>
    </div>
  );
};
