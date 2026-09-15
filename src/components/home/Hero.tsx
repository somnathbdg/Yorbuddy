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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Hero: React.FC = () => {
  const { setActiveTab, setSelectedCity } = useApp();

  const cities = ['Pune', 'Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Kolkata', 'Chennai', 'Jaipur', 'Chandigarh', 'Ahmedabad'];

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setActiveTab('find-buddy');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-slate-50 pt-10 pb-16 lg:pt-16 lg:pb-24">
      {/* Decorative ambient background blur orbs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-pink-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 -ml-20 w-80 h-80 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Tagline Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 text-blue-700 text-xs font-bold shadow-xs">
              <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
              <span>Real People. Real Connections. Better Moments.</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Need Company? <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-500">
                Find Your Buddy.
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
              “Meet verified people for coffee, movies, shopping, events, conversations, city exploration and more.”
            </p>

            {/* Platform Clarity Note */}
            <div className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>100% Platonic & Public Meetups • Strictly Non-Dating • Identity Verified</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                id="hero-find-buddy-btn"
                onClick={() => {
                  setActiveTab('find-buddy');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-pink-500 text-white font-bold text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
              >
                <Search className="w-5 h-5" />
                <span>Find a Buddy</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="hero-become-buddy-btn"
                onClick={() => {
                  setActiveTab('become-buddy');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-800 font-bold text-base border-2 border-slate-200 hover:border-pink-500 hover:text-pink-600 shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-2"
              >
                <Users className="w-5 h-5" />
                <span>Become a Buddy</span>
              </button>
            </div>

            {/* Quick City Explorer */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center mr-1">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                Popular:
              </span>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => handleCitySelect(city)}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all shadow-2xs"
                >
                  {city}
                </button>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-200/80">
              <div className="flex items-center space-x-2 bg-white/80 p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">Verified Buddies</p>
                  <p className="text-[10px] text-slate-500">Aadhaar / ID checked</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-white/80 p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">Safe & Secure</p>
                  <p className="text-[10px] text-slate-500">Public places only</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-white/80 p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <Star className="w-5 h-5 text-amber-500 flex-shrink-0 fill-amber-500" />
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">Real Reviews</p>
                  <p className="text-[10px] text-slate-500">Post-meet ratings</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-white/80 p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                <CreditCard className="w-5 h-5 text-pink-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800">Secure Payments</p>
                  <p className="text-[10px] text-slate-500">UPI, Cards, NetBanking</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual Image Column */}
          <div className="lg:col-span-5 relative">
            {/* Main Lifestyle Card */}
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
                <img
                  src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=80"
                  alt="Indian companions enjoying coffee and chatting"
                  className="w-full h-[420px] object-cover hover:scale-105 transition-transform duration-500"
                />

                {/* Gradient overlay for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>

                {/* Floating caption on image */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-pink-500 text-[10px] font-bold uppercase">
                      Live Meetup
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      Blue Tokai Cafe, Pune
                    </span>
                  </div>
                  <p className="text-sm font-bold">
                    “Finally found a movie and coffee buddy on weekends!”
                  </p>
                </div>
              </div>

              {/* Floating Verified Buddy Profile Chip */}
              <div className="absolute -top-4 -left-4 sm:-left-6 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 flex items-center space-x-3 animate-bounce duration-1000">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80"
                    alt="Neha"
                    className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-500"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-bold text-slate-900">Neha, 25</span>
                    <span className="text-blue-600 text-xs">✓</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Pune • ⭐ 4.9 (128)</p>
                  <p className="text-[11px] font-bold text-pink-600">₹600/hr</p>
                </div>
              </div>

              {/* Floating Safety Chip */}
              <div className="absolute -bottom-5 -right-4 sm:-right-6 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  🛡️
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Public Places Only</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">100% Platonic Code</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
