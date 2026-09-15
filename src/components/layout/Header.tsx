import React, { useState } from 'react';
import {
  Users,
  Menu,
  X,
  Bell,
  ShieldCheck,
  CheckCircle,
  Sparkles,
  ChevronDown,
  UserCheck,
  Briefcase,
  SlidersHorizontal,
  LogOut,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    activeRole,
    setActiveRole,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setIsRegisterModalOpen,
    setRegisterStep,
    setIsChatOpen,
    setActiveChatBooking,
    bookings,
    buddies,
    setActiveChatBuddy,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead && !n.is_read).length;

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'find-buddy', label: 'Find a Buddy' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'become-buddy', label: 'Become a Buddy' },
    { id: 'safety', label: 'Safety' },
    { id: 'pricing', label: 'Pricing' },
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openFirstChat = () => {
    if (bookings.length > 0) {
      const b = bookings[0];
      const buddy = buddies.find((x) => x.user.id === b.buddy_id) || buddies[0];
      setActiveChatBooking(b);
      setActiveChatBuddy(buddy);
    }
    setIsChatOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
      {/* Top micro bar with brand pledge & role switcher */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-pink-600 text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/20 font-semibold tracking-wide text-[10px]">
              100% PLATONIC
            </span>
            <span className="hidden sm:inline text-blue-50">
              Verified friendship & companionship in India. Strictly no dating or escort services.
            </span>
          </div>

          {/* Quick Persona Switcher for Evaluation */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="hidden md:inline text-blue-100 text-[11px]">Preview Role:</span>
            <div className="inline-flex bg-black/20 rounded-lg p-0.5 backdrop-blur-xs">
              <button
                id="role-btn-user"
                onClick={() => {
                  setActiveRole('user');
                  setActiveTab('home');
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  activeRole === 'user' ? 'bg-white text-blue-700 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                User View
              </button>
              <button
                id="role-btn-buddy"
                onClick={() => {
                  setActiveRole('buddy');
                  setActiveTab('buddy-dashboard');
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  activeRole === 'buddy' ? 'bg-white text-pink-600 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                Buddy Mode
              </button>
              <button
                id="role-btn-admin"
                onClick={() => {
                  setActiveRole('admin');
                  setActiveTab('admin-dashboard');
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  activeRole === 'admin' ? 'bg-white text-slate-900 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                Admin Panel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <div
            id="brand-logo"
            onClick={() => handleNavClick('home')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  Yor<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-pink-500">Buddy</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide -mt-1 hidden sm:block">
                Verified Platonic Connections
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  id={`nav-link-${link.id}`}
                  onClick={() => handleNavClick(link.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'text-blue-600 bg-blue-50/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & Auth Profile */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* Messages Drawer Trigger */}
            <button
              id="header-chat-btn"
              onClick={openFirstChat}
              title="In-App Messages"
              className="relative p-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/70 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full animate-ping"></span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full"></span>
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                id="notif-dropdown-btn"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/70 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-pink-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500 text-center">No notifications</p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            if (notif.type.includes('booking')) {
                              setActiveTab('user-dashboard');
                            }
                            setIsNotifOpen(false);
                          }}
                          className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                            !notif.is_read ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-2.5">
                            <span className="mt-0.5 w-2 h-2 rounded-full bg-pink-500 flex-shrink-0"></span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900">{notif.title}</p>
                              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notif.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown / Logged in state */}
            <div className="relative">
              <button
                id="user-profile-menu-btn"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all bg-white"
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                  alt="Profile"
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-blue-500/30"
                />
                <span className="text-xs font-bold text-slate-800 max-w-[90px] truncate">
                  {currentUser.full_name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900">{currentUser.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                    <div className="mt-2 inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>Lifetime Member Active</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setActiveTab('user-dashboard');
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                    >
                      <UserCheck className="w-4 h-4 text-slate-400" />
                      <span>My Dashboard</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('user-dashboard');
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                    >
                      <Heart className="w-4 h-4 text-slate-400" />
                      <span>Saved Favorites</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveRole('buddy');
                        setActiveTab('buddy-dashboard');
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-pink-600 hover:bg-pink-50 flex items-center space-x-2"
                    >
                      <Briefcase className="w-4 h-4 text-pink-500" />
                      <span>Switch to Buddy Mode</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveRole('admin');
                        setActiveTab('admin-dashboard');
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                      <span>Admin Console</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Login / Sign Up buttons if clicked */}
            <button
              id="header-login-btn"
              onClick={() => {
                setRegisterStep(1);
                setIsRegisterModalOpen(true);
              }}
              className="text-xs font-bold text-slate-700 hover:text-blue-600 px-3 py-2"
            >
              Login
            </button>
            <button
              id="header-signup-btn"
              onClick={() => {
                setRegisterStep(1);
                setIsRegisterModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 hover:opacity-95 transition-opacity"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Join YorBuddy</span>
            </button>
          </div>

          {/* Mobile menu hamburger button */}
          <div className="flex items-center space-x-2 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-2 gap-2 pt-2 pb-3 border-b border-slate-100">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === link.id ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col space-y-2 pt-1">
            <button
              onClick={() => {
                setActiveTab('user-dashboard');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 bg-slate-50 flex items-center justify-between"
            >
              <span>My Dashboard</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                ✓ Member
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('become-buddy');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-pink-600 bg-pink-50"
            >
              Become a Buddy & Earn
            </button>

            <button
              onClick={() => {
                setActiveRole('admin');
                setActiveTab('admin-dashboard');
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50"
            >
              Admin Dashboard
            </button>

            <div className="pt-2 flex items-center space-x-2">
              <button
                onClick={() => {
                  setRegisterStep(1);
                  setIsRegisterModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold text-center"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setRegisterStep(1);
                  setIsRegisterModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white text-xs font-bold text-center shadow-md shadow-blue-500/20"
              >
                Join (₹499 Lifetime)
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
