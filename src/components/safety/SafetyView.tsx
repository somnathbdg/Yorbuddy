import React, { useState } from 'react';
import {
  ShieldCheck,
  MapPin,
  HeartHandshake,
  Headphones,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  Lock,
  PhoneCall,
  Send,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SafetyView: React.FC = () => {
  const { isSafetyReportModalOpen, setIsSafetyReportModalOpen } = useApp();

  const [reportTarget, setReportTarget] = useState('Companion / Member');
  const [reportReason, setReportReason] = useState('inappropriate_behavior');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitted(true);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Trust & Safety Center</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Your Safety is Our Highest Priority
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            YorBuddy was created to bring genuine, safe, platonic companionship to India with zero tolerance for misconduct.
          </p>
        </div>

        {/* 4 Core Pillars of Safety */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">100% Identity Verified</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every buddy must pass a government-approved identity check (Aadhaar/PAN/Passport) and a video verification before they can accept bookings.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Public Meeting Rule</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Strict policy: all meetings must happen in verified public venues such as coffee shops, shopping malls, restaurants, or cultural centers.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Platonic Code of Conduct</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              YorBuddy is strictly NOT a dating or escort website. Both companions and users sign a mutual platonic pledge enforcing respectful boundaries.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">24/7 Member Support</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dedicated Trust & Safety operations team standing by with in-app reporting, emergency escalation, and live assistance.
            </p>
          </div>
        </div>

        {/* Safety Checklist for Members */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xs">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Safety Checklist for Members
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                5 simple rules to ensure every companionship experience is delightful and secure.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-start space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Always meet in daytime or bustling public locations
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Choose busy cafes, food courts, exhibition halls, or shopping avenues where staff and other patrons are readily nearby.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Inform a trusted friend or family member of your plan
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Share the venue name, the booking schedule, and keep your phone charged.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Keep communications strictly within the YorBuddy platform
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Do not exchange private WhatsApp numbers before meeting. Our in-app messenger protects your identity and provides an auditable safety record.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="w-7 h-7 rounded-full bg-pink-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Never share financial, banking or sensitive personal information
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    All payments must pass through the verified YorBuddy system. Never transfer direct cash or private UPI payments outside the platform.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  5
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Trust your instincts and leave whenever uncomfortable
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    You have complete autonomy. If you ever feel awkward or unsafe, politely terminate the meetup immediately and alert our support line.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Incident Reporting Section */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xs max-w-3xl mx-auto">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Report a Safety Concern or Policy Violation
              </h3>
              <p className="text-xs text-slate-500">
                Reports are audited within 15 minutes by our Trust & Safety senior incident response team.
              </p>
            </div>
          </div>

          {reportSubmitted ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-emerald-900">
                Report Lodged Successfully
              </h4>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Incident reference #YB-SAFE-8921 has been generated. The investigated profile is placed on temporary interaction hold during manual review.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Who would you like to report?
                </label>
                <input
                  type="text"
                  value={reportTarget}
                  onChange={(e) => setReportTarget(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nature of Violation
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
                >
                  <option value="inappropriate_behavior">Non-platonic or romantic solicitation</option>
                  <option value="outside_platform_payment">Asking for offline cash / direct payments</option>
                  <option value="private_location_request">Suggesting private homes or hotel rooms</option>
                  <option value="fake_identity">Photo or profile misrepresentation</option>
                  <option value="harassment">Harassment or abusive messaging</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Incident Description
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any relevant context, timestamps, or statements made..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-colors flex items-center justify-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Submit Confidential Safety Report</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
