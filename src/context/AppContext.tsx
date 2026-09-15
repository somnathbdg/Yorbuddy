import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
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
  Notification,
  UserRole,
} from '../types/database';
import {
  ACTIVITIES,
  INITIAL_USERS,
  INITIAL_PROFILES,
  INITIAL_BUDDY_PROFILES,
  INITIAL_BOOKINGS,
  INITIAL_REVIEWS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_PAYMENTS,
  INITIAL_MEMBERSHIP,
  INITIAL_VERIFICATIONS,
  INITIAL_REPORTS,
} from '../data/initialData';

export interface FullBuddyData {
  user: User;
  profile: Profile;
  buddyProfile: BuddyProfile;
}

interface AppContextType {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  userProfile: Profile;
  setUserProfile: React.Dispatch<React.SetStateAction<Profile>>;
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
  isRegisterModalOpen: boolean;
  setIsRegisterModalOpen: (open: boolean) => void;
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
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [userProfile, setUserProfile] = useState<Profile>(INITIAL_PROFILES['usr-current']);
  const [activeRole, setActiveRole] = useState<UserRole>('user');
  
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

  // Data Collections
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [messages, setMessages] = useState<BookingMessage[]>(INITIAL_MESSAGES);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [membership, setMembership] = useState<Membership>(INITIAL_MEMBERSHIP);
  const [verifications, setVerifications] = useState<Verification[]>(INITIAL_VERIFICATIONS);
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
  const [favorites, setFavorites] = useState<string[]>(['usr-b1', 'usr-b6']);

  // Assembled Buddy Data
  const [buddies, setBuddies] = useState<FullBuddyData[]>(() => {
    return Object.keys(INITIAL_BUDDY_PROFILES).map((userId) => {
      const user = INITIAL_USERS.find((u) => u.id === userId) || INITIAL_USERS[1];
      const profile = INITIAL_PROFILES[userId] || INITIAL_PROFILES['usr-b1'];
      const buddyProfile = INITIAL_BUDDY_PROFILES[userId];
      return { user, profile, buddyProfile };
    });
  });

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

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const submitBooking = (bookingData: Omit<Booking, 'id' | 'booking_code' | 'created_at'>): Booking => {
    const randomCode = `YB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: Booking = {
      ...bookingData,
      id: `bk-${Date.now()}`,
      booking_code: randomCode,
      created_at: new Date().toISOString(),
    };

    setBookings((prev) => [newBooking, ...prev]);

    // Record payment
    const newPayment: Payment = {
      id: `pay-b-${Date.now()}`,
      user_id: currentUser.id,
      booking_id: newBooking.id,
      payment_type: 'booking',
      amount: newBooking.total_amount,
      currency: 'INR',
      payment_method: 'upi',
      transaction_id: `UPI-TXN-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'success',
      payment_gateway: 'Razorpay Sandbox',
      created_at: new Date().toISOString(),
    };
    setPayments((prev) => [newPayment, ...prev]);

    // Notification
    const buddyObj = buddies.find((b) => b.user.id === newBooking.buddy_id);
    const buddyName = buddyObj ? buddyObj.user.full_name : 'your buddy';
    const notif: Notification = {
      id: `notif-${Date.now()}`,
      user_id: currentUser.id,
      title: 'Booking Confirmed ✓',
      message: `You're all set to meet ${buddyName} on ${newBooking.date} at ${newBooking.time}.`,
      type: 'booking_accepted',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);

    // Auto-seed initial message in chat context
    const welcomeMsg: BookingMessage = {
      id: `msg-${Date.now()}`,
      booking_id: newBooking.id,
      sender_id: newBooking.buddy_id,
      recipient_id: currentUser.id,
      message: `Hi ${currentUser.full_name}! Thanks for booking. Looking forward to our meetup at ${newBooking.location_name}. Feel free to message here before we meet!`,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, welcomeMsg]);

    setLatestConfirmedBooking(newBooking);
    setIsConfirmationModalOpen(true);
    triggerConfetti();

    return newBooking;
  };

  const cancelBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    );
    const notif: Notification = {
      id: `notif-${Date.now()}`,
      user_id: currentUser.id,
      title: 'Booking Cancelled',
      message: `Booking #${bookingId} has been cancelled. Full refund will be credited in 2-4 business hours as per policy.`,
      type: 'account_warning',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const sendMessage = (bookingId: string, text: string) => {
    if (!text.trim()) return;
    const userMsg: BookingMessage = {
      id: `msg-${Date.now()}`,
      booking_id: bookingId,
      sender_id: currentUser.id,
      recipient_id: activeChatBuddy ? activeChatBuddy.user.id : 'usr-b1',
      message: text.trim(),
      is_read: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Simulated buddy friendly response after 1.2 seconds!
    setTimeout(() => {
      const responses = [
        "Sounds wonderful! See you at the entrance of the venue.",
        "Got it! Looking forward to it. I'll be in public seating area.",
        "Awesome! Let me know if you need directions to the cafe.",
        "Understood! Have a great day ahead and see you soon!",
      ];
      const randomReply = responses[Math.floor(Math.random() * responses.length)];
      const replyMsg: BookingMessage = {
        id: `msg-${Date.now() + 1}`,
        booking_id: bookingId,
        sender_id: activeChatBuddy ? activeChatBuddy.user.id : 'usr-b1',
        recipient_id: currentUser.id,
        message: randomReply,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, replyMsg]);
    }, 1200);
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
    const now = new Date().toISOString();
    const newPayment: Payment = {
      id: `pay-m-${Date.now()}`,
      user_id: currentUser.id,
      payment_type: 'membership',
      amount: 499,
      currency: 'INR',
      payment_method: method,
      transaction_id: `UPI-TXN-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'success',
      payment_gateway: 'Razorpay Sandbox',
      created_at: now,
    };
    setPayments((prev) => [newPayment, ...prev]);

    setMembership({
      id: `mem-${Date.now()}`,
      user_id: currentUser.id,
      amount: 499,
      status: 'active',
      activated_at: now,
      membership_type: 'one_time_lifetime',
      payment_id: newPayment.id,
    });

    setCurrentUser((prev) => ({
      ...prev,
      is_membership_paid: true,
      membership_paid_at: now,
    }));

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        user_id: currentUser.id,
        title: '🎉 Welcome to YorBuddy!',
        message: 'Your ₹499 one-time membership is activated! You now have lifetime access to browse verified buddies and book companionship.',
        type: 'payment_success',
        is_read: false,
        created_at: now,
      },
      ...prev,
    ]);

    triggerConfetti();
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

  // Admin Actions
  const adminApproveKyc = (userId: string) => {
    setVerifications((prev) =>
      prev.map((v) =>
        v.user_id === userId
          ? {
              ...v,
              status: 'verified',
              reviewed_at: new Date().toISOString(),
              reviewed_by: 'Super Admin',
            }
          : v
      )
    );
    setBuddies((prev) =>
      prev.map((b) =>
        b.user.id === userId
          ? {
              ...b,
              buddyProfile: {
                ...b.buddyProfile,
                is_verified: true,
                verification_status: 'approved',
              },
            }
          : b
      )
    );
  };

  const adminRejectKyc = (userId: string, reason: string) => {
    setVerifications((prev) =>
      prev.map((v) =>
        v.user_id === userId
          ? {
              ...v,
              status: 'rejected',
              rejection_reason: reason,
              reviewed_at: new Date().toISOString(),
              reviewed_by: 'Super Admin',
            }
          : v
      )
    );
  };

  const adminToggleUserStatus = (userId: string) => {
    setBuddies((prev) =>
      prev.map((b) =>
        b.user.id === userId
          ? { ...b, user: { ...b.user, is_active: !b.user.is_active } }
          : b
      )
    );
  };

  const adminProcessRefund = (paymentId: string) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: 'refunded' } : p))
    );
  };

  // Buddy Actions
  const buddyAcceptBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'confirmed' } : b))
    );
  };

  const buddyRejectBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'rejected' } : b))
    );
  };

  const buddyToggleOnline = () => {
    setBuddies((prev) =>
      prev.map((b) =>
        b.user.id === 'usr-b1'
          ? {
              ...b,
              buddyProfile: {
                ...b.buddyProfile,
                is_online: !b.buddyProfile.is_online,
              },
            }
          : b
      )
    );
  };

  const buddyUpdateRate = (newRate: number) => {
    setBuddies((prev) =>
      prev.map((b) =>
        b.user.id === 'usr-b1'
          ? {
              ...b,
              buddyProfile: {
                ...b.buddyProfile,
                hourly_rate: newRate,
              },
            }
          : b
      )
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        userProfile,
        setUserProfile,
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
