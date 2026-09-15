import React from 'react';
import { Star, MapPin, CheckCircle, Shield, Heart, ArrowRight, Sparkles } from 'lucide-react';
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
  } = useApp();

  const featured = buddies.slice(0, 4);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Identity Verified</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Featured Verified Buddies
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-xl">
              Meet top-rated companions in your city. Background verified, rated by real members, and ready for public meetups.
            </p>
          </div>

          <button
            onClick={() => {
              setActiveTab('find-buddy');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="mt-4 md:mt-0 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 text-sm font-bold transition-all shadow-2xs"
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
                className="group bg-white rounded-3xl overflow-hidden border border-slate-200/80 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                {/* Image Header with Badge */}
                <div className="relative h-64 w-full overflow-hidden bg-slate-100">
                  <img
                    src={buddy.profile.photo_url}
                    alt={buddy.user.full_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30"></div>

                  {/* Top bar over image: Online Status & Favorite button */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold border border-white/10">
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
                      className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-transform active:scale-90 ${
                        isFav
                          ? 'bg-pink-500 text-white'
                          : 'bg-black/30 text-white hover:bg-white hover:text-pink-500'
                      }`}
                      aria-label="Save to favorites"
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
                    </button>
                  </div>

                  {/* Compatibility score pill */}
                  <div className="absolute bottom-3 left-3 flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-600/90 backdrop-blur-md text-white text-xs font-bold shadow-md">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{comp.overallPercentage}% Match</span>
                  </div>

                  {/* Rate Badge */}
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-md text-slate-900 text-xs font-extrabold shadow-md">
                    ₹{buddy.buddyProfile.hourly_rate}/hour
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Name, Age, Verification */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {buddy.user.full_name.split(' ')[0]}, 25
                        </h3>
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
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

                    {/* Location */}
                    <div className="flex items-center text-xs text-slate-500 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
                      <span className="truncate">{buddy.profile.city} • {buddy.profile.area}</span>
                    </div>

                    {/* Short Bio */}
                    <p className="mt-3 text-xs text-slate-600 leading-relaxed line-clamp-2">
                      “{buddy.buddyProfile.headline}”
                    </p>

                    {/* Interests tags */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {buddy.profile.interests.slice(0, 3).map((interest, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
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
                      className="w-full py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => setSelectedBuddyForBooking(buddy)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:opacity-95 transition-opacity"
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
