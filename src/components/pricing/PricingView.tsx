import React from 'react';
import {
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PricingView: React.FC = () => {
  const { openRegisterModal, setActiveTab } = useApp();

  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-pink-100 text-pink-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-pink-600" />
            <span>Honest & Fair Model</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Simple, Transparent Pricing
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            No monthly subscription traps. No recurring fees. One simple one-time verification fee to unlock the entire companion network.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto bg-white rounded-3xl p-8 sm:p-10 border-2 border-pink-400 shadow-xl relative overflow-hidden">
          {/* Top Pill */}
          <div className="absolute top-0 right-0 bg-gradient-to-l from-pink-500 to-blue-600 text-white text-[11px] font-black uppercase px-4 py-1.5 rounded-bl-2xl tracking-wider">
            One-Time Lifetime
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">Member Membership</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete access to discover and book verified buddies
              </p>
            </div>

            {/* Price display */}
            <div className="flex items-baseline space-x-2 pt-2 border-t border-slate-100">
              <span className="text-5xl font-black text-slate-900 tracking-tight">₹499</span>
              <span className="text-sm font-bold text-slate-500">one-time registration</span>
            </div>

            {/* Emphasized rule */}
            <div className="p-3 bg-pink-50 rounded-2xl border border-pink-200 text-xs text-pink-900 font-semibold leading-relaxed">
              ✨ <strong>Zero Recurring Fees:</strong> Pay once during registration. You will NEVER be charged monthly or yearly subscription fees.
            </div>

            {/* Benefits list */}
            <div className="space-y-3 pt-2 text-xs text-slate-700">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">Browse 100% ID-verified companions</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">Filter by 10+ activities, city, area & language</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">Send real-time booking requests</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">Encrypted in-app chat after booking confirmation</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">Verified public meeting protocol protection</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">Dedicated Trust & Safety assistance</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <button
                id="pricing-get-started-btn"
                onClick={() => openRegisterModal()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-pink-500 text-white font-black text-sm shadow-lg shadow-blue-500/25 hover:opacity-95 transition-opacity flex items-center justify-center space-x-2"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Hourly Rate Note Callout */}
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-start space-x-4">
          <Clock className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
          <div className="space-y-1 text-xs text-slate-600">
            <h4 className="text-sm font-bold text-slate-900">
              How Companion Fees Work
            </h4>
            <p className="leading-relaxed">
              “Companions set their own hourly rates (₹400 – ₹1200/hr) which are paid directly per booking.”
            </p>
            <p className="text-slate-500 pt-1">
              For example, if you book Neha for a 2-hour coffee session at ₹600/hr, your booking total is ₹1,200. The ₹499 membership fee is only paid once when creating your verified account.
            </p>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto space-y-4">
          <h3 className="text-xl font-black text-slate-900 text-center mb-6">
            Frequently Asked Questions
          </h3>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-1 text-xs">
            <span className="font-bold text-slate-900 block text-sm">
              Why do you charge a ₹499 one-time membership?
            </span>
            <p className="text-slate-600 leading-relaxed">
              The ₹499 fee directly covers third-party government identity checks, video KYC fraud audits, and ongoing safety monitoring. This filters out non-serious users and guarantees a respectful, platonic community.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-1 text-xs">
            <span className="font-bold text-slate-900 block text-sm">
              What happens if a companion cancels or doesn&apos;t show up?
            </span>
            <p className="text-slate-600 leading-relaxed">
              You receive a 100% full refund immediately back to your original payment method. Companions who miss confirmed sessions face platform de-activation.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-1 text-xs">
            <span className="font-bold text-slate-900 block text-sm">
              Can I meet at a private apartment or hotel?
            </span>
            <p className="text-slate-600 leading-relaxed">
              <strong>Strictly No.</strong> YorBuddy policies mandate public-only meetings (cafes, malls, restaurants, parks). Proposing private accommodations is a zero-tolerance policy violation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
