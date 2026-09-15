import React from 'react';
import {
  Users,
  ShieldCheck,
  Heart,
  PhoneCall,
  Mail,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { setActiveTab, setLegalPageSlug, setIsSafetyReportModalOpen } = useApp();

  const handleLegalClick = (slug: string) => {
    setLegalPageSlug(slug);
    setActiveTab('legal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Emergency & Trust Alert Banner */}
        <div className="bg-slate-800/80 rounded-2xl p-4 sm:p-6 border border-slate-700/60 mb-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-11 h-11 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Trust & Safety Guarantee</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Platonic only. Strict zero-tolerance for dating or escort services. All first meetings must be in public venues.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={() => setIsSafetyReportModalOpen(true)}
              className="w-full md:w-auto px-4 py-2 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs font-bold transition-colors border border-red-500/30"
            >
              Report a Safety Concern
            </button>
            <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-400 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-700">
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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-pink-500 flex items-center justify-center text-white shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black text-white">
                Yor<span className="text-pink-400">Buddy</span>
              </span>
            </div>

            <p className="text-sm font-semibold text-pink-400">
              Need Company? Find Your Buddy.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Real People. Real Connections. Better Moments. India&apos;s verified platonic friendship and companionship platform for coffee, movies, shopping, and everyday adventures.
            </p>

            <div className="pt-2 flex items-center space-x-3 text-slate-400 text-xs">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-900/40 text-blue-300 font-semibold border border-blue-800/50">
                🇮🇳 Made for India
              </span>
              <span>Available in Pune, Bengaluru, Mumbai, Delhi NCR & more</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button onClick={() => setActiveTab('find-buddy')} className="hover:text-white transition-colors">
                  Find a Buddy
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('become-buddy')} className="hover:text-white transition-colors">
                  Become a Buddy
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('how-it-works')} className="hover:text-white transition-colors">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('pricing')} className="hover:text-white transition-colors">
                  Pricing (₹499 One-Time)
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('user-dashboard')} className="hover:text-white transition-colors">
                  My Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* Trust & Safety */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Trust & Safety
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button onClick={() => setActiveTab('safety')} className="hover:text-white transition-colors">
                  Safety Center
                </button>
              </li>
              <li>
                <button onClick={() => handleLegalClick('community-guidelines')} className="hover:text-white transition-colors">
                  Community Guidelines
                </button>
              </li>
              <li>
                <button onClick={() => handleLegalClick('prohibited-services')} className="hover:text-white transition-colors">
                  Prohibited Services Policy
                </button>
              </li>
              <li>
                <button onClick={() => handleLegalClick('safety-policy')} className="hover:text-white transition-colors">
                  Public Meeting Safety
                </button>
              </li>
              <li>
                <button onClick={() => setIsSafetyReportModalOpen(true)} className="text-pink-400 hover:text-pink-300 transition-colors font-medium">
                  Report Incident
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button onClick={() => handleLegalClick('terms')} className="hover:text-white transition-colors">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => handleLegalClick('privacy')} className="hover:text-white transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => handleLegalClick('refund')} className="hover:text-white transition-colors">
                  Refund Policy
                </button>
              </li>
              <li>
                <button onClick={() => handleLegalClick('cancellation')} className="hover:text-white transition-colors">
                  Cancellation Policy
                </button>
              </li>
              <li>
                <span className="text-[11px] text-slate-500">Contact: support@yorbuddy.in</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright and legal disclaimer */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} YorBuddy Technologies India Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400">Platonic Companionship Only</span>
            <span>•</span>
            <span className="text-slate-400">18+ Verified Platform</span>
            <span>•</span>
            <span className="text-slate-400">Secure Payments</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
