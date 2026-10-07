import React from 'react';
import { Star, MapPin, CheckCircle, Shield, Heart, ArrowRight, Sparkles, Lock } from 'lucide-react';
import { useApp, FullBuddyData } from '../../context/AppContext';
import { calculateCompatibility } from '../../utils/matching';

export const FeaturedBuddies: React.FC = () => {
  const {
    buddies,
    userProfile,
    favorites,
    toggleFavorite,
    setSelectedBuddyForModal,
    setSelectedBuddyForBooking,
    setActiveTab,
    isAuthenticated,
  } = useApp();

  const featured = buddies.slice(0, 4);

  // Logged-out visitors see a CTA instead of real buddy data
  if (!isAuthenticated) {
    return (
      <section className="section-shell mesh-section-a py-20 sm:py-24">
        <div className="orb orb-blue top-[-10%] left-[8%] w-[400px] h-[400px] opacity-30 orb-drift-a" />
        <div className="orb orb-pink bottom-[-12%] right-[8%] w-[380px] h-[380px] opacity-28 orb-drift-c" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full glass text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
                <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Profile Verification</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Featured Verified <span className="text-gradient">Buddies</span>
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-xl">
                Meet top-rated companions in your city. Profile verification, rated by real members, and ready for public meetups.
              </p>
            </div>
          </div>

          <div className="relative glass-panel rounded-3xl p-8 sm:p-12 text-center overflow-hidden">
            <div className="orb orb-purple top-[-40%] left-[20%] w-[300px] h-[300px] opacity-30" />
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-tint-violet">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-3">
                Login to Discover Verified Buddies
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                Sign in to view profiles, ratings, and book verified companions for coffee, movies, and more.
              </p>
              <button
                onClick={() => setActiveTab('find-buddy')}
                className="cta-3d inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-bold text-sm"
              >
                <span>Login to Explore</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell mesh-section-a py-20 sm:py-24">
      <div className="orb orb-purple top-[-8%] right-[8%] w-[400px] h-[400px] opacity-30 orb-drift-b" />
      <div className="orb orb-cyan bottom-[-10%] left-[6%] w-[360px] h-[360px] opacity-25 orb-drift-a" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full glass text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Profile Verification</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Featured Verified <span className="text-gradient">Buddies</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-xl">
              Meet top-rated companions in your city. Profile verification, rated by real members, and ready for public meetups.
            </p>
          </div>

          <button
            onClick={() => {
              setActiveTab('find-buddy');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="mt-4 md:mt-0 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl glass-strong text-slate-700 hover:text-blue-600 hover:border-blue-300 text-sm font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-tint-blue"
          >
            <span>Explore All Buddies ({buddies.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((buddy) => {
            const isFav = favorites.includes(buddy.user.id);
            const comp = calculateCompatibility(userProfile, buddy.buddyProfile, buddy.profile);

            return (
              <div
                key={buddy.user.id}
                className="group card-premium rounded-3xl overflow-hidden flex flex-col justify-between"
              >
                {/* Image header */}
                <div className="relative h-64 w-full overflow-hidden bg-slate-100">
                  <img
                    src={buddy.profile.photo_url}
                    alt={buddy.user.full_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.1]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30"></div>
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

                  {/* Top bar */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold border border-white/15">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          buddy.buddyProfile.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span>{buddy.buddyProfile.is_online ? 'Online Now' : 'Offline'}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(buddy.user.id);
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${
                        isFav
                          ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/40'
                          : 'bg-black/30 text-white hover:bg-white hover:text-pink-500'
                      }`}
                      aria-label="Save to favorites"
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
                    </button>
                  </div>

                  {/* Match pill */}
                  <div className="absolute bottom-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-600/90 backdrop-blur-md text-white text-xs font-bold shadow-md border border-white/20">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{comp.overallPercentage}% Match</span>
                  </div>

                  {/* Rate */}
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg glass text-slate-900 text-xs font-extrabold">
                    ₹{buddy.buddyProfile.hourly_rate}/hour
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {buddy.user.full_name.split(' ')[0]}, 25
                        </h3>
                        <span className="verified-badge w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-blue-500/30 ring-1 ring-white/60">
                          ✓
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs font-bold text-slate-800">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{buddy.buddyProfile.rating}</span>
                        <span className="text-slate-400 font-normal">
                          ({buddy.buddyProfile.review_count})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
                      <span className="truncate">{buddy.profile.city} • {buddy.profile.area}</span>
                    </div>

                    <p className="mt-3 text-xs text-slate-600 leading-relaxed line-clamp-2">
                      &ldquo;{buddy.buddyProfile.headline}&rdquo;
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {buddy.profile.interests.slice(0, 3).map((interest, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white/70 backdrop-blur-sm text-slate-600 text-[10px] font-medium border border-slate-200/60"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedBuddyForModal(buddy)}
                      className="w-full py-2.5 rounded-xl border-2 border-slate-200/80 hover:border-blue-400 text-slate-700 hover:text-blue-600 hover:bg-blue-50/50 text-xs font-bold transition-all duration-300"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => setSelectedBuddyForBooking(buddy)}
                      className="cta-3d w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white text-xs font-bold"
                    >
                      Book Buddy
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
