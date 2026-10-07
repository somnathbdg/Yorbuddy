import React, { useState, useEffect, useRef } from 'react';
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
import { authService } from '../../services/auth';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    setCurrentUser,
    isAuthenticated,
    setIsAuthenticated,
    buddies,
    bookings,
    setActiveChatBuddy,
    setActiveChatBooking,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setIsRegisterModalOpen,
    setRegisterStep,
    setIsChatOpen,
    activeRole,
    setActiveRole,
    setUserProfile,
    setAuthMode,
    apiMembership,
    fetchApiMembership,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const headerRef = useRef<HTMLElement>(null);

  // Scroll-based shadow intensification
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const getPlanDisplayName = (planId: string): string => {
    const planMap: Record<string, string> = {
      TRIAL_1D: '1 Day Access',
      WEEK_1: '1 Week',
      MONTH_1: '1 Month',
      FREE_TRIAL: 'Free Trial',
      MONTH_6: '6 Months',
      YEAR_1: '1 Year',
      LIFETIME: 'Lifetime',
    };
    return planMap[planId] || planId;
  };

  const formatExpiry = (dateStr: string | null): string => {
    if (!dateStr) return 'No expiry';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'No expiry';
    }
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

  const isLoggedIn = isAuthenticated && !!currentUser;

  // Admin UI: show Admin badge + hide membership/user-specific options
  const isAdmin = isAuthenticated && currentUser?.role === 'admin';

  return (
    /*
     * Floating glass navbar.
     *
     * Layout note (overlap safety): this element is `sticky`, so it occupies
     * real flow height and can never sit on top of the page content that
     * follows it. The shell inside is the only floating part, and the global
     * `--nav-offset` token (index.css) reserves matching clearance for every
     * scroll target, so section headings always come to rest below it.
     *
     * `transform` is deliberately never applied here: the fixed mobile drawer
     * below is a child, and a transformed ancestor would become its containing
     * block and break the full-height overlay.
     */
    <header
      ref={headerRef}
      className="sticky top-0 z-40 px-2 sm:px-4 pt-0 transition-all duration-500"
    >
      <div
        className={`navbar-shell mx-auto max-w-[88rem] navbar-gradient-border ${
          isScrolled ? 'navbar-shell-scrolled' : 'glass-premium'
        }`}
      >
      {/* Animated gradient line at bottom */}
      <div className="gradient-line" />

      {/* Top micro bar with brand pledge & role switcher */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-pink-600 text-white text-xs py-1.5 px-4 rounded-t-[1.25rem]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/20 font-semibold tracking-wide text-[10px]">
              100% PLATONIC
            </span>
            <span className="hidden sm:inline text-blue-50">
              Verified friendship & companionship in India. Strictly no dating or escort services.
            </span>
          </div>

          {/* Admin indicator + Panel link */}
          {isAdmin && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-amber-400/90 text-amber-900 text-[11px] font-bold uppercase tracking-wide">
                Admin
              </span>
              <button
                id="role-btn-admin"
                onClick={() => {
                  setActiveRole('admin');
                  setActiveTab('admin-panel');
                }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  activeRole === 'admin' && activeTab === 'admin-panel' ? 'bg-white text-slate-900 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                Admin Panel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo — premium gradient text + glow */}
          <div
            id="brand-logo"
            onClick={() => handleNavClick('home')}
            className="flex items-center space-x-2.5 cursor-pointer group"
          >
            <div className="logo-glow w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:shadow-blue-500/40 transition-all duration-300">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  Yor<span className="text-gradient">Buddy</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse-soft"></span>
              </div>
              <p className="text-xs text-slate-500 font-medium tracking-wide -mt-1 hidden sm:block">
                Verified Platonic Connections
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links — hidden for admin */}
          {!isAdmin && (
            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {navLinks.map((link) => {
                const isActive = activeTab === link.id;
                return (
                  <button
                    key={link.id}
                    id={`nav-link-${link.id}`}
                    onClick={() => handleNavClick(link.id)}
                    className={`nav-pill px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      isActive
                        ? 'text-blue-600 bg-blue-50/80 font-bold shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {link.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Admin navigation — only "Admin Panel" link */}
          {isAdmin && (
            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              <button
                id="nav-link-admin-panel"
                onClick={() => handleNavClick('admin-panel')}
                className="nav-pill px-4 py-2 rounded-xl text-sm font-bold text-amber-700 bg-amber-50/80 shadow-sm"
              >
                Admin Panel
              </button>
            </nav>
          )}

          {/* Right Action Icons & Auth Profile */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* Messages Drawer Trigger — hidden for admin */}
            {isLoggedIn && !isAdmin && (
              <button
                id="header-chat-btn"
                onClick={openFirstChat}
                title="In-App Messages"
                className="relative p-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-white/60 hover:shadow-sm transition-all duration-200"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full animate-ping"></span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full"></span>
              </button>
            )}

            {/* Notifications Dropdown — hidden for admin */}
            {isLoggedIn && !isAdmin && (
              <div className="relative">
                <button
                  id="notif-dropdown-btn"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="relative p-2.5 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-white/60 hover:shadow-sm transition-all duration-200"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="notif-badge-glow absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-pink-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Popover — premium glass */}
                {isNotifOpen && (
                  <div className="dropdown-premium absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl py-3 z-50 animate-scale-in">
                    <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100/50">
                      <span className="font-bold text-slate-800 text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50/50">
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
                            className={`p-3.5 hover:bg-white/50 cursor-pointer transition-colors ${
                              !notif.is_read ? 'bg-blue-50/20' : ''
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
            )}

            {/* Profile Dropdown / Logged in state */}
            {isLoggedIn && currentUser.full_name && (
              <div className="relative">
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className={`flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-full border transition-all duration-200 bg-white/80 hover:bg-white hover:shadow-float ${
                    isAdmin
                      ? 'border-amber-300 hover:border-amber-400 ring-1 ring-amber-200'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                    alt="Profile"
                    className={`w-7 h-7 rounded-full object-cover ${isAdmin ? 'ring-2 ring-amber-400' : 'ring-2 ring-blue-500/30'}`}
                  />
                  <span className="text-xs font-bold text-slate-800 max-w-[90px] truncate">
                    {currentUser.full_name.split(' ')[0]}
                  </span>
                  {isAdmin && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider">
                      Admin
                    </span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isProfileDropdownOpen && (
                  <div className="dropdown-premium absolute right-0 mt-2 w-64 rounded-2xl py-2 z-50 animate-scale-in">
                    <div className="px-4 py-3 border-b border-slate-100/50">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-bold text-slate-900">{currentUser.full_name}</p>
                        {isAdmin && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                      {/* Admin: no membership badge. User: show membership. */}
                      {!isAdmin && (
                        <div className="mt-2 space-y-1.5">
                          {apiMembership ? (
                            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-emerald-50/80 text-emerald-700 text-[11px] font-semibold">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>{apiMembership.is_active ? 'Active' : 'Inactive'}</span>
                              <span>•</span>
                              <span>{getPlanDisplayName(apiMembership.plan_id)}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-slate-50/80 text-slate-500 text-[11px] font-semibold">
                              <span>Loading...</span>
                            </div>
                          )}
                          {apiMembership && (
                            <p className="text-[11px] text-slate-500">
                              {apiMembership.is_active
                                ? apiMembership.expiry_date
                                  ? `Expires: ${formatExpiry(apiMembership.expiry_date)}`
                                  : 'No expiry'
                                : 'Membership expired'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="py-1">
                      {/* Admin: only Admin Panel link */}
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => {
                              setActiveRole('admin');
                              setActiveTab('admin-panel');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50/50 flex items-center space-x-2 transition-colors"
                          >
                            <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                            <span>Admin Panel</span>
                          </button>
                          <div className="mx-3 my-1 border-t border-slate-100/50"></div>
                          <p className="px-4 py-1.5 text-[11px] text-slate-400 font-medium">
                            Administrator Access
                          </p>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setActiveTab('user-dashboard');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50/50 flex items-center space-x-2 transition-colors"
                          >
                            <UserCheck className="w-4 h-4 text-slate-400" />
                            <span>My Dashboard</span>
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('user-dashboard');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50/50 flex items-center space-x-2 transition-colors"
                          >
                            <Heart className="w-4 h-4 text-slate-400" />
                            <span>Saved Favorites</span>
                          </button>
                          <button
                            onClick={() => {
                              setAuthMode('login');
                              setActiveRole('buddy');
                              setActiveTab('buddy-dashboard');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm font-medium text-pink-600 hover:bg-pink-50/50 flex items-center space-x-2 transition-colors"
                          >
                            <Briefcase className="w-4 h-4 text-pink-500" />
                            <span>Switch to Buddy Mode</span>
                          </button>
                          {currentUser.role === 'admin' && (
                            <button
                              onClick={() => {
                                setActiveRole('admin');
                                setActiveTab('admin-panel');
                                setIsProfileDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50/50 flex items-center space-x-2 transition-colors"
                            >
                              <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                              <span>Admin Console</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <div className="border-t border-slate-100/50 pt-1">
                      <button
                        onClick={async () => {
                          await authService.logout();
                          setCurrentUser(null);
                          setIsAuthenticated(false);
                          setActiveRole('user');
                          setActiveTab('home');
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50/50 flex items-center space-x-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Login / Sign Up buttons if not logged in — premium 3D CTA */}
            {!isLoggedIn && (
              <>
                <button
                  id="header-login-btn"
                  onClick={() => {
                    setRegisterStep(1);
                    setAuthMode('login');
                    setIsRegisterModalOpen(true);
                  }}
                  className="text-sm font-bold text-slate-700 hover:text-blue-600 px-4 py-2 rounded-xl hover:bg-white/60 transition-all duration-200"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setRegisterStep(1);
                    setAuthMode('register');
                    setIsRegisterModalOpen(true);
                  }}
                  className="cta-3d inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white text-sm font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Join YorBuddy</span>
                </button>
              </>
            )}
          </div>

          {/* Mobile menu hamburger button */}
          <div className="flex items-center space-x-2 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all duration-200"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-drawer"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Mobile Drawer Menu — dramatic slide-in with backdrop blur */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="lg:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Slide-in panel */}
          <div className="mobile-slide-in absolute right-0 top-0 h-full w-80 max-w-[85vw] glass-premium shadow-float-lg overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <div className="p-4 pt-6">
              {/* Close button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-white/60 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Desktop nav links — hidden for admin in mobile drawer */}
              {!isAdmin && (
                <div className="grid grid-cols-2 gap-2 pb-4 border-b border-slate-100/50">
                  {navLinks.map((link) => (
                    <button
                      key={link.id}
                      onClick={() => handleNavClick(link.id)}
                      className={`text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        activeTab === link.id ? 'bg-blue-50/80 text-blue-600 shadow-sm' : 'text-slate-700 hover:bg-white/50'
                      }`}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col space-y-2 pt-3">
                {isAdmin ? (
                  <>
                    <button
                      onClick={() => {
                        setActiveRole('admin');
                        setActiveTab('admin-panel');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold text-amber-700 bg-amber-50/80 flex items-center justify-between shadow-sm"
                    >
                      <span>Admin Panel</span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase">Admin</span>
                    </button>
                    <button
                      onClick={async () => {
                        await authService.logout();
                        setCurrentUser(null);
                        setIsAuthenticated(false);
                        setActiveRole('user');
                        setActiveTab('home');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50/80"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setActiveTab('user-dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 bg-slate-50/80 flex items-center justify-between"
                    >
                      <span>My Dashboard</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        {apiMembership
                          ? apiMembership.is_active
                            ? `Active • ${getPlanDisplayName(apiMembership.plan_id)}`
                            : 'Inactive'
                          : 'Loading...'}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setActiveTab('become-buddy');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-pink-600 bg-pink-50/80"
                    >
                      Become a Buddy & Earn
                    </button>

                    {isLoggedIn && currentUser.role === 'admin' && (
                      <button
                        onClick={() => {
                          setActiveRole('admin');
                          setActiveTab('admin-panel');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50/80"
                      >
                        Admin Dashboard
                      </button>
                    )}
                  </>
                )}

                <div className="pt-3 flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setRegisterStep(1);
                      setAuthMode('login');
                      setIsRegisterModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300/80 text-slate-700 text-xs font-bold text-center hover:bg-white/50 transition-all"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setRegisterStep(1);
                      setAuthMode('register');
                      setIsRegisterModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="cta-3d flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white text-xs font-bold text-center"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
