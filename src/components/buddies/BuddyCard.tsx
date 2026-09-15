import React, { useState } from 'react';
import {
  Star,
  MapPin,
  CheckCircle,
  Heart,
  Sparkles,
  Info,
  Clock,
  MessageCircle,
  Calendar,
} from 'lucide-react';
import { FullBuddyData, useApp } from '../../context/AppContext';
import { calculateCompatibility } from '../../utils/matching';

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

  // Supported activity objects
  const supportedActivities = activities.filter((a) =>
    buddy.buddyProfile.supported_activity_ids.includes(a.id)
  );

  return (
    <div
      id={`buddy-card-${buddy.user.id}`}
      className="group relative bg-white rounded-3xl overflow-hidden border border-slate-200/90 hover:border-blue-400 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
    >
      {/* Photo header */}
      <div className="relative h-72 w-full overflow-hidden bg-slate-100 cursor-pointer" onClick={() => setSelectedBuddyForModal(buddy)}>
        <img
          src={buddy.profile.photo_url}
          alt={buddy.user.full_name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

        {/* Top Controls: Status & Favorite */}
        <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-semibold border border-white/10">
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
                ? 'bg-pink-500 text-white shadow-md'
                : 'bg-black/40 text-white hover:bg-white hover:text-pink-500'
            }`}
            aria-label="Save buddy to favorites"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
          </button>
        </div>

        {/* Floating Match Pill with Info Click */}
        <div className="absolute bottom-3.5 left-3.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMatchDetails(!showMatchDetails);
            }}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-blue-600/95 backdrop-blur-md text-white text-xs font-bold shadow-md hover:bg-blue-700 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{comp.overallPercentage}% Match</span>
            <Info className="w-3 h-3 text-blue-200 ml-0.5" />
          </button>
        </div>

        {/* Hourly Rate */}
        <div className="absolute bottom-3.5 right-3.5 px-3 py-1 rounded-xl bg-white/95 backdrop-blur-md text-slate-900 text-xs font-black shadow-md">
          ₹{buddy.buddyProfile.hourly_rate}/hour
        </div>
      </div>

      {/* Match Breakdown Popover Overlay */}
      {showMatchDetails && (
        <div className="p-4 bg-blue-50/95 border-b border-blue-200 text-xs text-slate-700 animate-in fade-in duration-150">
          <div className="flex items-center justify-between font-bold text-blue-900 mb-2">
            <span>Why You Matched ({comp.overallPercentage}%)</span>
            <button
              onClick={() => setShowMatchDetails(false)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-slate-600 mb-2">{comp.explanation}</p>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div>• Location: {comp.locationScore}/30 pts</div>
            <div>• Activities: {comp.activitiesScore}/25 pts</div>
            <div>• Interests: {comp.interestsScore}/20 pts</div>
            <div>• Availability: {comp.availabilityScore}/15 pts</div>
            <div>• Language: {comp.languageScore}/10 pts</div>
          </div>
        </div>
      )}

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Name, Age, Verified badge, Rating */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {buddy.user.full_name.split(' ')[0]}, 25
                </h3>
                <span
                  title="Government Identity & Video KYC Verified"
                  className="w-4.5 h-4.5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs"
                >
                  ✓
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 flex items-center mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1" />
                {buddy.profile.city} • <span className="text-slate-400 font-normal ml-1">{buddy.profile.area}</span>
              </p>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-900 text-xs font-extrabold border border-amber-200">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{buddy.buddyProfile.rating}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {buddy.buddyProfile.review_count} reviews
              </p>
            </div>
          </div>

          {/* Short Headline / Bio */}
          <p className="mt-3 text-xs text-slate-700 font-medium italic line-clamp-2 leading-relaxed">
            “{buddy.buddyProfile.headline}”
          </p>

          {/* Response time & languages */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
            <span className="flex items-center">
              <Clock className="w-3 h-3 text-slate-400 mr-1" />
              {buddy.buddyProfile.response_time}
            </span>
            <span className="text-slate-400">
              {buddy.profile.languages.slice(0, 2).join(', ')}
            </span>
          </div>

          {/* Activity Pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {supportedActivities.slice(0, 3).map((act) => (
              <span
                key={act.id}
                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
              >
                {act.title}
              </span>
            ))}
            {supportedActivities.length > 3 && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-400 text-[10px]">
                +{supportedActivities.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
          <button
            onClick={() => setSelectedBuddyForModal(buddy)}
            className="w-full py-2.5 rounded-xl border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 hover:bg-blue-50/40 text-xs font-bold transition-all"
          >
            View Profile
          </button>
          <button
            onClick={() => setSelectedBuddyForBooking(buddy)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:opacity-95 transition-opacity flex items-center justify-center space-x-1"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Book Buddy</span>
          </button>
        </div>
      </div>
    </div>
  );
};
