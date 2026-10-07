import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/home/Hero';
import { ActivityCategoryStrip } from './components/home/ActivityCategoryStrip';
import { FindABuddySection } from './components/home/FindABuddySection';
import { HowItWorks } from './components/home/HowItWorks';
import { TrustSafety } from './components/home/TrustSafety';
import { WhyYorBuddy } from './components/home/WhyYorBuddy';
import { FaqSection } from './components/home/FaqSection';
import { FinalCTA } from './components/home/FinalCTA';
import { BuddySearch } from './components/buddies/BuddySearch';
import { BuddyProfileModal } from './components/buddies/BuddyProfileModal';
import { BookingModal } from './components/booking/BookingModal';
import { BookingConfirmationModal } from './components/booking/BookingConfirmationModal';
import { ChatDrawer } from './components/chat/ChatDrawer';
import { AuthModal } from './components/auth/AuthModal';
import { AuthGuard } from './components/auth/AuthGuard';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { GoogleCallback } from './components/auth/GoogleCallback';
import { BecomeABuddyView } from './components/buddy/BecomeABuddyView';
import { SafetyView } from './components/safety/SafetyView';
import { PricingView } from './components/pricing/PricingView';
import { VerificationCenterView } from './components/verification/VerificationCenter';
import { UserDashboard } from './components/dashboard/UserDashboard';
import { BuddyDashboard } from './components/dashboard/BuddyDashboard';
import { AdminPanel } from './components/dashboard/AdminPanel';
import { LegalModal } from './components/legal/LegalModal';

const AppContent: React.FC = () => {
  const { activeTab, isAuthenticated, currentUser, isInitializing, setIsRegisterModalOpen, setRegisterStep, setAuthMode } = useApp();

  // Admin users always see the Admin Panel — role from backend JWT/user object
  const isAdmin = isAuthenticated && currentUser?.role === 'admin';

  const handleLoginClick = () => {
    setRegisterStep(1);
    setAuthMode('login');
    setIsRegisterModalOpen(true);
  };

  // Check if this is a password reset link
  const [isResetPasswordPage, setIsResetPasswordPage] = useState(false);
  useEffect(() => {
    const hasToken = window.location.search.includes('token=');
    setIsResetPasswordPage(hasToken);
  }, []);

  // Check if this is a Google OAuth callback
  const isGoogleCallback = window.location.pathname === '/auth/callback';

  // Show loading screen while initializing authentication
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-slate-600">Loading YorBuddy...</p>
        </div>
      </div>
    );
  }

  // Password reset page
  if (isResetPasswordPage) {
    return <ResetPasswordPage />;
  }

  // Google OAuth callback
  if (isGoogleCallback) {
    return <GoogleCallback />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-pink-100 selection:text-pink-900">
      {/* Universal Header with Navigation, Role Switcher, and Mobile Drawer */}
      <Header />

      {/* Main View Router */}
      <main className="flex-1">
        {isAdmin ? (
          /* Admin users always see Admin Panel — user tabs are never rendered */
          <AuthGuard
            isAuthenticated={isAuthenticated}
            currentUser={currentUser}
            requiredRole="admin"
            onLoginClick={handleLoginClick}
          >
            <AdminPanel />
          </AuthGuard>
        ) : (
          <>
            {activeTab === 'home' && (
              <>
                <Hero />
                <ActivityCategoryStrip />
                <FindABuddySection />
                <HowItWorks />
                <TrustSafety />
                <WhyYorBuddy />
                <FaqSection />
                <FinalCTA />
              </>
            )}

            {activeTab === 'find-buddy' && <BuddySearch />}

            {activeTab === 'how-it-works' && (
              <div className="py-10 bg-slate-50 min-h-screen">
                <HowItWorks />
              </div>
            )}

            {activeTab === 'become-buddy' && <BecomeABuddyView />}

            {activeTab === 'safety' && <SafetyView />}

            {activeTab === 'pricing' && <PricingView />}
            {activeTab === 'verification' && (
              <AuthGuard
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                onLoginClick={handleLoginClick}
              >
                <VerificationCenterView />
              </AuthGuard>
            )}

            {activeTab === 'user-dashboard' && (
              <AuthGuard
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                onLoginClick={handleLoginClick}
              >
                <UserDashboard />
              </AuthGuard>
            )}

            {activeTab === 'buddy-dashboard' && (
              <AuthGuard
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                requiredRole="buddy"
                onLoginClick={handleLoginClick}
              >
                <BuddyDashboard />
              </AuthGuard>
            )}

            {activeTab === 'admin-panel' && (
              <AuthGuard
                isAuthenticated={isAuthenticated}
                currentUser={currentUser}
                requiredRole="admin"
                onLoginClick={handleLoginClick}
              >
                <AdminPanel />
              </AuthGuard>
            )}
          </>
        )}
      </main>

      {/* Modals & Overlays */}
      <BuddyProfileModal />
      <BookingModal />
      <BookingConfirmationModal />
      <ChatDrawer />
      <AuthModal />
      <LegalModal />

      {/* Universal Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
