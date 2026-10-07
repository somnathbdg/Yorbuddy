import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  MapPin,
  RotateCcw,
  Loader2,
  AlertCircle,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BuddyCard } from './BuddyCard';
import { SearchFilterBar } from './SearchFilterBar';
import { buddyService, BuddySearchResult } from '../../services/buddy';

export const BuddySearch: React.FC = () => {
  const {
    activities,
    selectedCity,
    setSelectedCity,
    selectedActivitySlug,
    setSelectedActivitySlug,
    isAuthenticated,
    setAuthMode,
    setIsRegisterModalOpen,
    apiMembership,
    setActiveTab,
    verificationStatus,
    fetchVerificationStatus,
  } = useApp();

  const hasMembership = isAuthenticated && apiMembership && apiMembership.is_active;
  const isVerified = verificationStatus?.is_fully_verified === true;

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<string>('any');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('any');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('any');
  const [maxRate, setMaxRate] = useState<number>(1000);
  const [minRating, setMinRating] = useState<number>(0);
  const [onlyOnline, setOnlyOnline] = useState<boolean>(false);
  const [selectedAvailability, setSelectedAvailability] = useState<string>('any');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // API state
  const [apiBuddies, setApiBuddies] = useState<BuddySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const perPage = 12;

  // Fetch buddies from API
  const fetchBuddies = useCallback(async () => {
    // Check authentication before making API call
    const token = localStorage.getItem('yorbuddy_access_token');
    if (!token) {
      setIsLoading(false);
      setError(null);
      setApiBuddies([]);
      setTotalCount(0);
      setTotalPages(0);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        per_page: perPage,
        sort: 'rating_desc',
      };
      if (selectedCity !== 'All') params.city = selectedCity;
      if (selectedActivitySlug) params.activity = selectedActivitySlug;
      if (selectedLanguage !== 'any') params.language = selectedLanguage;
      if (minRating > 0) params.min_rating = minRating;
      if (maxRate < 1000) params.max_rate = maxRate;
      if (onlyOnline) params.online = true;
      if (searchQuery.trim()) params.query = searchQuery.trim();

      const response = await buddyService.searchBuddies(params);
      setApiBuddies(response.data);
      setTotalCount(response.meta.total);
      setTotalPages(response.meta.total_pages);
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setError(apiError?.message || 'Failed to load buddies. Please try again.');
      setApiBuddies([]);
      setTotalCount(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCity, selectedActivitySlug, selectedLanguage, minRating, maxRate, onlyOnline, searchQuery, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, selectedActivitySlug, selectedLanguage, minRating, maxRate, onlyOnline, searchQuery]);

  // Fetch on filter change
  useEffect(() => {
    fetchBuddies();
  }, [fetchBuddies]);

  // Fetch verification status when component mounts
  useEffect(() => {
    fetchVerificationStatus();
  }, [fetchVerificationStatus]);

  // Transform API results to FullBuddyData format for BuddyCard compatibility
  const buddies = useMemo(() => {
    return apiBuddies.map((b) => ({
      user: {
        id: b.user.id,
        email: '',
        password_hash: '',
        mobile: '',
        full_name: b.user.full_name,
        dob: '',
        gender: b.user.gender,
        role: 'user' as const,
        is_active: true,
        is_membership_paid: false,
        created_at: '',
        updated_at: '',
      },
      profile: {
        id: '',
        user_id: b.user.id,
        bio: '',
        photo_url: b.profile.photo_url,
        city: b.profile.city,
        area: b.profile.area,
        languages: b.profile.languages,
        interests: b.profile.interests,
        is_phone_verified: true,
        is_email_verified: true,
        is_id_verified: true,
        created_at: '',
      },
      buddyProfile: {
        id: b.buddy_profile.id,
        user_id: b.user.id,
        hourly_rate: b.buddy_profile.hourly_rate,
        headline: b.buddy_profile.headline,
        bio: b.buddy_profile.bio,
        rating: b.buddy_profile.rating,
        review_count: b.buddy_profile.review_count,
        is_verified: b.buddy_profile.is_verified,
        verification_status: 'approved' as const,
        total_earnings: 0,
        profile_views: 0,
        is_online: b.buddy_profile.is_online,
        response_time: b.buddy_profile.response_time,
        badge_text: b.buddy_profile.badge_text,
        supported_activity_ids: b.buddy_profile.supported_activity_ids,
        safety_pledge_signed: b.buddy_profile.safety_pledge_signed,
        created_at: '',
      },
    }));
  }, [apiBuddies]);

  // Client-side gender filter (API doesn't support it)
  const filteredBuddies = useMemo(() => {
    if (selectedGender === 'any') return buddies;
    return buddies.filter((b) => b.user.gender === selectedGender);
  }, [buddies, selectedGender]);

  // Extract unique cities from current results for city pills
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    apiBuddies.forEach((b) => {
      if (b.profile.city) citySet.add(b.profile.city);
    });
    return ['All', ...Array.from(citySet).sort()];
  }, [apiBuddies]);

  // Extract unique languages from current results
  const languages = useMemo(() => {
    const langSet = new Set<string>();
    apiBuddies.forEach((b) => {
      b.profile.languages?.forEach((l) => langSet.add(l));
    });
    return ['any', ...Array.from(langSet).sort()];
  }, [apiBuddies]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedCity('All');
    setSelectedActivitySlug(null);
    setSearchQuery('');
    setSelectedGender('any');
    setSelectedLanguage('any');
    setSelectedArea('all');
    setSelectedAgeGroup('any');
    setMaxRate(1000);
    setMinRating(0);
    setOnlyOnline(false);
    setSelectedAvailability('any');
  };

  return (
    <div className="section-shell mesh-section-c min-h-screen py-10">
      <div className="orb orb-blue top-[-6%] right-[4%] w-[460px] h-[460px] opacity-30 orb-drift-a" />
      <div className="orb orb-pink bottom-[-8%] left-[4%] w-[420px] h-[420px] opacity-25 orb-drift-c" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full glass text-blue-600 font-bold text-xs uppercase tracking-wider mb-3">
                Buddy Marketplace
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                Discover Verified <span className="text-gradient">Buddies</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 mt-1">
                Find trustworthy companions for activities, coffee, and conversations in public venues.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-slate-500 glass px-3 py-1.5 rounded-xl">
                {totalCount} buddies available
              </span>
              <button
                onClick={handleResetFilters}
                className="p-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-blue-600 glass-strong flex items-center space-x-1 transition-all hover:-translate-y-0.5"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Quick City Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto py-3 no-scrollbar">
            <span className="text-sm font-bold text-slate-400 flex items-center mr-1">
              <MapPin className="w-3.5 h-3.5 mr-1" />
              City:
            </span>
            {cities.map((city) => (
              <button
                key={city}
                id={`filter-city-${city}`}
                onClick={() => setSelectedCity(city)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  selectedCity === city
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'glass text-slate-700 hover:-translate-y-0.5 hover:shadow-tint-blue'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Search Filter Bar */}
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          onlyOnline={onlyOnline}
          onOnlineToggle={setOnlyOnline}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />

        {/* Secondary Expandable Filter Tray */}
        {showFilters && (
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs mb-8 mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Gender
                </label>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800"
                >
                  <option value="any">Any Gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Language
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800"
                >
                  {languages.map((l) => (
                    <option key={l} value={l}>
                      {l === 'any' ? 'Any Language' : l}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Activity
                </label>
                <select
                  value={selectedActivitySlug || ''}
                  onChange={(e) => setSelectedActivitySlug(e.target.value || null)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800"
                >
                  <option value="">All Activities</option>
                  {activities.map((act) => (
                    <option key={act.slug} value={act.slug}>
                      {act.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Rating */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Rating
                </label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800"
                >
                  <option value="0">Any Rating</option>
                  <option value="4.8">⭐ 4.8 & above</option>
                  <option value="4.9">⭐ 4.9 & above</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              {/* Max Hourly Rate Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <span>Budget</span>
                  <span className="text-pink-600 font-extrabold">₹{maxRate}/hr</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="1200"
                  step="50"
                  value={maxRate}
                  onChange={(e) => setMaxRate(Number(e.target.value))}
                  className="w-full accent-pink-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto">
            <Loader2 className="w-10 h-10 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-base font-bold text-slate-700">Loading buddies...</p>
          </div>
        )}

        {/* Error State — distinguish verification-incomplete from genuine errors */}
        {!isLoading && error && (() => {
          const isVerificationError = error.toLowerCase().includes('verification');
          return (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto">
              {isVerificationError ? (
                <>
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900">Verification Required</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Complete your email, phone, and KYC verification to access buddy profiles.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('verification');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm shadow-md"
                  >
                    Complete Verification
                  </button>
                </>
              ) : (
                <>
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900">Error loading buddies</h3>
                  <p className="text-sm text-slate-500 mt-1">{error}</p>
                  <button
                    onClick={fetchBuddies}
                    className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md"
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
          );
        })()}

        {/* Logged-out State */}
        {!isLoading && !error && !isAuthenticated && filteredBuddies.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Register to Find a Buddy</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Create your YorBuddy account to explore verified companions and buddy profiles.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => {
                  setAuthMode('register');
                  setIsRegisterModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md"
              >
                Register Here
              </button>
              <button
                onClick={() => {
                  setAuthMode('login');
                  setIsRegisterModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Login
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && isAuthenticated && filteredBuddies.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No buddies found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try relaxing your filters, changing the selected city, or increasing the max budget rate.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Logged-in without membership — show CTA instead of results */}
        {!isLoading && !error && isAuthenticated && !hasMembership && filteredBuddies.length > 0 && (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Unlock Full Buddy Profiles</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Purchase a YorBuddy membership to view full profiles, hourly rates, ratings, and more.
            </p>
            <button
              onClick={() => {
                setActiveTab('pricing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-bold text-sm shadow-md"
            >
              View Membership Plans
            </button>
          </div>
        )}

        {/* Logged-in with membership but verification incomplete — show verification prompt */}
        {!isLoading && !error && isAuthenticated && hasMembership && !isVerified && (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Complete Verification to Find a Buddy</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Please complete your email, phone and identity verification before accessing buddy profiles.
            </p>
            <div className="space-y-2 text-left bg-slate-50 rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Email Verification</span>
                </div>
                <span className={`text-xs font-bold ${(verificationStatus?.email === 'verified') ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {(verificationStatus?.email === 'verified') ? 'Verified' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Phone Verification</span>
                </div>
                <span className={`text-xs font-bold ${(verificationStatus?.phone === 'verified') ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {(verificationStatus?.phone === 'verified') ? 'Verified' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">KYC Verification</span>
                </div>
                <span className={`text-xs font-bold ${(verificationStatus?.kyc === 'approved') ? 'text-emerald-600' : (verificationStatus?.kyc === 'pending') ? 'text-blue-600' : 'text-amber-600'}`}>
                  {(verificationStatus?.kyc === 'approved') ? 'Verified' : (verificationStatus?.kyc === 'pending') ? 'Under Review' : 'Not Submitted'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('verification');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm shadow-md"
            >
              Complete Verification
            </button>
          </div>
        )}

        {/* Results Grid — only for paid & verified members */}
        {!isLoading && !error && hasMembership && isVerified && filteredBuddies.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredBuddies.map((buddy) => (
                <BuddyCard key={buddy.user.id} buddy={buddy} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 pt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
