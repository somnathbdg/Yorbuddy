import React, { useState } from 'react';
import {
  X,
  Star,
  MapPin,
  CheckCircle,
  ShieldCheck,
  Heart,
  Calendar,
  MessageCircle,
  Clock,
  Languages,
  ShieldAlert,
  Sparkles,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calculateCompatibility } from '../../utils/matching';

export const BuddyProfileModal: React.FC = () => {
  const {
    selectedBuddyForModal,
    setSelectedBuddyForModal,
    setSelectedBuddyForBooking,
    setIsChatOpen,
    setActiveChatBuddy,
    userProfile,
    favorites,
    toggleFavorite,
    activities,
    reviews,
  } = useApp();

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  if (!selectedBuddyForModal) return null;

  const buddy = selectedBuddyForModal;
  const isFav = favorites.includes(buddy.user.id);
  const comp = calculateCompatibility(userProfile, buddy.buddyProfile, buddy.profile);

  // All photo URLs (main + gallery)
  const allPhotos = [
    buddy.profile.photo_url,
    ...(buddy.profile.gallery_urls || []),
  ];

  // Filter buddy reviews
  const buddyReviews = reviews.filter((r) => r.buddy_id === buddy.user.id);

  const supportedActs = activities.filter((a) =>
    buddy.buddyProfile.supported_activity_ids.includes(a.id)
  );

  const handleStartChat = () => {
    setActiveChatBuddy(buddy);
    setSelectedBuddyForModal(null);
    setIsChatOpen(true);
  };

  const handleOpenBooking = () => {
    setSelectedBuddyForBooking(buddy);
    setSelectedBuddyForModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Sticky modal header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-800">Verified Buddy Profile</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              ✓ KYC Cleared
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => toggleFavorite(buddy.user.id)}
              className={`p-2 rounded-full border transition-colors ${
                isFav
                  ? 'border-pink-300 bg-pink-50 text-pink-600'
                  : 'border-slate-200 text-slate-500 hover:text-pink-500'
              }`}
              aria-label="Save to favorites"
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-pink-500' : ''}`} />
            </button>
            <button
              id="close-profile-modal-btn"
              onClick={() => setSelectedBuddyForModal(null)}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal scrollable body */}
        <div className="overflow-y-auto p-6 space-y-8">
          {/* Main Hero Photo & Identity Header */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Gallery Left */}
            <div className="md:col-span-5 space-y-3">
              <div className="relative h-80 rounded-3xl overflow-hidden bg-slate-100 shadow-md">
                <img
                  src={allPhotos[activePhotoIdx]}
                  alt={buddy.user.full_name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-semibold flex items-center space-x-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      buddy.buddyProfile.is_online ? 'bg-emerald-400' : 'bg-slate-400'
                    }`}
                  />
                  <span>{buddy.buddyProfile.is_online ? 'Online' : 'Offline'}</span>
                </div>
              </div>

              {allPhotos.length > 1 && (
                <div className="flex items-center space-x-2">
                  {allPhotos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`h-16 w-16 rounded-xl overflow-hidden border-2 transition-all ${
                        activePhotoIdx === idx ? 'border-pink-500 scale-105' : 'border-transparent opacity-70'
                      }`}
                    >
                      <img src={photo} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Info Right */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                      {buddy.user.full_name}, 25
                    </h2>
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      ✓
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">
                      ₹{buddy.buddyProfile.hourly_rate}
                    </span>
                    <span className="text-xs text-slate-500 font-normal"> / hour</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center mt-1">
                  <MapPin className="w-4 h-4 text-slate-400 mr-1" />
                  {buddy.profile.city} • {buddy.profile.area}
                </p>
              </div>

              {/* Rating & reviews header */}
              <div className="flex items-center space-x-4 py-2 px-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="font-extrabold text-sm text-slate-800">
                    {buddy.buddyProfile.rating}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({buddy.buddyProfile.review_count} reviews)
                  </span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="text-xs text-slate-600 flex items-center">
                  <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  {buddy.buddyProfile.response_time}
                </div>
              </div>

              {/* Match Compatibility Banner */}
              <div className="bg-blue-50/80 rounded-2xl p-3.5 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <div>
                    <span className="text-xs font-bold text-blue-950">
                      {comp.overallPercentage}% Match with You
                    </span>
                    <p className="text-[11px] text-blue-800 leading-tight">
                      {comp.explanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Headline */}
              <blockquote className="text-sm font-semibold text-slate-800 italic border-l-4 border-pink-500 pl-3">
                “{buddy.buddyProfile.headline}”
              </blockquote>

              {/* Languages */}
              <div className="flex items-center space-x-2 text-xs text-slate-600">
                <Languages className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-700">Speaks:</span>
                <span>{buddy.profile.languages.join(', ')}</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 grid grid-cols-2 gap-3">
                <button
                  id="profile-chat-btn"
                  onClick={handleStartChat}
                  className="py-3 px-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat with Buddy</span>
                </button>

                <button
                  id="profile-request-booking-btn"
                  onClick={handleOpenBooking}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 hover:opacity-95 transition-opacity flex items-center justify-center space-x-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Request Booking</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mandatory Safety Tips Card */}
          <div className="bg-amber-50 rounded-2xl p-4 sm:p-5 border border-amber-200/80 flex items-start space-x-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold block text-sm mb-0.5 text-amber-950">
                Safety Tips for All Sessions
              </span>
              <p className="font-semibold">
                “First meetings should always take place in public locations.”
              </p>
              <p className="mt-1 text-amber-800">
                Keep all messages inside the YorBuddy app. Never share personal financial details, passwords, or bank OTPs. Meet at trusted cafes, malls, or public places during daylight/open hours.
              </p>
            </div>
          </div>

          {/* About Me Section */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">About {buddy.user.full_name}</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {buddy.buddyProfile.bio}
            </p>
          </div>

          {/* Supported Activities */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">Available Activities</h3>
            <div className="flex flex-wrap gap-2">
              {supportedActs.map((act) => (
                <div
                  key={act.id}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/60 flex items-center space-x-1.5"
                >
                  <span>{act.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interests & Hobbies */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">Interests & Passions</h3>
            <div className="flex flex-wrap gap-2">
              {buddy.profile.interests.map((interest, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {/* Availability Slots */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">General Availability</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block">Weekdays</span>
                <span className="text-slate-500">5:00 PM – 9:00 PM</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block">Saturdays</span>
                <span className="text-slate-500">10:00 AM – 8:00 PM</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block">Sundays</span>
                <span className="text-slate-500">10:00 AM – 7:00 PM</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                <span className="font-bold block">Notice Needed</span>
                <span>2 hours minimum</span>
              </div>
            </div>
          </div>

          {/* Real Reviews Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Verified Member Reviews ({buddyReviews.length})
              </h3>
              <div className="flex items-center space-x-1 text-xs font-bold text-slate-700">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{buddy.buddyProfile.rating} Average Rating</span>
              </div>
            </div>

            {buddyReviews.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl">
                No reviews yet for this companion. Be the first to book and share your feedback!
              </p>
            ) : (
              <div className="space-y-3">
                {buddyReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {rev.author_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{rev.author_name}</p>
                          <p className="text-[10px] text-slate-400">{rev.author_city}</p>
                        </div>
                      </div>
                      <div className="flex items-center text-amber-500">
                        {[...Array(rev.rating)].map((_, idx) => (
                          <Star key={idx} className="w-3.5 h-3.5 fill-amber-500" />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>

                    {rev.tags && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {rev.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600"
                          >
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
