import React from 'react';
import { ArrowRight, Users, Briefcase, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Reveal } from '../visual/Decor';

export const FinalCTA: React.FC = () => {
  const { isAuthenticated, setActiveTab, setIsRegisterModalOpen, setRegisterStep, setAuthMode } = useApp();

  const handleFindBuddy = () => {
    if (isAuthenticated) {
      setActiveTab('find-buddy');
    } else {
      setAuthMode('register');
      setRegisterStep(1);
      setIsRegisterModalOpen(true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBecomeBuddy = () => {
    if (isAuthenticated) {
      setActiveTab('become-buddy');
    } else {
      setAuthMode('register');
      setRegisterStep(1);
      setIsRegisterModalOpen(true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="relative py-24 sm:py-28 overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-pink-600 animate-gradient">
      {/* Ambient decorations */}
      <div className="orb orb-cyan top-[-20%] right-[-6%] w-[520px] h-[520px] opacity-50 orb-drift-a" />
      <div className="orb orb-pink bottom-[-24%] left-[-8%] w-[480px] h-[480px] opacity-45 orb-drift-c" />
      <div className="absolute inset-0 noise-layer pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <Reveal>
          <span className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 text-white text-sm font-bold uppercase tracking-widest mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Your Next Plan Awaits
          </span>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08]">
            Don&apos;t Do It Alone.
          </h2>
          <p className="mt-4 text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">
            Find your YorBuddy for your next plan.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleFindBuddy}
              className="group w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-blue-700 font-black text-base flex items-center justify-center space-x-2 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.55)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_64px_-20px_rgba(0,0,0,0.6)] active:scale-95 shine-sweep"
            >
              <Users className="w-5 h-5" />
              <span>Join YorBuddy</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleBecomeBuddy}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl glass-panel-dark text-white font-black text-base hover:bg-white/20 flex items-center justify-center space-x-2 transition-all duration-300 hover:-translate-y-1.5 active:scale-95"
            >
              <Briefcase className="w-5 h-5" />
              <span>Become a Buddy</span>
            </button>
          </div>

          <p className="mt-8 inline-flex items-center space-x-2 text-base text-white/80 bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-2xl">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Account authentication, profile verification, and safety controls built in.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
};
