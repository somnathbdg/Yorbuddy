import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { authService } from '../services/auth';
import { membershipService } from '../services/membership';
import { notificationService } from '../services/notification';
import { bookingService } from '../services/booking';
import { userService } from '../services/user';
import {
  User,
  Profile,
  BuddyProfile,
  Activity,
  Booking,
  BookingMessage,
  Payment,
  Membership,
  Review,
  Report,
  Verification,
  UserVerificationStatus,
  KycStatus,
  VerificationStatus,
  Notification,
  UserRole,
} from '../types/database';
import { ACTIVITIES } from '../data/initialData';

export interface FullBuddyData {
  user: User;
  profile: Profile;
  buddyProfile: BuddyProfile;
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  userProfile: Profile | null;
  setUserProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  isInitializing: boolean;
  authMode: 'register' | 'login' | 'admin';
  setAuthMode: (mode: 'register' | 'login' | 'admin') => void;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  buddies: FullBuddyData[];
  activities: Activity[];
  bookings: Booking[];
  messages: BookingMessage[];
  reviews: Review[];
  notifications: Notification[];
  payments: Payment[];
  membership: Membership;
  verifications: Verification[];
  reports: Report[];
  favorites: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  legalPageSlug: string | null;
  setLegalPageSlug: (slug: string | null) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedActivitySlug: string | null;
  setSelectedActivitySlug: (slug: string | null) => void;
  selectedBuddyForModal: FullBuddyData | null;
  setSelectedBuddyForModal: (buddy: FullBuddyData | null) => void;
  selectedBuddyForBooking: FullBuddyData | null;
  setSelectedBuddyForBooking: (buddy: FullBuddyData | null) => void;
  bookingActivityPreset: string | null;
  setBookingActivityPreset: (activityId: string | null) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  activeChatBooking: Booking | null;
  setActiveChatBooking: (booking: Booking | null) => void;
  activeChatBuddy: FullBuddyData | null;
  setActiveChatBuddy: (buddy: FullBuddyData | null) => void;
  /** Real membership status fetched from backend API. Null = not loaded or no membership. */
  apiMembership: {
    id: string;
    plan_id: string;
    status: string;
    amount: number;
    currency: string;
    is_active: boolean;
    start_date: string | null;
    expiry_date: string | null;
  } | null;
  fetchApiMembership: () => Promise<void>;
  fetchVerificationStatus: () => Promise<void>;
  isRegisterModalOpen: boolean;
  setIsRegisterModalOpen: (open: boolean) => void;
  pendingMembershipPlan: string | null;
  setPendingMembershipPlan: (plan: string | null) => void;
  registerStep: number;
  setRegisterStep: (step: number) => void;
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (open: boolean) => void;
  pendingPaymentDetails: {
    type: 'membership' | 'booking';
    bookingData?: Partial<Booking>;
    amount: number;
  } | null;
  setPendingPaymentDetails: (details: any) => void;
  isReviewModalOpen: boolean;
  setIsReviewModalOpen: (open: boolean) => void;
  activeBookingForReview: Booking | null;
  setActiveBookingForReview: (booking: Booking | null) => void;
  isConfirmationModalOpen: boolean;
  setIsConfirmationModalOpen: (open: boolean) => void;
  latestConfirmedBooking: Booking | null;
  setLatestConfirmedBooking: (booking: Booking | null) => void;
  isSafetyReportModalOpen: boolean;
  setIsSafetyReportModalOpen: (open: boolean) => void;
  // Verification & KYC state
  verificationStatus: UserVerificationStatus | null;
  setVerificationStatus: (status: UserVerificationStatus | null) => void;
  kycRecords: Verification[];
  setKycRecords: (records: Verification[]) => void;
  // Actions
  toggleFavorite: (buddyId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  submitBooking: (bookingData: Omit<Booking, 'id' | 'booking_code' | 'created_at'>) => Booking;
  cancelBooking: (bookingId: string) => void;
  sendMessage: (bookingId: string, text: string) => void;
  submitReview: (bookingId: string, rating: number, comment: string, tags: string[]) => void;
  activateMembership: (method: 'upi' | 'credit_card' | 'debit_card' | 'net_banking') => void;
  submitReport: (category: Report['category'], description: string, reportedId?: string, bookingId?: string) => void;
  adminApproveKyc: (userId: string) => void;
  adminRejectKyc: (userId: string, reason: string) => void;
  adminToggleUserStatus: (userId: string) => void;
  adminProcessRefund: (paymentId: string) => void;
  buddyAcceptBooking: (bookingId: string) => void;
  buddyRejectBooking: (bookingId: string) => void;
  buddyToggleOnline: () => void;
  buddyUpdateRate: (newRate: number) => void;
  triggerConfetti: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('user');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'register' | 'login' | 'admin'>('register');

  // Initialize authentication state on app startup
  useEffect(() => {
    const initializeAuth = async () => {
      setIsInitializing(true);
      try {
        // Check if access token exists
        if (!authService.isAuthenticated()) {
          // No token — ensure clean logged-out state
          setCurrentUser(null);
          setIsAuthenticated(false);
          setActiveRole('user');
          return;
        }

        // Token exists — validate it by calling /auth/me
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        setIsAuthenticated(true);
        setActiveRole(userData.role);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Invalid/expired token — clear everything
        authService.clearTokens();
        setCurrentUser(null);
        setIsAuthenticated(false);
        setActiveRole('user');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  // App navigation state
  const [activeTab, setActiveTab] = useState<string>('home');
  const [legalPageSlug, setLegalPageSlug] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedActivitySlug, setSelectedActivitySlug] = useState<string | null>(null);

  // Modals state
  const [selectedBuddyForModal, setSelectedBuddyForModal] = useState<FullBuddyData | null>(null);
  const [selectedBuddyForBooking, setSelectedBuddyForBooking] = useState<FullBuddyData | null>(null);
  const [bookingActivityPreset, setBookingActivityPreset] = useState<string | null>(null);

  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [activeChatBooking, setActiveChatBooking] = useState<Booking | null>(null);
  const [activeChatBuddy, setActiveChatBuddy] = useState<FullBuddyData | null>(null);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [pendingMembershipPlan, setPendingMembershipPlan] = useState<string | null>(null);
  const [registerStep, setRegisterStep] = useState<number>(1);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [pendingPaymentDetails, setPendingPaymentDetails] = useState<{
    type: 'membership' | 'booking';
    bookingData?: Partial<Booking>;
    amount: number;
  } | null>(null);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [activeBookingForReview, setActiveBookingForReview] = useState<Booking | null>(null);

  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState<boolean>(false);
  const [latestConfirmedBooking, setLatestConfirmedBooking] = useState<Booking | null>(null);

  const [isSafetyReportModalOpen, setIsSafetyReportModalOpen] = useState<boolean>(false);

  // Membership payment state
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>('');
  const [payErrorId, setPayErrorId] = useState<string | null>(null);

  // Verification & KYC state
  const [verificationStatus, setVerificationStatus] = useState<UserVerificationStatus | null>(null);
  const [kycRecords, setKycRecords] = useState<Verification[]>([]);

  // Data Collections — all initialized empty; real data comes from API
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Real membership status from backend API (shared across Header + Dashboard)
  const [apiMembership, setApiMembership] = useState<{
    id: string;
    plan_id: string;
    status: string;
    amount: number;
    currency: string;
    is_active: boolean;
    start_date: string | null;
    expiry_date: string | null;
  } | null>(null);

  const fetchApiMembership = useCallback(async () => {
    if (!isAuthenticated) {
      setApiMembership(null);
      return;
    }
    try {
      const status = await membershipService.getMembershipStatus();
      setApiMembership(status);
    } catch (err) {
      console.error('Failed to load membership status:', err);
      setApiMembership(null);
    }
  }, [isAuthenticated]);

  // Fetch real membership status when user logs in/out
  useEffect(() => {
    fetchApiMembership();
  }, [fetchApiMembership]);

  // Fetch verification status when user logs in/out
  const fetchVerificationStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setVerificationStatus(null);
      return;
    }
    try {
      const status = await userService.getVerificationStatus();
      setVerificationStatus(status);
    } catch (err) {
      console.error('Failed to load verification status:', err);
      setVerificationStatus(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchVerificationStatus();
  }, [fetchVerificationStatus]);

  // Fetch notifications when user logs in/out
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    try {
      const response = await notificationService.getNotifications();
      setNotifications(response.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setNotifications([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Assembled Buddy Data — populated from API, not mock data
  const [buddies, setBuddies] = useState<FullBuddyData[]>([]);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563EB', '#EC4899', '#3B82F6', '#F43F5E', '#10B981'],
      });
    } catch {
      // safe fallback
    }
  };

  const toggleFavorite = (buddyId: string) => {
    setFavorites((prev) =>
      prev.includes(buddyId) ? prev.filter((id) => id !== buddyId) : [...prev, buddyId]
    );
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await notificationService.markRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await notificationService.markAllRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // submitBooking is now handled by BookingModal via API — this function is kept
  // for backward compatibility but should not be called directly.
  const submitBooking = (bookingData: Omit<Booking, 'id' | 'booking_code' | 'created_at'>): Booking => {
    // This is a no-op placeholder. Real booking creation happens via bookingService.createBooking.
    // The function signature is preserved to avoid breaking existing imports.
    throw new Error('submitBooking must be called via bookingService.createBooking. Direct state manipulation is not allowed.');
  };

  const cancelBooking = async (bookingId: string) => {
    // Cancel via API — backend handles status update and notification creation
    try {
      await bookingService.cancelBooking(bookingId);
      // Refresh bookings list
      const response = await bookingService.getBookings();
      setBookings(response.bookings);
    } catch (err) {
      console.error('Failed to cancel booking:', err);
    }
  };

  const sendMessage = (bookingId: string, text: string) => {
    if (!text.trim()) return;
    if (!currentUser) return;
    
    const userMsg: BookingMessage = {
      id: `msg-${Date.now()}`,
      booking_id: bookingId,
      sender_id: currentUser.id,
      recipient_id: activeChatBuddy ? activeChatBuddy.user.id : '',
      message: text.trim(),
      is_read: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Note: Real chat message delivery would require a backend chat API.
    // The previous simulated buddy response has been removed as it used
    // hardcoded mock user IDs and fake responses.
  };

  const submitReview = (bookingId: string, rating: number, comment: string, tags: string[]) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      booking_id: bookingId,
      user_id: currentUser.id,
      buddy_id: booking.buddy_id,
      author_name: currentUser.full_name,
      author_city: userProfile.city,
      rating,
      comment,
      tags,
      created_at: new Date().toISOString(),
    };

    setReviews((prev) => [newReview, ...prev]);
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, has_review: true } : b))
    );

    // Create notification for review submission
    const buddyObj = buddies.find((b) => b.user.id === booking.buddy_id);
    const buddyName = buddyObj ? buddyObj.user.full_name.split(' ')[0] : 'your buddy';
    notificationService.createNotification({
      type: 'review_received',
      title: 'Review Submitted',
      message: `Your ${rating}-star review for ${buddyName} has been posted. Thanks for supporting verified buddies!`,
    }).catch((err) => console.error('Failed to persist review notification:', err));

    // Update buddy profile rating count
    setBuddies((prev) =>
      prev.map((b) => {
        if (b.user.id === booking.buddy_id) {
          const newCount = b.buddyProfile.review_count + 1;
          const newRating = Number(
            ((b.buddyProfile.rating * b.buddyProfile.review_count + rating) / newCount).toFixed(2)
          );
          return {
            ...b,
            buddyProfile: {
              ...b.buddyProfile,
              review_count: newCount,
              rating: newRating,
            },
          };
        }
        return b;
      })
    );

    triggerConfetti();
  };

  const activateMembership = (method: 'upi' | 'credit_card' | 'debit_card' | 'net_banking') => {
    // Use the real backend membership API — NOT local mock state.
    // Default to TRIAL_1D (₹99) for registration flow; use pendingMembershipPlan if set.
    const planId = pendingMembershipPlan ?? 'TRIAL_1D';

    setIsProcessingPayment(true);
    setErrorText('');

    // Step 1: Create order via backend
    membershipService.createOrder(planId)
      .then((order) => {
        // Reset pending plan after order creation
        setPendingMembershipPlan(null);
        // Step 2: Open Razorpay checkout
        membershipService.openCheckout({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          order_id: order.order_id,
          name: 'YorBuddy',
          description: order.plan_name || 'Membership Payment',
          prefill: {
            name: currentUser?.full_name,
            email: currentUser?.email,
          },
          handler: async (response: any) => {
            // Step 3: Verify payment with backend
            try {
              const result = await membershipService.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              // Step 4: Update local state from verified backend data
              // NOTE: Backend returns status='success' (not 'active')
              if (result.status === 'success' || result.status === 'active') {
                setCurrentUser((prev) => ({
                  ...prev!,
                  is_membership_paid: true,
                  membership_paid_at: new Date().toISOString(),
                }));
                setMembership({
                  id: result.membership_id,
                  user_id: currentUser!.id,
                  amount: order.amount,
                  status: 'active',
                  activated_at: new Date().toISOString(),
                  membership_type: 'one_time_lifetime',
                  payment_id: response.razorpay_payment_id,
                });
                setIsPaymentComplete(true);
                triggerConfetti();
                notificationService.createNotification({
                  type: 'payment_success',
                  title: 'Membership Activated',
                  message: `Your YorBuddy ${order.plan_name} membership of ₹${order.amount / 100} is now active.`,
                }).catch((err) => console.error('Failed to persist membership notification:', err));

                // CRITICAL: Refresh global membership state so Header, Dashboard,
                // and BuddySearch all unlock after verified payment
                fetchApiMembership().catch((fetchErr) => {
                  console.error('[activateMembership] Failed to refresh membership after payment:', fetchErr);
                });
              } else {
                setErrorText('Payment verification failed. Please try again.');
                setPayErrorId(currentUser!.id);
              }
            } catch (verifyErr: any) {
              console.error('Membership verification failed:', verifyErr);
              setErrorText('Payment verification failed. Please contact support.');
              setPayErrorId(currentUser!.id);
            } finally {
              setIsProcessingPayment(false);
            }
          },
          onDismiss: () => {
            setIsProcessingPayment(false);
            setErrorText('Payment cancelled. You can try again.');
          },
          onError: (err: any) => {
            setIsProcessingPayment(false);
            setErrorText('Payment failed: ' + (err.message || 'Unknown error'));
          },
        });
      })
      .catch((err: any) => {
        setIsProcessingPayment(false);
        const apiError = err.response?.data?.error;
        setErrorText(apiError?.message || 'Failed to initiate membership payment. Please try again.');
      });
  };

  const submitReport = (
    category: Report['category'],
    description: string,
    reportedId = 'usr-unknown',
    bookingId?: string
  ) => {
    const newReport: Report = {
      id: `rep-${Date.now()}`,
      reporter_id: currentUser.id,
      reported_id: reportedId,
      booking_id: bookingId,
      category,
      description,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setReports((prev) => [newReport, ...prev]);
  };

  // Admin Actions — all via API, no local state manipulation
  const adminApproveKyc = async (kycId: string) => {
    try {
      await userService.approveKyc(kycId);
      // Refresh KYC records
      const res = await userService.getPendingKyc();
      setKycRecords(res.data);
    } catch (err) {
      console.error('Failed to approve KYC:', err);
      throw err;
    }
  };

  const adminRejectKyc = async (kycId: string, reason: string) => {
    try {
      await userService.rejectKyc(kycId, reason);
      // Refresh KYC records
      const res = await userService.getPendingKyc();
      setKycRecords(res.data);
    } catch (err) {
      console.error('Failed to reject KYC:', err);
      throw err;
    }
  };

  const adminToggleUserStatus = async (userId: string) => {
    // This should be implemented as a backend API endpoint
    // For now, log that this needs backend implementation
    console.warn('adminToggleUserStatus requires backend API endpoint for user status management');
    throw new Error('User status toggle requires backend API. Not implemented in Phase 1.');
  };

  const adminProcessRefund = async (paymentId: string) => {
    // This should be implemented as a backend API endpoint with Razorpay refund
    // For now, log that this needs backend implementation
    console.warn('adminProcessRefund requires backend API endpoint with Razorpay refund integration');
    throw new Error('Refund processing requires backend API with Razorpay refund integration. Not implemented in Phase 1.');
  };

  // Buddy Actions — all via API, no local state manipulation
  const buddyAcceptBooking = async (bookingId: string) => {
    try {
      await bookingService.updateBookingStatus(bookingId, 'confirmed');
      const response = await bookingService.getBookings();
      setBookings(response.bookings);
      const booking = response.bookings.find((b) => b.id === bookingId);
      if (booking) {
        const buddyObj = buddies.find((b) => b.user.id === booking.buddy_id);
        const buddyName = buddyObj ? buddyObj.user.full_name.split(' ')[0] : 'your buddy';
        notificationService.createNotification({
          type: 'booking_accepted',
          title: 'Booking Accepted',
          message: `${buddyName} has accepted your booking request!`,
        }).catch((err) => console.error('Failed to persist booking notification:', err));
      }
    } catch (err) {
      console.error('Failed to accept booking:', err);
      throw err;
    }
  };

  const buddyRejectBooking = async (bookingId: string) => {
    try {
      await bookingService.updateBookingStatus(bookingId, 'rejected');
      const response = await bookingService.getBookings();
      setBookings(response.bookings);
    } catch (err) {
      console.error('Failed to reject booking:', err);
      throw err;
    }
  };

  const buddyToggleOnline = async () => {
    // Online status toggle requires backend API endpoint
    console.warn('buddyToggleOnline requires backend API endpoint for buddy profile management');
    throw new Error('Buddy online status toggle requires backend API. Not implemented in Phase 1.');
  };

  const buddyUpdateRate = async (newRate: number) => {
    // Rate update requires backend API endpoint
    console.warn('buddyUpdateRate requires backend API endpoint for buddy profile management');
    throw new Error('Buddy rate update requires backend API. Not implemented in Phase 1.');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        userProfile,
        setUserProfile,
        isAuthenticated,
        setIsAuthenticated,
        isInitializing,
        authMode,
        setAuthMode,
        activeRole,
        setActiveRole,
        buddies,
        activities: ACTIVITIES,
        bookings,
        messages,
        reviews,
        notifications,
        payments,
        membership,
        verifications,
        reports,
        favorites,
        activeTab,
        setActiveTab,
        legalPageSlug,
        setLegalPageSlug,
        selectedCity,
        setSelectedCity,
        selectedActivitySlug,
        setSelectedActivitySlug,
        selectedBuddyForModal,
        setSelectedBuddyForModal,
        selectedBuddyForBooking,
        setSelectedBuddyForBooking,
        bookingActivityPreset,
        setBookingActivityPreset,
        isChatOpen,
        setIsChatOpen,
        activeChatBooking,
        setActiveChatBooking,
        activeChatBuddy,
        setActiveChatBuddy,
        isRegisterModalOpen,
        setIsRegisterModalOpen,
        pendingMembershipPlan,
        setPendingMembershipPlan,
        registerStep,
        setRegisterStep,
        isPaymentModalOpen,
        setIsPaymentModalOpen,
        pendingPaymentDetails,
        setPendingPaymentDetails,
        isReviewModalOpen,
        setIsReviewModalOpen,
        activeBookingForReview,
        setActiveBookingForReview,
        isConfirmationModalOpen,
        setIsConfirmationModalOpen,
        latestConfirmedBooking,
        setLatestConfirmedBooking,
        isSafetyReportModalOpen,
        setIsSafetyReportModalOpen,
        verificationStatus,
        setVerificationStatus,
        kycRecords,
        setKycRecords,
        fetchVerificationStatus,
        toggleFavorite,
        markNotificationRead,
        markAllNotificationsRead,
        submitBooking,
        cancelBooking,
        sendMessage,
        submitReview,
        activateMembership,
        submitReport,
        adminApproveKyc,
        adminRejectKyc,
        adminToggleUserStatus,
        adminProcessRefund,
        buddyAcceptBooking,
        buddyRejectBooking,
        buddyToggleOnline,
        buddyUpdateRate,
        triggerConfetti,
        apiMembership,
        fetchApiMembership,
        isProcessingPayment,
        isPaymentComplete,
        membershipErrorText: errorText,
        paymentErrorId: payErrorId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
