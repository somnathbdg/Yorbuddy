import React from 'react';
import {
  ShieldCheck,
  UserCheck,
  FileCheck,
  CreditCard,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { Reveal } from '../visual/Decor';

const trustFeatures = [
  {
    icon: <UserCheck className="w-6 h-6 text-blue-400" />,
    title: 'Account Authentication',
    desc: 'Secure registration with email verification and optional phone OTP.',
    glow: 'from-blue-500/25 to-cyan-500/10',
  },
  {
    icon: <FileCheck className="w-6 h-6 text-emerald-400" />,
    title: 'Profile Verification',
    desc: 'Optional KYC document verification for enhanced trust.',
    glow: 'from-emerald-500/25 to-teal-500/10',
  },
  {
    icon: <CreditCard className="w-6 h-6 text-purple-400" />,
    title: 'Secure Payments',
    desc: 'Razorpay-powered payment processing with booking records.',
    glow: 'from-purple-500/25 to-fuchsia-500/10',
  },
  {
    icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
    title: 'User Reporting',
    desc: 'Report concerns directly through the platform for admin review.',
    glow: 'from-amber-500/25 to-orange-500/10',
  },
  {
    icon: <Lock className="w-6 h-6 text-rose-400" />,
    title: 'Privacy Controls',
    desc: 'Your personal information is protected and never shared without consent.',
    glow: 'from-rose-500/25 to-pink-500/10',
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-indigo-400" />,
    title: 'Admin Controls',
    desc: 'Dedicated admin team monitors platform safety and user conduct.',
    glow: 'from-indigo-500/25 to-blue-500/10',
  },
];

export const TrustSafety: React.FC = () => {
  return (
    <section className="section-shell py-24 sm:py-28 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Decorative gradient orbs */}
      <div className="orb orb-blue top-[-18%] left-[-8%] w-[560px] h-[560px] opacity-60 orb-drift-a" />
      <div className="orb orb-purple bottom-[-16%] right-[-8%] w-[620px] h-[620px] opacity-55 orb-drift-b" />
      <div className="orb orb-emerald top-[42%] left-[52%] w-[420px] h-[420px] opacity-30 orb-drift-c" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div className="absolute inset-0 noise-layer pointer-events-none" />

      {/* Oversized watermark shield */}
      <ShieldCheck
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] text-white/[0.025] pointer-events-none"
        strokeWidth={0.5}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full glass-panel-dark text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-5">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Your Safety Matters
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
            <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              Designed for{' '}
            </span>
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Safe Connections
            </span>
          </h2>
          <p className="mt-5 text-lg text-slate-400 leading-relaxed">
            YorBuddy is designed to make meeting new people more comfortable, transparent and secure.
          </p>
        </Reveal>

        {/* Trust cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trustFeatures.map((feature, idx) => (
            <Reveal key={idx} delay={idx * 0.07} className="h-full">
              <div className="group relative h-full rounded-3xl p-6 glass-panel-dark overflow-hidden transition-all duration-500 ease-out hover:-translate-y-2.5 hover:border-white/25 hover:shadow-[0_30px_70px_-24px_rgba(0,0,0,0.85)]">
                {/* Per-card colour glow */}
                <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br ${feature.glow} blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                {/* Top hairline */}
                <div className="absolute top-0 left-[12%] right-[12%] h-[2px] rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Icon tile */}
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-white/12 to-white/[0.03] border border-white/12 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative z-10">{feature.icon}</div>
                </div>

                <h3 className="relative text-lg font-bold text-white mb-2 group-hover:text-blue-100 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="relative text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors duration-300">
                  {feature.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Bottom CTA panel */}
        <Reveal className="mt-16">
          <div className="relative rounded-3xl p-8 sm:p-10 glass-panel-dark overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-emerald-600/10 pointer-events-none" />
            <div className="orb orb-blue top-[-40%] left-[10%] w-[300px] h-[300px] opacity-30" />

            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left">
                <p className="text-base text-slate-300 max-w-xl leading-relaxed">
                  YorBuddy facilitates platonic companionship in public places. All users must be 18+ and agree to our community guidelines.
                </p>
              </div>
              <button className="cta-3d shrink-0 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 text-white font-bold text-sm uppercase tracking-wider">
                Learn More
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
