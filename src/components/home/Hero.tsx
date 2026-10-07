import React from 'react';
import {
  Search,
  ShieldCheck,
  Star,
  CreditCard,
  CheckCircle2,
  Users,
  Sparkles,
  MapPin,
  ArrowRight,
  ChevronDown,
  Video,
  HeartHandshake,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AmbientOrbs } from '../visual/Decor';

export const Hero: React.FC = () => {
  const { setActiveTab, setSelectedCity, isAuthenticated } = useApp();

  const cities = ['Pune', 'Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Kolkata', 'Chennai', 'Jaipur', 'Chandigarh', 'Ahmedabad'];

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setActiveTab('find-buddy');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="section-shell mesh-hero pt-12 pb-24 lg:pt-20 lg:pb-32">
      {/* Fine grid + grain for print-like texture */}
      <div className="absolute inset-0 grid-overlay opacity-[0.5] pointer-events-none" />
      <div className="absolute inset-0 noise-layer pointer-events-none" />

      {/* Soft blue / purple / pink ambient glow orbs */}
      <AmbientOrbs />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-10 items-center">
          {/* ───────────────────────── Left: copy ───────────────────────── */}
          <div className="lg:col-span-7 space-y-7 text-center lg:text-left">
            {/* Tagline badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full glass-strong text-blue-700 text-sm font-bold">
              <Sparkles className="w-4 h-4 text-pink-500 animate-pulse-soft" />
              <span>Real People. Real Connections. Better Moments.</span>
            </div>

            {/* Headline */}
            <h1 className="text-[2.75rem] leading-[1.08] sm:text-6xl lg:text-[4.5rem] font-black text-slate-900 tracking-tight">
              Need Company? <br />
              <span className="text-gradient-vivid animate-gradient inline-block">
                Find Your Buddy.
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              &ldquo;Meet verified people for coffee, movies, shopping, events, conversations, city exploration and more.&rdquo;
            </p>

            {/* Platform clarity note */}
            <div className="inline-flex items-center space-x-2.5 text-sm font-semibold text-slate-600 glass px-4 py-2.5 rounded-2xl">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>100% Platonic &amp; Public Meetups • Strictly Non-Dating • Account Authentication</span>
            </div>

            {/* ── CTAs ── */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              {/* Primary — layered gradient frame + gloss + halo */}
              <button
                id="hero-find-buddy-btn"
                onClick={() => {
                  setActiveTab('find-buddy');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group relative w-full sm:w-auto rounded-2xl p-[2px] transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)',
                  backgroundSize: '300% 300%',
                  animation: 'gradient-shift 5s ease infinite',
                  boxShadow:
                    '0 4px 12px -2px rgba(59,130,246,0.45), 0 16px 36px -10px rgba(139,92,246,0.5), 0 34px 70px -24px rgba(236,72,153,0.45)',
                }}
              >
                <div className="cta-hero relative flex items-center justify-center space-x-2.5 px-8 py-4 rounded-[14px] bg-gradient-to-r from-blue-600 via-violet-600 to-pink-500 text-white font-bold text-base overflow-hidden shine-sweep">
                  <Search className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Find a Buddy</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </button>

              {/* Secondary — glass with hover lift */}
              <button
                id="hero-become-buddy-btn"
                onClick={() => {
                  setActiveTab('become-buddy');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl glass-strong text-slate-800 font-bold text-base hover:border-pink-500/50 hover:text-pink-600 flex items-center justify-center space-x-2 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-tint-pink"
              >
                <Users className="w-5 h-5" />
                <span>Become a Buddy</span>
              </button>
            </div>

            {/* Quick city explorer */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span className="text-sm font-bold text-slate-400 flex items-center mr-1">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                Popular:
              </span>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCitySelect(city)}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold glass text-slate-700 hover:border-blue-500/50 hover:text-blue-600 transition-all duration-200 hover:-translate-y-1 hover:shadow-tint-blue"
                >
                  {city}
                </button>
              ))}
            </div>

            {/* Trust badges — premium glass tiles */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="hairline col-span-2 sm:col-span-4 -mt-4 mb-2" />
              {[
                { icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, title: 'Verified Buddies', sub: 'Profile verification available' },
                { icon: <ShieldCheck className="w-5 h-5 text-blue-600" />, title: 'Safe & Secure', sub: 'Public places only' },
                { icon: <Star className="w-5 h-5 text-amber-500 fill-amber-500" />, title: 'Real Reviews', sub: 'Post-meet ratings' },
                { icon: <CreditCard className="w-5 h-5 text-pink-500" />, title: 'Secure Payments', sub: 'UPI, Cards, NetBanking' },
              ].map((badge) => (
                <div
                  key={badge.title}
                  className="group flex items-center space-x-3 glass-panel p-3 rounded-2xl transition-all duration-300 hover:-translate-y-1.5"
                >
                  <div className="icon-tile w-10 h-10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    {badge.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">{badge.title}</p>
                    <p className="text-xs text-slate-500">{badge.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─────────────────── Right: layered 3D hero visual ─────────────────── */}
          <div className="lg:col-span-5 relative perspective-far">
            <div className="relative mx-auto max-w-md lg:max-w-none preserve-3d">

              {/* Deepest layer — soft coloured halo behind everything */}
              <div
                className="absolute -inset-8 rounded-[3rem] pointer-events-none"
                style={{
                  background:
                    'radial-gradient(60% 60% at 30% 25%, rgba(59,130,246,0.45), transparent 70%), radial-gradient(55% 55% at 75% 80%, rgba(236,72,153,0.40), transparent 70%), radial-gradient(50% 50% at 60% 50%, rgba(139,92,246,0.35), transparent 70%)',
                  filter: 'blur(38px)',
                  transform: 'translateZ(-90px) scale(1.05)',
                }}
              />

              {/* Layer 3 — far rotated panel */}
              <div
                className="absolute inset-0 rounded-[2rem] border border-white/60 pointer-events-none"
                style={{
                  transform: 'rotate(-7deg) translate3d(-18px, 16px, -60px)',
                  background: 'linear-gradient(140deg, rgba(59,130,246,0.30), rgba(139,92,246,0.10))',
                  boxShadow: '0 30px 70px -30px rgba(37,99,235,0.55)',
                }}
              />

              {/* Layer 2 — mid rotated panel */}
              <div
                className="absolute inset-0 rounded-[2rem] border border-white/70 pointer-events-none"
                style={{
                  transform: 'rotate(4.5deg) translate3d(14px, -12px, -30px)',
                  background: 'linear-gradient(140deg, rgba(236,72,153,0.26), rgba(139,92,246,0.12))',
                  boxShadow: '0 30px 70px -30px rgba(236,72,153,0.5)',
                }}
              />

              {/* Layer 1 — tight accent frame */}
              <div
                className="absolute inset-0 rounded-[1.75rem] pointer-events-none"
                style={{
                  transform: 'translate3d(0,0,-14px) scale(1.015)',
                  background: 'linear-gradient(140deg, rgba(255,255,255,0.9), rgba(255,255,255,0.35))',
                  boxShadow: '0 24px 60px -26px rgba(15,23,42,0.45)',
                }}
              />

              {/* Front card — animated gradient border + deep shadow */}
              <div
                className="relative rounded-[1.75rem] p-[3px] z-10 shadow-float-lg"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)',
                  backgroundSize: '300% 300%',
                  animation: 'gradient-shift 7s ease infinite',
                }}
              >
                <div className="relative rounded-[1.6rem] overflow-hidden bg-white">
                  <img
                    src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=80"
                    alt="Indian companions enjoying coffee and chatting"
                    className="w-full h-[440px] object-cover transition-transform duration-700 ease-out hover:scale-[1.06]"
                  />

                  {/* Legibility gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-pink-500/15" />
                  {/* Glass top highlight */}
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

                  {/* Live pill top-left */}
                  <div className="absolute top-4 left-4 flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-xl border border-white/25 text-white text-[11px] font-bold uppercase tracking-wider">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-500" />
                    </span>
                    Live Meetup
                  </div>

                  {/* Verified chip top-right */}
                  <div className="absolute top-4 right-4 flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-white/85 backdrop-blur-xl text-slate-900 text-[11px] font-black border border-white/70 shadow-lg">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Verified
                  </div>

                  {/* Caption */}
                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-pink-300" />
                      <span className="text-sm font-semibold text-slate-200">Blue Tokai Cafe, Pune</span>
                    </div>
                    <p className="text-base font-bold leading-snug">
                      &ldquo;Finally found a movie and coffee buddy on weekends!&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Floating glass info cards ── */}
              <div className="absolute -top-6 -left-6 sm:-left-12 z-20 glass-panel p-3 rounded-2xl flex items-center space-x-3 animate-float">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Verified Buddies</p>
                  <p className="text-xs text-slate-500">Ready to meet near you</p>
                </div>
              </div>

              <div className="absolute -top-3 -right-4 sm:-right-10 z-20 glass-panel p-3 rounded-2xl flex items-center space-x-3 animate-float-delayed">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Public Places</p>
                  <p className="text-xs text-slate-500">Cafes, parks &amp; more</p>
                </div>
              </div>

              <div className="absolute -bottom-6 -right-4 sm:-right-10 z-20 glass-panel p-3 rounded-2xl flex items-center space-x-3 animate-float-slow">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">100% Platonic</p>
                  <p className="text-xs text-emerald-600 font-semibold">Strictly Non-Dating</p>
                </div>
              </div>

              {/* Bottom-left card — reflects auth state */}
              <div className="absolute -bottom-6 -left-4 sm:-left-10 z-20 glass-panel p-3 rounded-2xl flex items-center space-x-3 animate-float">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                  {isAuthenticated ? <Video className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {isAuthenticated ? 'Video KYC Verified' : 'Login to Discover'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isAuthenticated ? 'Trusted companions near you' : 'Verified Buddies Near You'}
                  </p>
                  <button
                    onClick={() => setActiveTab('find-buddy')}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    {isAuthenticated ? 'Find a Buddy →' : 'Join YorBuddy →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 animate-bounce">
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Scroll</span>
        <ChevronDown className="w-5 h-5 text-slate-400" />
      </div>
    </section>
  );
};
