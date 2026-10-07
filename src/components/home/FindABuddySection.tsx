import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, MapPin, RotateCcw, Loader2, AlertCircle, Star, Lock, Users, ArrowRight, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SearchFilterBar } from '../buddies/SearchFilterBar';
import { buddyService, BuddySearchResult } from '../../services/buddy';

const perPage = 12;

// Clean fallback avatar (SVG data URI) used when a buddy has no photo_url.
// Prevents broken-image icons for users without a profile photo.
const FALLBACK_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWVhNWIxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMjF2LTIgYTYgNiAwIDAgMC02LTZIOGEgNiAIDAgMCAwLTYgMnYyIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0Ii8+PC9zdmc+';

const getPhotoUrl = (photoUrl: string | null): string => photoUrl || FALLBACK_AVATAR;

export const FindABuddySection: React.FC = () => {
  const {
    activities,
    selectedCity,
    setSelectedCity,
    selectedActivitySlug,
    setSelectedActivitySlug,
    isAuthenticated,
    currentUser,
    setAuthMode,
    setIsRegisterModalOpen,
    apiMembership,
    setActiveTab,
  } = useApp();

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<string>('any');
  const [onlyOnline, setOnlyOnline] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Admin users bypass membership gate (already handled by App.tsx routing, but defensive here)
  const isAdmin = isAuthenticated && currentUser?.role === 'admin';

  // API state
  const [apiBuddies, setApiBuddies] = useState<BuddySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Admin sees unlocked content without membership requirement
  const hasMembership = isAdmin || (isAuthenticated && apiMembership && apiMembership.is_active);

  // Fetch buddies from API
  const fetchBuddies = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setApiBuddies([]);
      setTotalCount(0);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        page: 1,
        per_page: perPage,
        sort: 'rating_desc',
      };
      if (selectedCity !== 'All') params.city = selectedCity;
      if (selectedActivitySlug) params.activity = selectedActivitySlug;
      if (onlyOnline) params.online = true;
      if (searchQuery.trim()) params.query = searchQuery.trim();

      const response = await buddyService.searchBuddies(params);
      setApiBuddies(response.data);
      setTotalCount(response.meta.total);
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setError(apiError?.message || 'Failed to load buddies. Please try again.');
      setApiBuddies([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCity, selectedActivitySlug, onlyOnline, searchQuery, isAuthenticated]);

  useEffect(() => {
    fetchBuddies();
  }, [fetchBuddies]);

  // Client-side gender filter
  const filteredBuddies = useMemo(() => {
    if (selectedGender === 'any') return apiBuddies;
    return apiBuddies.filter((b) => b.user.gender === selectedGender);
  }, [apiBuddies, selectedGender]);

  const startIdx = filteredBuddies.length > 0 ? 1 : 0;
  const endIdx = filteredBuddies.length;

  const handleResetFilters = () => {
    setSelectedCity('All');
    setSelectedActivitySlug(null);
    setSearchQuery('');
    setSelectedGender('any');
    setOnlyOnline(false);
  };

  const handleUnlockClick = () => {
    if (!isAuthenticated) {
      setAuthMode('register');
      setIsRegisterModalOpen(true);
    } else if (!hasMembership) {
      setActiveTab('pricing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleViewAllBuddies = () => {
    setActiveTab('find-buddy');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="section-shell mesh-section-c py-14 sm:py-20">
      {/* Soft seam so this section hands off to the previous one */}
      <div className="section-seam" aria-hidden="true" />

      <div className="orb orb-blue top-[-10%] right-[6%] w-[420px] h-[420px] opacity-30 orb-drift-a" />
      <div className="orb orb-pink bottom-[-12%] left-[6%] w-[400px] h-[400px] opacity-28 orb-drift-c" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full glass text-blue-600 font-bold text-sm uppercase tracking-wider mb-3">
            Discover
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Find a <span className="text-gradient">Buddy</span>
          </h2>
          <p className="mt-3 text-lg sm:text-xl text-slate-600">
            Meet verified people for coffee, movies, shopping, events, conversations, city exploration and more.
          </p>
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

        {/* Secondary Filters */}
        {showFilters && (
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs mt-4 mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Activity</label>
                <select
                  value={selectedActivitySlug || ''}
                  onChange={(e) => setSelectedActivitySlug(e.target.value || null)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800"
                >
                  <option value="">All Activities</option>
                  {activities.map((act) => (
                    <option key={act.slug} value={act.slug}>{act.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800"
                >
                  <option value="any">Any Gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={handleResetFilters} className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Count */}
        {isAuthenticated && !isLoading && !error && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-base text-slate-600 font-semibold">
              Showing {startIdx}–{endIdx} of {totalCount} buddies
            </p>
            <button onClick={handleResetFilters} className="text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center space-x-1">
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Logged-out State */}
        {!isAuthenticated && !isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="relative card-premium rounded-3xl overflow-hidden">
                <div className="relative h-64 bg-slate-200 overflow-hidden">
                  <div className="absolute inset-0 backdrop-blur-sm bg-slate-300/80 flex flex-col items-center justify-center text-center p-6 z-10">
                    <div className="icon-tile w-14 h-14 flex items-center justify-center mb-3">
                      <Lock className="w-6 h-6 text-slate-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">Pass from ₹99</p>
                    <p className="text-xs text-slate-600 mt-1">Tap to unlock profile</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2 mb-3"></div>
                  <div className="h-3 bg-slate-100 rounded w-2/3 mb-4"></div>
                  <button
                    onClick={handleUnlockClick}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white text-xs font-bold"
                  >
                    Join YorBuddy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Logged-in without membership */}
        {isAuthenticated && !hasMembership && !isLoading && !error && filteredBuddies.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {filteredBuddies.slice(0, 6).map((buddy) => (
              <div key={buddy.user.id} className="relative card-premium rounded-3xl overflow-hidden">
                <div className="relative h-64 bg-slate-200 overflow-hidden">
                  <img
                    src={getPhotoUrl(buddy.profile.photo_url)}
                    alt=""
                    className="w-full h-full object-cover blur-md opacity-50"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
                    <div className="icon-tile w-14 h-14 flex items-center justify-center mb-3">
                      <Lock className="w-6 h-6 text-slate-600" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">Pass from ₹99</p>
                    <p className="text-xs text-slate-600 mt-1">Tap to unlock profile</p>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-slate-900">{buddy.user.full_name.split(' ')[0]}</h3>
                  <p className="text-sm text-slate-500 mt-1 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {buddy.profile.city}
                  </p>
                  <div className="mt-2 flex items-center space-x-1 text-xs">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="font-bold">{buddy.buddy_profile.rating}</span>
                    <span className="text-slate-400">({buddy.buddy_profile.review_count})</span>
                  </div>
                  <button
                    onClick={handleUnlockClick}
                    className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 text-white text-xs font-bold"
                  >
                    Unlock with YorBuddy Membership
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Authorized users - show full cards */}
        {isAuthenticated && hasMembership && !isLoading && !error && filteredBuddies.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {filteredBuddies.map((buddy) => (
              <div key={buddy.user.id} className="group card-buddy rounded-3xl overflow-hidden">
                <div className="relative h-64 overflow-hidden bg-slate-100">
                  <img
                    src={getPhotoUrl(buddy.profile.photo_url)}
                    alt={buddy.user.full_name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]"
                  />
                  {/* Bottom-weighted vignette — photo stays bright, overlays stay legible */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/12 to-transparent"></div>
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                  <div className="absolute top-3 left-3 flex items-center space-x-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold border border-white/15">
                    <span className={`w-2 h-2 rounded-full ${buddy.buddy_profile.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    <span>{buddy.buddy_profile.is_online ? 'Online' : 'Offline'}</span>
                  </div>
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg glass text-slate-900 text-sm font-bold">
                    ₹{buddy.buddy_profile.hourly_rate}/hr
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {buddy.user.full_name}
                    </h3>
                    <div className="flex items-center space-x-1 text-sm font-bold">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{buddy.buddy_profile.rating}</span>
                      <span className="text-slate-400 font-normal">({buddy.buddy_profile.review_count})</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 flex items-center">
                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{buddy.profile.city} • {buddy.profile.area}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {buddy.buddy_profile.supported_activity_ids.slice(0, 3).map((actId) => {
                      const act = activities.find((a) => a.id === actId);
                      return act ? (
                        <span key={actId} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                          {act.title}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {buddy.buddy_profile.response_time}
                    </span>
                    <span>{buddy.profile.languages.slice(0, 2).join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {isAuthenticated && !isLoading && !error && filteredBuddies.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No buddies found</h3>
            <p className="text-base text-slate-500 mt-1">Try adjusting your filters or search query.</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
            <p className="text-base text-slate-600">{error}</p>
          </div>
        )}

        {/* View All Buddies CTA */}
        {isAuthenticated && !isLoading && !error && filteredBuddies.length > 0 && (
          <div className="mt-10 text-center">
            <button
              onClick={handleViewAllBuddies}
              className="inline-flex items-center space-x-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-pink-500 text-white font-bold text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Users className="w-5 h-5" />
              <span>View All Buddies</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
