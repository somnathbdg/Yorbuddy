import React from 'react';
import {
  UserPlus,
  Compass,
  CalendarCheck,
  Smile,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HowItWorks: React.FC = () => {
  const { setActiveTab, setIsRegisterModalOpen, setRegisterStep } = useApp();

  const steps = [
    {
      num: '01',
      title: 'Create Your Profile',
      desc: 'Tell us about yourself, your interests and what kind of company you are looking for.',
      icon: UserPlus,
      color: 'from-blue-600 to-indigo-600',
      badge: 'Step 1',
    },
    {
      num: '02',
      title: 'Discover Buddies',
      desc: 'Find verified buddies based on location, interests, activity and availability.',
      icon: Compass,
      color: 'from-indigo-600 to-purple-600',
      badge: 'Step 2',
    },
    {
      num: '03',
      title: 'Connect & Book',
      desc: 'Send a request, chat after mutual acceptance and confirm your booking.',
      icon: CalendarCheck,
      color: 'from-purple-600 to-pink-600',
      badge: 'Step 3',
    },
    {
      num: '04',
      title: 'Meet & Enjoy',
      desc: 'Meet safely at a mutually agreed public location and enjoy your time together.',
      icon: Smile,
      color: 'from-pink-500 to-rose-500',
      badge: 'Step 4',
    },
  ];

  return (
    <section className="py-20 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-blue-50 text-blue-600 font-bold text-xs uppercase tracking-wider mb-3">
            Simple & Transparent
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            How YorBuddy Works
          </h2>
          <p className="mt-3 text-base text-slate-600">
            From discovering a friendly companion to meeting for coffee in a verified public cafe — four easy, protected steps.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="group relative bg-slate-50/70 hover:bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-blue-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-pink-500">
                      {step.num}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white text-slate-600 text-[11px] font-bold border border-slate-200 shadow-2xs">
                      {step.badge}
                    </span>
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-pink-500 flex items-center justify-center text-white mb-5 shadow-md shadow-blue-500/10 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-7 h-7" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2.5">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-200/60 flex items-center text-xs font-bold text-blue-600 group-hover:text-pink-600 transition-colors">
                  <span>Learn more</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Public Meeting Safety Callout */}
        <div className="mt-14 bg-gradient-to-r from-blue-50 via-pink-50 to-blue-50 rounded-3xl p-6 sm:p-8 border border-pink-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-pink-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-pink-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Rule #1: Public Places Always
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-0.5">
                All YorBuddy sessions are strictly restricted to public places like cafes, bookstores, cinema halls, malls, or parks. No private residences or unverified locations allowed.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setRegisterStep(1);
              setIsRegisterModalOpen(true);
            }}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs whitespace-nowrap shadow-md transition-colors"
          >
            Get Started (₹499 One-Time)
          </button>
        </div>
      </div>
    </section>
  );
};
