import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  SlidersHorizontal,
  MapPin,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  X,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BuddyCard } from './BuddyCard';

export const BuddySearch: React.FC = () => {
  const {
    buddies,
    activities,
    selectedCity,
    setSelectedCity,
    selectedActivitySlug,
    setSelectedActivitySlug,
  } = useApp();

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
  const [showMobileFilterModal, setShowMobileFilterModal] = useState<boolean>(false);

  const cities = useMemo(() => {
    const citySet = new Set<string>();
    buddies.forEach((b) => {
      if (b.profile.city) citySet.add(b.profile.city);
    });
    return ['All', ...Array.from(citySet).sort()];
  }, [buddies]);

  const languages = useMemo(() => {
    const langSet = new Set<string>();
    buddies.forEach((b) => {
      b.profile.languages?.forEach((l) => langSet.add(l));
    });
    return ['any', ...Array.from(langSet).sort()];
  }, [buddies]);

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

  // Filtered buddies
  const filteredBuddies = useMemo(() => {
    return buddies.filter((b) => {
      // City filter
      if (selectedCity !== 'All' && b.profile.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }

      // Activity filter
      if (selectedActivitySlug) {
        const actObj = activities.find((a) => a.slug === selectedActivitySlug);
        if (actObj && !b.buddyProfile.supported_activity_ids.includes(actObj.id)) {
          return false;
        }
      }

      // Search text query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = b.user.full_name.toLowerCase().includes(query);
        const matchesCity = b.profile.city.toLowerCase().includes(query);
        const matchesArea = b.profile.area.toLowerCase().includes(query);
        const matchesBio = b.buddyProfile.bio.toLowerCase().includes(query);
        const matchesInterests = b.profile.interests.some((i) => i.toLowerCase().includes(query));
        if (!matchesName && !matchesCity && !matchesArea && !matchesBio && !matchesInterests) {
          return false;
        }
      }

      // Gender
      if (selectedGender !== 'any' && b.user.gender !== selectedGender) {
        return false;
      }

      // Language
      if (selectedLanguage !== 'any') {
        const hasLang = b.profile.languages.some(
          (l) => l.toLowerCase() === selectedLanguage.toLowerCase()
        );
        if (!hasLang) return false;
      }

      // Max Rate
      if (b.buddyProfile.hourly_rate > maxRate) {
        return false;
      }

      // Min Rating
      if (minRating > 0 && b.buddyProfile.rating < minRating) {
        return false;
      }

      // Online status
      if (onlyOnline && !b.buddyProfile.is_online) {
        return false;
      }

      return true;
    });
  }, [
    buddies,
    selectedCity,
    selectedActivitySlug,
    searchQuery,
    selectedGender,
    selectedLanguage,
    maxRate,
    minRating,
    onlyOnline,
    activities,
  ]);

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Discover Verified Buddies
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Find trustworthy companions for activities, coffee, and conversations in public venues.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">
                {filteredBuddies.length} buddies available
              </span>
              <button
                onClick={handleResetFilters}
                className="p-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 flex items-center space-x-1"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Quick City Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto py-3 no-scrollbar">
            <span className="text-xs font-bold text-slate-400 flex items-center mr-1">
              <MapPin className="w-3.5 h-3.5 mr-1" />
              City:
            </span>
            {cities.map((city) => (
              <button
                key={city}
                id={`filter-city-${city}`}
                onClick={() => setSelectedCity(city)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCity === city
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar & Primary Filter Controls */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, area (FC Road, Bandra), interests (cinema, tech)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Activity Dropdown Filter */}
            <div className="md:col-span-3">
              <select
                value={selectedActivitySlug || ''}
                onChange={(e) => setSelectedActivitySlug(e.target.value || null)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Activities (10 Available)</option>
                {activities.map((act) => (
                  <option key={act.slug} value={act.slug}>
                    {act.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Online Now Toggle */}
            <div className="md:col-span-3 flex items-center justify-between sm:justify-end space-x-3">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyOnline}
                  onChange={(e) => setOnlyOnline(e.target.checked)}
                  className="w-4 h-4 text-pink-600 rounded border-slate-300 focus:ring-pink-500"
                />
                <span className="text-xs font-bold text-slate-700 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Online Now Only
                </span>
              </label>

              <button
                onClick={() => setShowMobileFilterModal(!showMobileFilterModal)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center space-x-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Secondary Expandable Filter Tray */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Gender */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
              >
                <option value="any">Any Gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
              >
                {languages.map((l) => (
                  <option key={l} value={l}>
                    {l === 'any' ? 'Any Language' : l}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Rating */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Rating
              </label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
              >
                <option value="0">Any Rating</option>
                <option value="4.8">⭐ 4.8 & above</option>
                <option value="4.9">⭐ 4.9 & above</option>
              </select>
            </div>

            {/* Max Hourly Rate Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
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

        {/* Results Grid */}
        {filteredBuddies.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBuddies.map((buddy) => (
              <BuddyCard key={buddy.user.id} buddy={buddy} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
