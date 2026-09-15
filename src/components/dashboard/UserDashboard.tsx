import React, { useState } from 'react';
import {
  Calendar,
  Heart,
  MessageCircle,
  ShieldCheck,
  CreditCard,
  User,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const UserDashboard: React.FC = () => {
  const {
    currentUser,
    userProfile,
    membership,
    bookings,
    buddies,
    activities,
    favorites,
    toggleFavorite,
    setSelectedBuddyForModal,
    setSelectedBuddyForBooking,
    setIsChatOpen,
    setActiveChatBooking,
    setActiveChatBuddy,
    cancelBooking,
    setActiveTab,
  } = useApp();

  const [bookingFilter, setBookingFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');

  const myBookings = bookings.filter((b) => b.user_id === currentUser.id);
  const filteredBookings = myBookings.filter((b) => {
    if (bookingFilter === 'all') return true;
    return b.status === bookingFilter;
  });

  const favoriteBuddies = buddies.filter((b) => favorites.includes(b.user.id));

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* User Profile Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={userProfile.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser.full_name}
                className="w-16 h-16 rounded-full object-cover ring-4 ring-blue-500/20"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {currentUser.full_name}
                </h1>
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                  ✓
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {currentUser.email} • {currentUser.phone_number} • {userProfile.city}
              </p>
            </div>
          </div>

          {/* Membership Badge Card */}
          <div className="flex items-center space-x-3 p-3.5 bg-gradient-to-r from-blue-50 to-pink-50 rounded-2xl border border-pink-200">
            <ShieldCheck className="w-8 h-8 text-pink-600 flex-shrink-0" />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-black text-slate-900">
                  Membership: Active ✓
                </span>
                <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 text-[10px] font-bold">
                  ₹499 Paid
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                One-Time Lifetime Plan (No monthly charges)
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Bookings
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {myBookings.length}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Upcoming Meetups
            </span>
            <span className="text-2xl font-black text-blue-600 mt-1 block">
              {myBookings.filter((b) => b.status === 'confirmed').length}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Saved Buddies
            </span>
            <span className="text-2xl font-black text-pink-600 mt-1 block">
              {favorites.length}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Safety Verification
            </span>
            <span className="text-xs font-black text-emerald-600 mt-2 block flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Govt KYC Cleared
            </span>
          </div>
        </div>

        {/* Main Section: My Bookings */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">My Bookings</h2>
              <p className="text-xs text-slate-500">
                Track companion schedules, public venues, and start messages.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl">
              {(['all', 'confirmed', 'completed', 'cancelled'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setBookingFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    bookingFilter === filter
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No bookings found in this view</p>
              <p className="text-xs text-slate-500 mt-1">Ready to meet a companion for an activity?</p>
              <button
                onClick={() => setActiveTab('find-buddy')}
                className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                Discover Buddies
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => {
                const buddyObj = buddies.find((bud) => bud.user.id === b.buddy_id) || buddies[0];
                const actObj = activities.find((a) => a.id === b.activity_id) || activities[0];

                return (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Companion info */}
                    <div className="flex items-start space-x-3.5">
                      <img
                        src={buddyObj.profile.photo_url}
                        alt={buddyObj.user.full_name}
                        className="w-14 h-14 rounded-2xl object-cover"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {buddyObj.user.full_name}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              b.status === 'confirmed'
                                ? 'bg-blue-100 text-blue-700'
                                : b.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-pink-600 mt-0.5">
                          {actObj.title} ({b.duration_hours} {b.duration_hours === 1 ? 'hr' : 'hrs'})
                        </p>
                        <p className="text-xs text-slate-500 flex items-center mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1" />
                          {b.location_name}, {b.location_address}
                        </p>
                      </div>
                    </div>

                    {/* Schedule & Price */}
                    <div className="text-left md:text-right text-xs">
                      <div className="font-bold text-slate-900 flex md:justify-end items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{b.date} at {b.time}</span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Total Amount: <span className="font-black text-slate-900">₹{b.total_amount}</span>
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Ref: {b.booking_code}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setActiveChatBooking(b);
                          setActiveChatBuddy(buddyObj);
                          setIsChatOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1 shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>

                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to cancel this booking?')) {
                              cancelBooking(b.id);
                            }
                          }}
                          className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Saved Favorites Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Saved Buddies ({favoriteBuddies.length})
              </h3>
              <p className="text-xs text-slate-500">
                Your shortlisted companions for fast access
              </p>
            </div>
            <button
              onClick={() => setActiveTab('find-buddy')}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1"
            >
              <span>Explore More</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {favoriteBuddies.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-2xl">
              No favorites saved yet. Click the heart icon on any buddy card to save them here.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {favoriteBuddies.map((buddy) => (
                <div
                  key={buddy.user.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={buddy.profile.photo_url}
                      alt={buddy.user.full_name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{buddy.user.full_name}</h4>
                      <p className="text-[11px] text-slate-500">{buddy.profile.city}</p>
                      <p className="text-[11px] font-bold text-pink-600">₹{buddy.buddyProfile.hourly_rate}/hr</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedBuddyForModal(buddy)}
                      className="py-1.5 text-center text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => setSelectedBuddyForBooking(buddy)}
                      className="py-1.5 text-center text-xs font-bold text-white bg-blue-600 rounded-lg"
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
