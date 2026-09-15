import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BookingModal: React.FC = () => {
  const {
    selectedBuddyForBooking,
    setSelectedBuddyForBooking,
    activities,
    submitBooking,
    currentUser,
    userProfile,
  } = useApp();

  if (!selectedBuddyForBooking) return null;

  const buddy = selectedBuddyForBooking;

  // Form states
  const [selectedActivityId, setSelectedActivityId] = useState<string>(
    buddy.buddyProfile.supported_activity_ids[0] || 'act-1'
  );
  const [bookingDate, setBookingDate] = useState<string>('2026-09-20');
  const [bookingTime, setBookingTime] = useState<string>('4:00 PM');
  const [durationHours, setDurationHours] = useState<number>(2);
  const [locationName, setLocationName] = useState<string>('Blue Tokai Coffee Roasters');
  const [locationAddress, setLocationAddress] = useState<string>('FC Road, Shivajinagar, Pune');
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [safetyAcknowledged, setSafetyAcknowledged] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'credit_card' | 'debit_card' | 'net_banking'>('upi');
  const [upiId, setUpiId] = useState<string>('somnath@okhdfcbank');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const hourlyRate = buddy.buddyProfile.hourly_rate;
  const bookingAmount = hourlyRate * durationHours;
  const platformFee = 0; // Transparent zero fee for verified members
  const totalAmount = bookingAmount + platformFee;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!safetyAcknowledged) {
      setErrorMessage('Please confirm that you agree to meet in a public place and adhere to the safety policy.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    setTimeout(() => {
      submitBooking({
        user_id: currentUser.id,
        buddy_id: buddy.user.id,
        activity_id: selectedActivityId,
        date: bookingDate,
        time: bookingTime,
        duration_hours: durationHours,
        hourly_rate: hourlyRate,
        booking_amount: bookingAmount,
        platform_fee: platformFee,
        total_amount: totalAmount,
        status: 'confirmed',
        location_name: locationName,
        location_address: locationAddress,
        special_notes: specialNotes,
        meet_safety_acknowledged: true,
      });

      setIsProcessing(false);
      setSelectedBuddyForBooking(null);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-6 border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900">
              Book Companion Session
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
              Platonic Meetup
            </span>
          </div>
          <button
            onClick={() => setSelectedBuddyForBooking(null)}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirm} className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Buddy Summary Bar */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
            <div className="flex items-center space-x-3">
              <img
                src={buddy.profile.photo_url}
                alt={buddy.user.full_name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/40"
              />
              <div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="text-sm font-bold text-slate-900">{buddy.user.full_name}</h4>
                  <span className="text-blue-600 text-xs">✓</span>
                </div>
                <p className="text-xs text-slate-500">
                  {buddy.profile.city} • ⭐ {buddy.buddyProfile.rating}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-slate-900">
                ₹{hourlyRate}
              </span>
              <span className="text-xs text-slate-500"> / hr</span>
            </div>
          </div>

          {/* Activity Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Activity
            </label>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {activities
                .filter((act) => buddy.buddyProfile.supported_activity_ids.includes(act.id))
                .map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.title} — {act.description}
                  </option>
                ))}
            </select>
          </div>

          {/* Date, Time & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="2:00 PM">2:00 PM</option>
                  <option value="4:00 PM">4:00 PM</option>
                  <option value="6:00 PM">6:00 PM</option>
                  <option value="7:30 PM">7:30 PM</option>
                </select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Duration
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={1}>1 Hour</option>
                <option value={2}>2 Hours</option>
                <option value={3}>3 Hours</option>
                <option value={4}>4 Hours</option>
              </select>
            </div>
          </div>

          {/* Public Location Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Public Location Venue</span>
                <span className="text-[10px] text-emerald-600 font-bold">Public Place Only</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Blue Tokai Coffee Roasters / PVR Inox / Starbucks"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
            </div>

            <div>
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Area & Landmark (e.g. FC Road, Shivajinagar, Pune)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
          </div>

          {/* Special Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Special Notes or Discussion Topics (Optional)
            </label>
            <textarea
              rows={2}
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="e.g. Looking forward to discussing local architecture and trying the manual pour-over."
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          {/* Price Calculation Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>
                Buddy Fee (₹{hourlyRate} × {durationHours} {durationHours === 1 ? 'hour' : 'hours'})
              </span>
              <span className="font-semibold text-slate-800">₹{bookingAmount}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center space-x-1">
                <span>Platform Trust & Safety Fee</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 rounded">
                  Waived
                </span>
              </div>
              <span className="font-semibold text-emerald-600">₹0</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-black text-slate-900">
              <span>Total Payable</span>
              <span className="text-base text-pink-600">₹{totalAmount}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Payment Method (Test/Sandbox Mode)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'upi', label: 'UPI (GPay/PhonePe)' },
                  { id: 'credit_card', label: 'Credit Card' },
                  { id: 'debit_card', label: 'Debit Card' },
                  { id: 'net_banking', label: 'Net Banking' },
                ] as const
              ).map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                    paymentMethod === method.id
                      ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>

            {paymentMethod === 'upi' && (
              <div className="mt-2 flex items-center space-x-2">
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="Enter UPI ID (e.g. user@okhdfcbank)"
                  className="flex-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setUpiId('demo@upi')}
                  className="px-2.5 py-2 rounded-xl text-[11px] font-bold text-blue-600 bg-blue-50"
                >
                  Test Auto-Fill
                </button>
              </div>
            )}
          </div>

          {/* Mandatory Safety Reminder Before Payment */}
          <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200/80">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-900 leading-snug">
                  Safety Reminder Before Payment:
                </p>
                <p className="text-xs text-rose-800 font-semibold mt-0.5">
                  “Meet in a public place. Never share sensitive personal information.”
                </p>
                <label className="mt-3 flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={safetyAcknowledged}
                    onChange={(e) => setSafetyAcknowledged(e.target.checked)}
                    className="w-4 h-4 text-pink-600 rounded border-rose-300 focus:ring-pink-500"
                  />
                  <span className="text-xs font-bold text-rose-900">
                    I agree to meet strictly at this public venue and follow YorBuddy Platonic Guidelines.
                  </span>
                </label>
              </div>
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
              {errorMessage}
            </p>
          )}

          {/* Submit Button */}
          <button
            id="confirm-booking-submit-btn"
            type="submit"
            disabled={isProcessing}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-pink-500 text-white font-black text-sm shadow-lg shadow-blue-500/25 hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <span className="flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Confirming Booking...</span>
              </span>
            ) : (
              <span>Confirm Booking (₹{totalAmount})</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
