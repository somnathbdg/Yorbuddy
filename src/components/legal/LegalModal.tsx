import React, { useState } from 'react';
import {
  X,
  FileText,
  ShieldCheck,
  RotateCcw,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LegalModal: React.FC = () => {
  const { isLegalModalOpen, setIsLegalModalOpen, legalModalType } = useApp();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'refund' | 'platonic'>(
    legalModalType || 'terms'
  );

  if (!isLegalModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-black text-slate-900">
              YorBuddy Legal & Compliance Documentation
            </h3>
          </div>
          <button
            onClick={() => setIsLegalModalOpen(false)}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch bar */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 gap-4 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('terms')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'terms'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'privacy'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('refund')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'refund'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Refund & Cancellation
          </button>
          <button
            onClick={() => setActiveTab('platonic')}
            className={`py-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'platonic'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Platonic Agreement
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4">
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-slate-900">
                1. Definition of Service: Platonic Companionship Platform
              </h4>
              <p>
                YorBuddy is a technological facilitation platform operating under the laws of the Republic of India. YorBuddy connects verified individuals for platonic social companionship (including coffee meetups, cinema outings, dining, shopping, cultural sightseeing, fitness partners, and friendly conversation).
              </p>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 font-medium">
                <strong>Strict Prohibited Conduct:</strong> YorBuddy is explicitly NOT a matrimonial, dating, sexual, or escort service. Prostitution, commercial sexual services, requests for romantic intimacy, private lodging visits, or illicit substance solicitation are strictly prohibited. Violators face immediate permanent termination and reporting to cyber crime law enforcement.
              </div>
              <h4 className="text-base font-bold text-slate-900">2. Mandatory Public Venue Policy</h4>
              <p>
                All initial and subsequent meetups scheduled through YorBuddy MUST occur in recognized, openly accessible public venues (e.g., licensed cafes, restaurants, movie theatres, malls, public parks). Meeting in private residences, hotel rooms, or secluded areas is a strict violation of these terms.
              </p>
              <h4 className="text-base font-bold text-slate-900">3. User Warranties</h4>
              <p>
                By registering on YorBuddy, you warrant that you are at least eighteen (18) years of age, have provided true and accurate identity documentation, and agree to uphold courteous social standards.
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-slate-900">1. Data Collected & Confidentiality</h4>
              <p>
                We collect your full legal name, phone number, email address, date of birth, and government identity document (Aadhaar, PAN, Passport, or Voter ID). Identity documents are encrypted in transit and at rest using industry standard AES-256 protocols and are used exclusively for user verification and fraud prevention.
              </p>
              <h4 className="text-base font-bold text-slate-900">2. Profile Visibility & Phone Number Masking</h4>
              <p>
                Your phone number, financial details, and government identification numbers are NEVER publicly displayed or shared with other members. Communication occurs through YorBuddy&apos;s secured in-app messaging interface.
              </p>
              <h4 className="text-base font-bold text-slate-900">3. Information Sharing</h4>
              <p>
                YorBuddy does not sell, rent, or monetize your personal information to third-party ad networks. We only disclose records when legally mandated by Indian statutory authorities or court orders.
              </p>
            </div>
          )}

          {activeTab === 'refund' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-slate-900">1. Booking Cancellation Policy</h4>
              <p>
                • <strong>Cancel at least 2 hours before booking start:</strong> 100% full refund credited back to your original source of payment within 24–48 hours.
              </p>
              <p>
                • <strong>Cancellation with less than 2 hours notice:</strong> 50% refund to protect the companion who reserved their travel time and calendar slot.
              </p>
              <p>
                • <strong>Companion No-Show:</strong> 100% full refund with an apology courtesy credit. The companion profile will undergo administrative review.
              </p>
              <h4 className="text-base font-bold text-slate-900">2. ₹499 One-Time Membership Fee</h4>
              <p>
                The ₹499 registration fee covers government identity KYC verification, video compliance audit, and platform account provisioning. Once an account is approved and identity is verified, this one-time fee is non-refundable. If your KYC is rejected by our Trust & Safety team and cannot be resolved, a full refund of ₹499 is issued immediately.
              </p>
            </div>
          )}

          {activeTab === 'platonic' && (
            <div className="space-y-4">
              <div className="p-4 bg-pink-50 rounded-2xl border border-pink-200 text-pink-950">
                <h4 className="text-base font-black mb-1">
                  The YorBuddy Mutual Platonic Pledge
                </h4>
                <p>
                  Before meeting, every member and companion commits to maintaining high integrity, mutual respect, and wholesome social interactions.
                </p>
              </div>
              <ul className="space-y-2 list-disc list-inside">
                <li>I will strictly keep all interactions platonic, friendly, and respectful.</li>
                <li>I will never pressure, solicit, or suggest physical or romantic intimacy.</li>
                <li>I will meet solely in agreed public, well-lit, and populated establishments.</li>
                <li>I will respect personal boundaries, cultural diversity, and differing perspectives.</li>
                <li>I will immediately report any uncomfortable or violating behavior through in-app channels.</li>
              </ul>
              <div className="pt-2">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Mandatory Agreement Acknowledged</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => setIsLegalModalOpen(false)}
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
