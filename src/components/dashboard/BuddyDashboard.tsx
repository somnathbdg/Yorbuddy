import React, { useState } from 'react';
import {
  Wallet,
  IndianRupee,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  MapPin,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BuddyDashboard: React.FC = () => {
  const {
    bookings,
    buddies,
    activities,
    reviews,
    updateBookingStatus,
  } = useApp();

  // Pick primary buddy profile for demonstration (Neha Sharma)
  const buddy = buddies[0];

  const [isOnline, setIsOnline] = useState(buddy.buddyProfile.is_online);
  const [currentRate, setCurrentRate] = useState(buddy.buddyProfile.hourly_rate);
  const [rateSaved, setRateSaved] = useState(false);

  // Buddy bookings
  const buddyBookings = bookings.filter((b) => b.buddy_id === buddy.user.id);
  const pendingRequests = buddyBookings.filter((b) => b.status === 'confirmed');
  const completedSessions = buddyBookings.filter((b) => b.status === 'completed');

  // Realistic earnings calculation
  const totalEarned = 18400;
  const pendingPayout = 3200;

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    setRateSaved(true);
    setTimeout(() => setRateSaved(false), 2000);
  };

  const buddyReviews = reviews.filter((r) => r.buddy_id === buddy.user.id);

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Companion Header Profile */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={buddy.profile.photo_url}
                alt={buddy.user.full_name}
                className="w-16 h-16 rounded-full object-cover ring-4 ring-pink-500/20"
              />
              <span
                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                  isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {buddy.user.full_name}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  Verified Companion
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {buddy.profile.city} • ⭐ {buddy.buddyProfile.rating} ({buddy.buddyProfile.review_count} reviews)
              </p>
            </div>
          </div>

          {/* Online Toggle & Quick Switch */}
          <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Live Status: {isOnline ? 'Available Now' : 'Offline'}
              </span>
              <span className="text-[10px] text-slate-500">
                {isOnline ? 'Appearing in "Online Now" filters' : 'Hidden from instant meetups'}
              </span>
            </div>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all ${
                isOnline
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isOnline ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>

        {/* Earnings Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Total Earned</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              ₹{totalEarned.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              Direct payouts to HDFC Bank ****4812
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Pending Payout</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-600 tracking-tight">
              ₹{pendingPayout.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500">
              Settles this Friday at 11:59 PM
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Completed Sessions</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-blue-600 tracking-tight">
              28 meetups
            </div>
            <p className="text-[11px] text-slate-500">
              100% public venue compliance
            </p>
          </div>
        </div>

        {/* Rate Setting & Availability Manager */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <h2 className="text-lg font-black text-slate-900 mb-4">
            Companion Rate & Settings
          </h2>
          <form onSubmit={handleSaveRate} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Your Hourly Rate (₹400 – ₹1,200)
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="400"
                  max="1200"
                  step="50"
                  value={currentRate}
                  onChange={(e) => setCurrentRate(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notice Period
              </label>
              <select className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800">
                <option>At least 2 hours advance notice</option>
                <option>At least 4 hours advance notice</option>
                <option>1 day advance notice</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
              >
                {rateSaved ? 'Saved Successfully ✓' : 'Update Companion Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Booking Requests (Accept / Decline) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Incoming Booking Requests & Scheduled Sessions
              </h2>
              <p className="text-xs text-slate-500">
                Accept or reschedule sessions based on your availability.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
              {buddyBookings.length} Active
            </span>
          </div>

          <div className="space-y-4">
            {buddyBookings.map((b) => {
              const actObj = activities.find((a) => a.id === b.activity_id) || activities[0];

              return (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">
                        Session Request #{b.booking_code}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                        {b.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-pink-600 mt-1">
                      {actObj.title} • {b.duration_hours} Hours (₹{b.booking_amount})
                    </p>
                    <p className="text-xs text-slate-500 flex items-center mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1" />
                      {b.location_name}, {b.location_address}
                    </p>
                  </div>

                  <div className="text-left md:text-right text-xs">
                    <span className="font-bold text-slate-800 block">
                      {b.date} at {b.time}
                    </span>
                    <span className="text-slate-400 text-[11px] block mt-0.5">
                      Public Coffee Venue
                    </span>
                  </div>

                  {/* Actions: Accept or Decline */}
                  <div className="flex items-center space-x-2">
                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'completed')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                      >
                        Mark Completed
                      </button>
                    )}
                    <button
                      onClick={() => updateBookingStatus(b.id, 'cancelled')}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Member Ratings & Reviews Summary */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">
              Ratings & Member Testimonials
            </h3>
            <div className="flex items-center space-x-1 text-sm font-extrabold text-slate-800">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>4.9 / 5.0 Rating</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buddyReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{rev.author_name}</span>
                  <div className="flex text-amber-500">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-500" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 italic">“{rev.comment}”</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
