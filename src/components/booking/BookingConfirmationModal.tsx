import React, { useState } from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  X,
  XCircle,
  CreditCard,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { bookingService } from '../../services/booking';
import { paymentService } from '../../services/payment';

export const BookingConfirmationModal: React.FC = () => {
  const {
    isConfirmationModalOpen,
    setIsConfirmationModalOpen,
    latestConfirmedBooking,
    buddies,
    activities,
    currentUser,
    setActiveTab,
    setIsChatOpen,
    setActiveChatBooking,
    setActiveChatBuddy,
  } = useApp();

  // Payment state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Cancellation state
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking? Full refund will be issued.')) {
      return;
    }

    setIsCancelling(true);
    setCancelError(null);

    try {
      await bookingService.cancelBooking(booking.id);
      setIsConfirmationModalOpen(false);
      setIsCancelling(false);
    } catch (err: any) {
      setIsCancelling(false);
      const apiError = err.response?.data?.error;
      setCancelError(apiError?.message || 'Failed to cancel booking. Please try again.');
    }
  };

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      // Create order
      const order = await paymentService.createOrder(booking.id);

      // Open Razorpay checkout
      paymentService.openCheckout({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'YorBuddy',
        description: `Booking ${order.booking_code}`,
        prefill: {
          name: currentUser.full_name,
          email: currentUser.email,
        },
        theme: {
          color: '#2563EB',
        },
        handler: async (response: any) => {
          // Payment successful - verify with backend
          try {
            await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPaymentSuccess(true);
          } catch (verifyErr: any) {
            const apiError = verifyErr.response?.data?.error;
            setPaymentError(apiError?.message || 'Payment verification failed. Please contact support.');
          }
        },
      });
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setPaymentError(apiError?.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setIsProcessingPayment(false);
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
          Booking Created ✓
        </h2>
        <p className="text-sm font-semibold text-pink-600 mt-1">
          Complete payment to confirm your booking with {buddyObj.user.full_name.split(' ')[0]}.
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
              <span className="text-xs font-bold text-slate-800">{booking.booking_date}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Clock className="w-4 h-4 text-pink-600 flex-shrink-0" />
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">Time & Duration</span>
              <span className="text-xs font-bold text-slate-800">
                {booking.booking_time} ({booking.duration_hours} {booking.duration_hours === 1 ? 'Hour' : 'Hours'})
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
            <span className="text-slate-500 font-medium">Total Payable</span>
            <span className="font-extrabold text-slate-900">₹{booking.total_amount}</span>
          </div>
        </div>

        {/* Payment Success State */}
        {paymentSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-800">Payment successful! Booking confirmed.</span>
          </div>
        )}

        {/* Payment Error */}
        {paymentError && (
          <p className="mt-4 text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
            {paymentError}
          </p>
        )}

        {/* Cancel error */}
        {cancelError && (
          <p className="mt-4 text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
            {cancelError}
          </p>
        )}

        {/* Public safety reassurance */}
        <p className="mt-4 text-[11px] text-slate-500 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
          🛡️ Remember to meet at the public seating area. In-app chat is now unlocked.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={handleViewDashboard}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            View Booking
          </button>

          {!paymentSuccess ? (
            <button
              onClick={handlePayment}
              disabled={isProcessingPayment}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:opacity-95 transition-opacity flex items-center justify-center space-x-1 disabled:opacity-50"
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pay ₹{booking.total_amount}</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleMessageBuddy}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:opacity-95 transition-opacity flex items-center justify-center space-x-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Message Buddy</span>
            </button>
          )}

          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center justify-center space-x-1 disabled:opacity-50"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Booking</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
