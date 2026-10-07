import React, { useState, useEffect, useCallback } from 'react';
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
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { bookingService, Booking } from '../../services/booking';
import { paymentService } from '../../services/payment';
import { userService } from '../../services/user';
import { KycStatus, VerificationStatus } from '../../types/database';
import { EmailVerificationPanel, PhoneVerificationPanel, KycSubmissionPanel } from './VerificationPanel';

export const UserDashboard: React.FC = () => {
  const {
    currentUser,
    userProfile,
    membership,
    buddies,
    activities,
    favorites,
    toggleFavorite,
    setSelectedBuddyForModal,
    setSelectedBuddyForBooking,
    setIsChatOpen,
    setActiveChatBooking,
    setActiveChatBuddy,
    setActiveTab,
    verificationStatus,
    setVerificationStatus,
    kycRecords,
    setKycRecords,
    apiMembership,
    fetchApiMembership,
  } = useApp();

  const [bookingFilter, setBookingFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [apiBookings, setApiBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  // Payment retry state (per booking)
  const [payProcessingId, setPayProcessingId] = useState<string | null>(null);
  const [payErrorId, setPayErrorId] = useState<string | null>(null);
  const [paySuccessId, setPaySuccessId] = useState<string | null>(null);

  // Fetch bookings from API
  const fetchBookings = useCallback(async () => {
    setIsLoadingBookings(true);
    setBookingsError(null);
    try {
      const response = await bookingService.getBookings();
      setApiBookings(response.bookings);
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setBookingsError(apiError?.message || 'Failed to load bookings.');
      setApiBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchApiMembership();
    fetchVerificationStatus();
  }, [fetchBookings, fetchApiMembership]);

  // Fetch real verification status from API
  const fetchVerificationStatus = useCallback(async () => {
    try {
      const status = await userService.getVerificationStatus();
      setVerificationStatus(status);
    } catch (err) {
      console.error('Failed to load verification status:', err);
    }
  }, []);

  // Cancel booking via API
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }
    try {
      await bookingService.cancelBooking(bookingId);
      await fetchBookings(); // Refresh list
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      alert(apiError?.message || 'Failed to cancel booking.');
    }
  };

  // Retry payment for pending/unpaid booking
  const handlePayNow = async (booking: Booking) => {
    setPayProcessingId(booking.id);
    setPayErrorId(null);
    setPaySuccessId(null);
    try {
      // Create Razorpay order via backend (server calculates amount)
      const order = await paymentService.createOrder(booking.id);

      // Open Razorpay Checkout with server-provided order_id, amount, key_id
      paymentService.openCheckout({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'YorBuddy',
        description: 'Booking Payment',
        prefill: {
          name: currentUser.full_name,
          email: currentUser.email,
        },
        theme: { color: '#2563EB' },
        handler: async (response: any) => {
          // DIAGNOSTIC: Log handler firing
          console.log('[PAYMENT DEBUG] Razorpay success handler fired');
          console.log('[PAYMENT DEBUG] response.razorpay_order_id:', response.razorpay_order_id);
          console.log('[PAYMENT DEBUG] response.razorpay_payment_id:', response.razorpay_payment_id);
          console.log('[PAYMENT DEBUG] response.razorpay_signature:', response.razorpay_signature ? 'present' : 'NULL');
          
          // Verify payment with backend — only then mark as success
          try {
            console.log('[PAYMENT DEBUG] Calling verifyPayment...');
            const verifyResult = await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            console.log('[PAYMENT DEBUG] verifyPayment succeeded:', JSON.stringify(verifyResult));
            setPaySuccessId(booking.id);
            await fetchBookings(); // Refresh booking list to show confirmed status
          } catch (verifyErr: any) {
            const verifyError = verifyErr.response?.data?.error;
            console.error('[PAYMENT DEBUG] verifyPayment failed:', verifyError?.message || verifyErr.message);
            console.error('[PAYMENT DEBUG] Full error:', JSON.stringify(verifyErr.response?.data || verifyErr));
            setPayErrorId(booking.id);
          }
        },
        onDismiss: () => {
          // User closed checkout without paying — keep booking PENDING
          setPayErrorId(booking.id);
          console.log('Payment checkout dismissed for booking', booking.id);
        },
        onError: (err: any) => {
          // Razorpay checkout failed to load or encountered an error
          setPayErrorId(booking.id);
          console.error('Payment checkout error:', err.message);
        },
      });
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setPayErrorId(booking.id);
      console.error('Payment initiation failed:', apiError?.message || err.message);
      // If a previous successful payment exists but booking is still pending, inform user
      try {
        const paymentStatus = await paymentService.getPaymentStatus(booking.id);
        if (paymentStatus && paymentStatus.status === 'success') {
          setPayErrorId(null);
          setPaySuccessId(booking.id);
          await fetchBookings();
        }
      } catch {
        // ignore — keep the error message
      }
    } finally {
      setPayProcessingId(null);
    }
  };

  const myBookings = apiBookings;
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
                src={userProfile?.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={currentUser?.full_name}
                className="w-16 h-16 rounded-full object-cover ring-4 ring-blue-500/20"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {currentUser?.full_name}
                </h1>
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                  ✓
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {currentUser?.email} • {currentUser?.phone} • {userProfile?.city}
              </p>
            </div>
          </div>

          {/* Membership Badge Card - fetches real membership from API */}
          <div className="flex items-center space-x-3 p-3.5 bg-gradient-to-r from-blue-50 to-pink-50 rounded-2xl border border-pink-200">
            <ShieldCheck className="w-8 h-8 text-pink-600 flex-shrink-0" />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-black text-slate-900">
                  Membership: {apiMembership ? (apiMembership.is_active ? 'Active ✓' : 'Inactive') : 'Loading...'}
                </span>
                {apiMembership && (
                  <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 text-[10px] font-bold">
                    ₹{apiMembership.amount} Paid
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600">
                {apiMembership
                  ? (apiMembership.plan_id === 'MONTH_1' ? '1 Month Plan'
                    : apiMembership.plan_id === 'WEEK_1' ? '1 Week Plan'
                    : apiMembership.plan_id === 'FREE_TRIAL' ? 'Free Trial'
                    : apiMembership.plan_id === 'MONTH_6' ? '6 Months Plan (Legacy)'
                    : apiMembership.plan_id === 'YEAR_1' ? '1 Year Plan (Legacy)'
                    : apiMembership.plan_id === 'LIFETIME' ? 'Lifetime Plan (Legacy)'
                    : apiMembership.plan_id)
                    + (apiMembership.expiry_date
                      ? ' • Expires ' + new Date(apiMembership.expiry_date).toLocaleDateString('en-IN')
                      : ' • Never expires')
                  : 'Loading membership...'}
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
            {verificationStatus ? (
              <>
                <span className={`text-xs font-black mt-2 block flex items-center ${verificationStatus.is_fully_verified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {verificationStatus.is_fully_verified ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Fully Verified
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-1" />
                      Verification Pending
                    </>
                  )}
                </span>
                <p className="text-[10px] text-slate-500 mt-1">
                  Email: {verificationStatus.email} | Phone: {verificationStatus.phone} | KYC: {verificationStatus.kyc}
                </p>
              </>
            ) : (
              <span className="text-xs font-black text-slate-600 mt-2 block flex items-center">
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                Loading...
              </span>
            )}
          </div>
        </div>

        {/* Verification Center */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-black text-slate-900">Verification Center</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verify your identity to use all features. Your data is secure and only visible to you and admin reviewers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <EmailVerificationPanel onStatusChange={fetchVerificationStatus} />
            <PhoneVerificationPanel onStatusChange={fetchVerificationStatus} />
            <KycSubmissionPanel onStatusChange={fetchVerificationStatus} />
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

          {/* Loading State */}
          {isLoadingBookings && (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
              <Loader2 className="w-10 h-10 text-blue-600 mx-auto mb-2 animate-spin" />
              <p className="text-sm font-bold text-slate-700">Loading bookings...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoadingBookings && bookingsError && (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
              <p className="text-sm font-bold text-rose-600">{bookingsError}</p>
              <button
                onClick={fetchBookings}
                className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingBookings && !bookingsError && filteredBookings.length === 0 && (
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
          )}

          {/* Bookings List */}
          {!isLoadingBookings && !bookingsError && filteredBookings.length > 0 && (
            <div className="space-y-4">
              {filteredBookings.map((b) => {
                // Resolve buddy: use only API-provided buddy summary (booking.buddy).
                // Never fall back to local mock data — each booking keeps its own buddy.
                const buddyObj = b.buddy
                  ? {
                      user: { id: b.buddy.id, full_name: b.buddy.full_name },
                      profile: {
                        photo_url: b.buddy.photo_url || '',
                        city: b.buddy.city || '',
                        area: '',
                        languages: [],
                        interests: [],
                      },
                      buddyProfile: {
                        id: '',
                        hourly_rate: b.buddy.hourly_rate || 0,
                        headline: '',
                        bio: '',
                        rating: b.buddy.rating || 0,
                        review_count: b.buddy.review_count || 0,
                        is_verified: b.buddy.is_verified || false,
                        is_online: false,
                        response_time: b.buddy.response_time || '',
                        badge_text: b.buddy.badge_text || '',
                        supported_activity_ids: [],
                        safety_pledge_signed: true,
                      },
                    }
                  : null;
                const buddyName = buddyObj
                  ? buddyObj.user.full_name
                  : b.buddy_id
                  ? `Buddy (${b.buddy_id.slice(0, 8)})`
                  : 'Unknown Buddy';
                const buddyPhoto = buddyObj?.profile?.photo_url || '';

                const actObj = activities.find((a) => a.id === b.activity_id) || activities[0];

                return (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Companion info */}
                    <div className="flex items-start space-x-3.5">
                      {buddyPhoto ? (
                        <img
                          src={buddyPhoto}
                          alt={buddyName}
                          className="w-14 h-14 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-400 text-xl font-bold">
                          {buddyName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {buddyName}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              b.status === 'confirmed'
                                ? 'bg-blue-100 text-blue-700'
                                : b.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : b.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
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
                        <span>{b.booking_date} at {b.booking_time}</span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Total Amount: <span className="font-black text-slate-900">₹{b.total_amount}</span>
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Ref: {b.booking_code}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1.5">
                      {b.status === 'pending' && (
                        <button
                          onClick={() => handlePayNow(b)}
                          disabled={payProcessingId === b.id}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white text-xs font-bold flex items-center space-x-1 shadow-xs disabled:opacity-50 transition-all"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{payProcessingId === b.id ? 'Processing...' : 'Pay ₹' + b.total_amount}</span>
                        </button>
                      )}

                      {payErrorId === b.id && (
                        <p className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                          Payment failed. You can try again.
                        </p>
                      )}
                      {paySuccessId === b.id && (
                        <p className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                          Payment successful! Booking confirmed.
                        </p>
                      )}

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

                      {(b.status === 'confirmed' || b.status === 'pending') && (
                        <button
                          onClick={() => handleCancelBooking(b.id)}
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
