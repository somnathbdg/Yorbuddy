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
import { Reveal } from '../visual/Decor';

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
    <section className="section-shell mesh-section-c py-20 sm:py-24">
      <div className="orb orb-blue top-[-10%] left-[4%] w-[400px] h-[400px] opacity-35 orb-drift-a" />
      <div className="orb orb-violet orb-purple bottom-[-12%] right-[6%] w-[420px] h-[420px] opacity-30 orb-drift-b" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full glass text-blue-600 font-bold text-sm uppercase tracking-wider mb-3">
            Simple &amp; Transparent
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            How YorBuddy <span className="text-gradient">Works</span>
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            From discovering a friendly companion to meeting for coffee in a verified public cafe — four easy, protected steps.
          </p>
        </Reveal>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.num} delay={idx * 0.08} className="h-full">
                <div className="group relative card-premium rounded-3xl p-6 flex flex-col justify-between h-full">
                  {/* Big ghost numeral behind content */}
                  <span className="pointer-events-none absolute -top-3 right-4 text-[5.5rem] font-black leading-none text-slate-900/[0.05] select-none">
                    {step.num}
                  </span>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-3xl font-black text-gradient">
                        {step.num}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg glass text-slate-600 text-xs font-bold">
                        {step.badge}
                      </span>
                    </div>

                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${step.color} flex items-center justify-center text-white mb-5 shadow-lg shadow-indigo-500/25 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                      <Icon className="w-7 h-7" />
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-2.5">
                      {step.title}
                    </h3>
                    <p className="text-base text-slate-600 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className="relative pt-6 mt-6 border-t border-slate-200/60 flex items-center text-sm font-bold text-blue-600 group-hover:text-pink-600 transition-colors">
                    <span>Learn more</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Public meeting safety callout */}
        <Reveal className="mt-14">
          <div className="relative rounded-3xl p-6 sm:p-8 glass-panel overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.06] via-pink-500/[0.06] to-blue-500/[0.06] pointer-events-none" />
            <div className="orb orb-pink top-[-60%] right-[6%] w-[260px] h-[260px] opacity-30" />

            <div className="relative flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-tint-pink">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  Rule #1: Public Places Always
                </h4>
                <p className="text-sm sm:text-base text-slate-600 max-w-2xl mt-0.5">
                  All YorBuddy sessions are strictly restricted to public places like cafes, bookstores, cinema halls, malls, or parks. No private residences or unverified locations allowed.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setRegisterStep(1);
                setIsRegisterModalOpen(true);
              }}
              className="cta-3d relative w-full md:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm whitespace-nowrap"
            >
              Get Started
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
