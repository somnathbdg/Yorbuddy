import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/home/Hero';
import { ActivitiesGrid } from './components/home/ActivitiesGrid';
import { FeaturedBuddies } from './components/home/FeaturedBuddies';
import { HowItWorks } from './components/home/HowItWorks';
import { BuddySearch } from './components/buddies/BuddySearch';
import { BuddyProfileModal } from './components/buddies/BuddyProfileModal';
import { BookingModal } from './components/booking/BookingModal';
import { BookingConfirmationModal } from './components/booking/BookingConfirmationModal';
import { ChatDrawer } from './components/chat/ChatDrawer';
import { AuthModal } from './components/auth/AuthModal';
import { BecomeABuddyView } from './components/buddy/BecomeABuddyView';
import { SafetyView } from './components/safety/SafetyView';
import { PricingView } from './components/pricing/PricingView';
import { UserDashboard } from './components/dashboard/UserDashboard';
import { BuddyDashboard } from './components/dashboard/BuddyDashboard';
import { AdminPanel } from './components/dashboard/AdminPanel';
import { LegalModal } from './components/legal/LegalModal';

const AppContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-pink-100 selection:text-pink-900">
      {/* Universal Header with Navigation, Role Switcher, and Mobile Drawer */}
      <Header />

      {/* Main View Router */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <>
            <Hero />
            <ActivitiesGrid />
            <FeaturedBuddies />
            <HowItWorks />
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

        {activeTab === 'user-dashboard' && <UserDashboard />}

        {activeTab === 'buddy-dashboard' && <BuddyDashboard />}

        {activeTab === 'admin-panel' && <AdminPanel />}
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
