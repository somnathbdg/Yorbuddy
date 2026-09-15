import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Wallet,
  IndianRupee,
  Video,
  FileCheck,
  UploadCloud,
  ArrowRight,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BecomeABuddyView: React.FC = () => {
  const { activities, setActiveTab, currentUser, setCurrentUser } = useApp();

  const [isApplying, setIsApplying] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [hourlyRate, setHourlyRate] = useState(650);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([
    'act-1',
    'act-2',
    'act-5',
  ]);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleApplySuccess = (e: React.FormEvent) => {
    e.preventDefault();
    setApplicationSubmitted(true);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-pink-100 text-pink-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-pink-600" />
            <span>Join Our Trusted Companion Network</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Earn by Becoming a Companion
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            “Spend time with people who need company for movies, dining, events or conversation.”
          </p>

          <div className="pt-2">
            <button
              onClick={() => {
                setIsApplying(true);
                window.scrollTo({ top: 600, behavior: 'smooth' });
              }}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-pink-500 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-500/25 hover:opacity-95 transition-opacity inline-flex items-center space-x-2"
            >
              <span>Apply to Become a Buddy</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Benefits Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Flexible Hours</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              You choose when you are free. Accept bookings on weekends, evenings, or free mornings.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Safe & Verified Users</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every member undergoes OTP and identity verification. All meetups strictly restricted to public places.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IndianRupee className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Set Your Own Rate</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Choose your hourly rate between ₹400 and ₹1,200/hr based on your expertise, passions, and city.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Transparent Payouts</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Weekly automatic settlements directly to your UPI or bank account with 0 hidden deduction surprises.
            </p>
          </div>
        </div>

        {/* 6 Registration Steps for Buddies */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xs">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              How Buddy Onboarding Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Our safety review ensures that only trustworthy, verified companions are featured on YorBuddy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                1
              </div>
              <h4 className="text-sm font-bold text-slate-900">Basic Details & Bio</h4>
              <p className="text-xs text-slate-600">
                Share your educational background, conversational interests, languages, and cities.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                2
              </div>
              <h4 className="text-sm font-bold text-slate-900">Upload Government ID</h4>
              <p className="text-xs text-slate-600">
                Upload Aadhaar, PAN, or Passport for strict verification through legal KYC channels.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">
                3
              </div>
              <h4 className="text-sm font-bold text-slate-900">Video / Photo Introduction</h4>
              <p className="text-xs text-slate-600">
                A 30-second introduction video demonstrating your communication tone and vibe.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-pink-600 text-white text-xs font-black flex items-center justify-center">
                4
              </div>
              <h4 className="text-sm font-bold text-slate-900">Select Comfortable Activities</h4>
              <p className="text-xs text-slate-600">
                Choose what you enjoy: cafe chats, art galleries, city walking tours, gaming, or cinema.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-pink-600 text-white text-xs font-black flex items-center justify-center">
                5
              </div>
              <h4 className="text-sm font-bold text-slate-900">Set Your Hourly Rate</h4>
              <p className="text-xs text-slate-600">
                Choose any price between ₹400 and ₹1,200/hr. Keep 85% of each booking amount.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                6
              </div>
              <h4 className="text-sm font-bold text-slate-900">Safety Team Review</h4>
              <p className="text-xs text-slate-600">
                Verification by YorBuddy safety team within 24 hours. Once cleared, your profile goes live.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Application Form Modal / Area */}
        <div id="application-form-section" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm max-w-3xl mx-auto">
          {applicationSubmitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                Application Received!
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Thank you for applying to become a YorBuddy companion. Our safety and verification team is reviewing your documents.
              </p>
              <div className="p-4 bg-blue-50 rounded-2xl text-xs text-blue-900 font-semibold max-w-md mx-auto">
                ✓ Estimated review turnaround: Under 24 hours. You will receive an SMS and email notification upon approval.
              </div>
              <button
                onClick={() => setActiveTab('find-buddy')}
                className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Browse Companion Community
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplySuccess} className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Companion Application Form
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete these steps to become an approved buddy.
                </p>
              </div>

              {/* Step 1 & 2: Rate and Activities */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Set Your Hourly Companion Rate
                    </label>
                    <span className="text-base font-black text-pink-600">
                      ₹{hourlyRate}/hr
                    </span>
                  </div>
                  <input
                    type="range"
                    min="400"
                    max="1200"
                    step="50"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full accent-pink-500"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>₹400/hr (Beginner)</span>
                    <span>₹800/hr (Recommended)</span>
                    <span>₹1,200/hr (Top Companion)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Activities You Are Comfortable With
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activities.map((act) => {
                      const isChecked = selectedActivities.includes(act.id);
                      return (
                        <div
                          key={act.id}
                          onClick={() => toggleActivity(act.id)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center space-x-2 ${
                            isChecked
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="w-3.5 h-3.5 rounded-md border border-blue-500 flex items-center justify-center text-[10px]">
                            {isChecked ? '✓' : ''}
                          </span>
                          <span className="truncate">{act.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upload simulated document box */}
                <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 space-y-2 text-center">
                  <FileCheck className="w-8 h-8 text-blue-600 mx-auto" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">
                      Identity Document (Aadhaar / PAN / Passport)
                    </span>
                    <span className="text-slate-500">
                      Sample document attached: verified_kyc_aadhaar.pdf (2.4 MB)
                    </span>
                  </div>
                </div>

                {/* Strict Platonic Policy Acknowledgement */}
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                  <div className="flex items-center space-x-2 font-bold text-amber-950">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Strict Platonic Code of Conduct</span>
                  </div>
                  <p>
                    YorBuddy is strictly for friendly and social companionship in public spaces. Prostitution, escorts, dating solicitations, or private home visits are zero-tolerance violations resulting in immediate ban and legal reporting.
                  </p>
                  <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                    <input type="checkbox" defaultChecked required className="rounded text-pink-600" />
                    <span className="font-bold">
                      I understand and agree to adhere strictly to the Platonic Companion Guidelines.
                    </span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-pink-500 text-white font-black text-sm shadow-lg shadow-blue-500/25 hover:opacity-95 transition-opacity"
              >
                Submit Companion Application (Review in 24 Hours)
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
