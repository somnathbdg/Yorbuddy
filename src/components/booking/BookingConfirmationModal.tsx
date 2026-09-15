import React from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  X,
  XCircle,
  FileText,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BookingConfirmationModal: React.FC = () => {
  const {
    isConfirmationModalOpen,
    setIsConfirmationModalOpen,
    latestConfirmedBooking,
    buddies,
    activities,
    setActiveTab,
    setIsChatOpen,
    setActiveChatBooking,
    setActiveChatBuddy,
    cancelBooking,
  } = useApp();

  if (!isConfirmationModalOpen || !latestConfirmedBooking) return null;

  const booking = latestConfirmedBooking;
  const buddyObj = buddies.find((b) => b.user.id === booking.buddy_id) || buddies[0];
  const activityObj = activities.find((a) => a.id === booking.activity_id) || activities[0];

  const handleMessageBuddy = () => {
    setActiveChatBooking(booking);
    setActiveChatBuddy(buddyObj);
    setIsConfirmationModalOpen(false);
    setIsChatOpen(true);
  };

  const handleViewDashboard = () => {
    setIsConfirmationModalOpen(false);
    setActiveTab('user-dashboard');
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this booking? Full refund will be issued.')) {
      cancelBooking(booking.id);
      setIsConfirmationModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 text-center">
        <button
          onClick={() => setIsConfirmationModalOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Animated Badge */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50 shadow-md">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Booking Confirmed ✓
        </h2>
        <p className="text-sm font-semibold text-pink-600 mt-1">
          “You&apos;re all set to meet {buddyObj.user.full_name.split(' ')[0]}.”
        </p>

        {/* Booking Card Details */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Booking ID
            </span>
            <span className="text-xs font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {booking.booking_code}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">Date</span>
              <span className="text-xs font-bold text-slate-800">{booking.date}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Clock className="w-4 h-4 text-pink-600 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">Time & Duration</span>
              <span className="text-xs font-bold text-slate-800">
                {booking.time} ({booking.duration_hours} {booking.duration_hours === 1 ? 'Hour' : 'Hours'})
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-base flex-shrink-0">☕</span>
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">Activity</span>
              <span className="text-xs font-bold text-slate-800">{activityObj.title}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">Location</span>
              <span className="text-xs font-bold text-slate-800">{booking.location_name}</span>
              <span className="text-[11px] text-slate-500 block">{booking.location_address}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Total Paid</span>
            <span className="font-extrabold text-slate-900">₹{booking.total_amount}</span>
          </div>
        </div>

        {/* Public safety reassurance */}
        <p className="mt-4 text-[11px] text-slate-500 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
          🛡️ Remember to meet at the public seating area. In-app chat is now unlocked.
        </p>

        {/* 3 Action Buttons as explicitly requested */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={handleViewDashboard}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            View Booking
          </button>

          <button
            onClick={handleMessageBuddy}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:opacity-95 transition-opacity flex items-center justify-center space-x-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Message Buddy</span>
          </button>

          <button
            onClick={handleCancel}
            className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center justify-center space-x-1"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancel Booking</span>
          </button>
        </div>
      </div>
    </div>
  );
};
