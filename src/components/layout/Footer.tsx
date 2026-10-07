import React from 'react';
import {
  Users,
  ShieldCheck,
  Heart,
  PhoneCall,
  Mail,
  MapPin,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const {
    setActiveTab,
    setIsSafetyReportModalOpen,
    setIsRegisterModalOpen,
    setRegisterStep,
    setAuthMode,
    setLegalPageSlug,
  } = useApp();

  const handleAdminPortal = () => {
    setRegisterStep(1);
    setAuthMode('admin');
    setIsRegisterModalOpen(true);
  };

  // Shared premium link styling for the footer columns (hover + focus states).
  // Kept colour-free so each link's hover colour is unambiguous (two competing
  // `hover:text-*` utilities would be resolved by stylesheet order, not intent).
  const linkClass =
    'inline-block rounded text-left transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

  /*
   * Legal links route to the existing LegalModal sections via the pre-existing
   * `legalPageSlug` navigation state. No new routes or backend endpoints.
   */
  const legalLinks = [
    { label: 'Terms & Conditions', slug: 'terms' },
    { label: 'Privacy Policy', slug: 'privacy' },
    { label: 'Refund & Cancellation', slug: 'refund' },
  ] as const;

  return (
    <footer className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Emergency & Trust Alert Banner */}
        <div className="glass-dark rounded-2xl p-4 sm:p-6 border border-slate-700/60 mb-12 flex flex-col md:flex-row items-center justify-between gap-4 shadow-float">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-11 h-11 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Trust & Safety Guarantee</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Platonic only. Strict zero-tolerance for dating or escort services. All first meetings must be in public venues.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={() => setIsSafetyReportModalOpen(true)}
              className="w-full md:w-auto px-4 py-2 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 text-sm font-bold transition-colors border border-red-500/30"
            >
              Report a Safety Concern
            </button>
            <div className="hidden sm:flex items-center space-x-1 text-sm text-slate-400 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-700">
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>Helpline: 112 / 1091</span>
            </div>
          </div>
        </div>

        {/* 4-column Footer grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 pb-12 border-b border-slate-800">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-pink-500 flex items-center justify-center text-white shadow-float">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black text-white">
                Yor<span className="text-gradient">Buddy</span>
              </span>
            </div>

            <p className="text-base font-semibold text-pink-400">
              Need Company? Find Your Buddy.
            </p>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Real People. Real Connections. Better Moments. India&apos;s verified platonic friendship and companionship platform for coffee, movies, shopping, and everyday adventures.
            </p>

            <div className="pt-2 flex items-center space-x-3 text-slate-400 text-sm">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-900/40 text-blue-300 font-semibold border border-blue-800/50">
                🇮🇳 Made for India
              </span>
              <span>Available in Pune, Bengaluru, Mumbai, Delhi NCR & more</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <button type="button" onClick={() => setActiveTab('find-buddy')} className={linkClass}>
                  Find a Buddy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('become-buddy')} className={linkClass}>
                  Become a Buddy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('how-it-works')} className={linkClass}>
                  How It Works
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('pricing')} className={linkClass}>
                  Pricing
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveTab('user-dashboard')} className={linkClass}>
                  My Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* Trust & Safety */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">
              Trust & Safety
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('safety')}
                  className={linkClass}
                >
                  Safety Center
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('safety')}
                  className={linkClass}
                >
                  Community Guidelines
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              {legalLinks.map((item) => (
                <li key={item.slug}>
                  <button
                    type="button"
                    onClick={() => setLegalPageSlug(item.slug)}
                    className={linkClass}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
              <li>
                <a
                  href="mailto:yorbuddy5@gmail.com"
                  className="inline-block rounded break-all text-left transition-colors hover:text-pink-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Contact: yorbuddy5@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright and legal disclaimer */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} YorBuddy Technologies India Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400">Platonic Companionship Only</span>
            <span>•</span>
            <span className="text-slate-400">18+ Verified Platform</span>
            <span>•</span>
            <span className="text-slate-400">Secure Payments</span>
          </div>
        </div>

        {/* Admin Portal — accessible but secondary */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-center">
          <button
            onClick={handleAdminPortal}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg border border-slate-600 bg-slate-800/50 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:border-slate-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Admin Portal</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
