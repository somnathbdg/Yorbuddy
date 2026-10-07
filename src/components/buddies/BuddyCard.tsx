import React, { useState } from 'react';
import {
  Star,
  MapPin,
  CheckCircle,
  Heart,
  Sparkles,
  Info,
  Clock,
  Calendar,
} from 'lucide-react';
import { FullBuddyData, useApp } from '../../context/AppContext';
import { calculateCompatibility } from '../../utils/matching';
import { getPhotoUrl } from '../../utils/photo';

interface BuddyCardProps {
  buddy: FullBuddyData;
}

export const BuddyCard: React.FC<BuddyCardProps> = ({ buddy }) => {
  const {
    userProfile,
    favorites,
    toggleFavorite,
    setSelectedBuddyForModal,
    setSelectedBuddyForBooking,
    activities,
  } = useApp();

  const [showMatchDetails, setShowMatchDetails] = useState(false);

  const isFav = favorites.includes(buddy.user.id);
  const comp = calculateCompatibility(userProfile, buddy.buddyProfile, buddy.profile);

  const supportedActivities = activities.filter((a) =>
    buddy.buddyProfile.supported_activity_ids.includes(a.id)
  );

  return (
    <div
      id={`buddy-card-${buddy.user.id}`}
      className="buddy-card-3d group relative h-full"
    >
      {/* Coloured ambient halo behind the card (depth, not decoration-for-decoration) */}
      <div className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-blue-400/0 via-purple-400/0 to-pink-400/0 opacity-0 blur-2xl transition-all duration-500 group-hover:from-blue-400/30 group-hover:via-purple-400/25 group-hover:to-pink-400/30 group-hover:opacity-100" />

      {/* Card inner — receives the 3D tilt on hover */}
      <div className="buddy-card-inner card-buddy relative rounded-3xl flex flex-col justify-between overflow-hidden">

        {/* Top gradient hairline accent */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 z-30" />

        {/* ── Photo header ── */}
        <div
          className="relative h-72 w-full overflow-hidden bg-slate-100 cursor-pointer"
          onClick={() => setSelectedBuddyForModal(buddy)}
        >
          <img
            src={getPhotoUrl(buddy.profile.photo_url)}
            alt={buddy.user.full_name}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.1]"
          />

          {/* Premium gradient overlays — bottom-weighted so the photo leads */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/22 to-black/5" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

          {/* Inner glow on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 70px rgba(59,130,246,0.22)' }}
          />

          {/* Top controls */}
          <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between z-10">
            {/* Online status */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl text-white text-sm font-semibold border border-white/20">
              <span className="relative flex items-center">
                <span
                  className={`absolute inline-flex h-2.5 w-2.5 rounded-full ${
                    buddy.buddyProfile.is_online ? 'bg-emerald-400' : 'bg-slate-400'
                  } opacity-75 animate-ping`}
                />
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    buddy.buddyProfile.is_online ? 'bg-emerald-400' : 'bg-slate-400'
                  }`}
                />
              </span>
              <span>{buddy.buddyProfile.is_online ? 'Online Now' : 'Offline'}</span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(buddy.user.id);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl transition-all duration-300 active:scale-90 ${
                isFav
                  ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/40'
                  : 'bg-black/50 text-white hover:bg-white hover:text-pink-500 border border-white/20'
              }`}
              aria-label="Save buddy to favorites"
            >
              <Heart className={`w-4.5 h-4.5 ${isFav ? 'fill-white' : ''}`} />
            </button>
          </div>

          {/* Match pill */}
          <div className="absolute bottom-3.5 left-3.5 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMatchDetails(!showMatchDetails);
              }}
              className="match-shimmer flex items-center space-x-1.5 px-4 py-1.5 rounded-2xl bg-white/15 backdrop-blur-xl text-white text-sm font-bold border border-white/25 shadow-lg hover:bg-white/25 transition-all duration-300"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{comp.overallPercentage}% Match</span>
              <Info className="w-3.5 h-3.5 text-white/70 ml-0.5" />
            </button>
          </div>

          {/* Hourly rate */}
          <div className="absolute bottom-3.5 right-3.5 px-3.5 py-1.5 rounded-2xl bg-white/15 backdrop-blur-xl text-white text-sm font-black border border-white/25 shadow-lg z-10">
            ₹{buddy.buddyProfile.hourly_rate}/hour
          </div>
        </div>

        {/* ── Match breakdown popover ── */}
        {showMatchDetails && (
          <div className="p-4 bg-gradient-to-br from-blue-50/95 to-indigo-50/95 border-b border-blue-200/50 text-xs text-slate-700 animate-in fade-in duration-150">
            <div className="flex items-center justify-between font-bold text-blue-900 mb-2">
              <span>Why You Matched ({comp.overallPercentage}%)</span>
              <button
                onClick={() => setShowMatchDetails(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-2">{comp.explanation}</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div>• Location: {comp.locationScore}/30 pts</div>
              <div>• Activities: {comp.activitiesScore}/25 pts</div>
              <div>• Interests: {comp.interestsScore}/20 pts</div>
              <div>• Availability: {comp.availabilityScore}/15 pts</div>
              <div>• Language: {comp.languageScore}/10 pts</div>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div className="p-5 flex-1 flex flex-col justify-between bg-gradient-to-br from-white via-slate-50/60 to-blue-50/40">
          <div>
            {/* Name / verified / rating */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {buddy.user.full_name.split(' ')[0]}, 25
                  </h3>
                  {/* Verified badge — gradient pill + glow ring */}
                  <span
                    title="Government Identity & Video KYC Verified"
                    className="verified-badge verified-badge-glow inline-flex items-center px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white text-[10px] font-bold tracking-wide shadow-md shadow-blue-500/35 ring-1 ring-white/60 [text-shadow:0_1px_1px_rgba(2,6,23,0.25)]"
                  >
                    <CheckCircle className="w-3 h-3 mr-1 drop-shadow-sm" />
                    Verified
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-500 flex items-center mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  {buddy.profile.city} •{' '}
                  <span className="text-slate-400 font-normal ml-1">{buddy.profile.area}</span>
                </p>
              </div>

              {/* Rating */}
              <div className="text-right">
                <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl glass text-slate-900 text-sm font-extrabold">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{buddy.buddyProfile.rating}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {buddy.buddyProfile.review_count} reviews
                </p>
              </div>
            </div>

            {/* Headline */}
            <p className="mt-3 text-sm text-slate-700 font-medium italic line-clamp-2 leading-relaxed">
              &ldquo;{buddy.buddyProfile.headline}&rdquo;
            </p>

            {/* Response time / languages */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/60 pt-2.5">
              <span className="flex items-center">
                <Clock className="w-3 h-3 text-slate-400 mr-1" />
                {buddy.buddyProfile.response_time}
              </span>
              <span className="text-slate-400">
                {buddy.profile.languages.slice(0, 2).join(', ')}
              </span>
            </div>

            {/* Activity pills */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {supportedActivities.slice(0, 3).map((act) => (
                <span
                  key={act.id}
                  className="px-2.5 py-1 rounded-lg bg-white/70 backdrop-blur-sm text-slate-700 text-xs font-semibold border border-slate-200/70 shadow-2xs"
                >
                  {act.title}
                </span>
              ))}
              {supportedActivities.length > 3 && (
                <span className="px-2 py-1 rounded-lg bg-slate-50/80 text-slate-400 text-xs border border-slate-200/50">
                  +{supportedActivities.length - 3}
                </span>
              )}
            </div>
          </div>

          {/* Actions — clear hierarchy: primary Book CTA, secondary View Profile */}
          <div className="mt-5 pt-4 border-t border-slate-200/60 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setSelectedBuddyForModal(buddy)}
              className="w-full py-3 rounded-2xl border border-slate-200/80 bg-white/60 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/60 text-slate-600 text-sm font-semibold transition-all duration-300 active:scale-95"
            >
              View Profile
            </button>
            <button
              onClick={() => setSelectedBuddyForBooking(buddy)}
              className="cta-3d w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white text-sm font-bold flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Buddy</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Scoped 3D / shimmer styles ── */}
      <style>{`
        .buddy-card-3d {
          perspective: 1400px;
        }
        .buddy-card-inner {
          transform-style: preserve-3d;
          transition:
            transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .buddy-card-3d:hover .buddy-card-inner {
          transform: perspective(1400px) rotateX(2.5deg) rotateY(-2.5deg) translateY(-12px) scale(1.02);
          box-shadow:
            0 34px 90px -24px rgba(15, 23, 42, 0.45),
            0 60px 120px -50px rgba(99, 102, 241, 0.45),
            0 0 0 1px rgba(255, 255, 255, 0.6);
        }

        /* Shimmer sweep for the match pill */
        .match-shimmer {
          position: relative;
          overflow: hidden;
        }
        .match-shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          animation: shimmer 3s infinite;
        }
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .buddy-card-inner { transition: none; }
          .buddy-card-3d:hover .buddy-card-inner { transform: none; }
          .match-shimmer::after { animation: none; }
        }
      `}</style>
    </div>
  );
};
