import React from 'react';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Grid3X3,
  Map,
  Zap,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  onlyOnline: boolean;
  onOnlineToggle: (online: boolean) => void;
  viewMode: 'grid' | 'map';
  onViewModeChange: (mode: 'grid' | 'map') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

const cities = ['All', 'Pune', 'Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Kolkata', 'Chennai', 'Jaipur'];

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCity,
  onCityChange,
  onlyOnline,
  onOnlineToggle,
  viewMode,
  onViewModeChange,
  showFilters,
  onToggleFilters,
}) => {
  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-6 mb-6">
      {/* Main Search Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1.2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, area, or interests..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/70 border border-white/80 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 shadow-inner"
          />
        </div>

        {/* City Selector */}
        <select
          value={selectedCity}
          onChange={(e) => onCityChange(e.target.value)}
          className="px-3 py-2.5 rounded-2xl bg-white/70 border border-white/80 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/25 shadow-inner"
        >
          {cities.map((city) => (
            <option key={city} value={city}>
              {city === 'All' ? 'All Cities' : city}
            </option>
          ))}
        </select>

        {/* Online Toggle */}
        <button
          onClick={() => onOnlineToggle(!onlyOnline)}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            onlyOnline
              ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500 shadow-md shadow-emerald-500/20'
              : 'bg-white/70 text-slate-700 border border-white/80 hover:border-emerald-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${onlyOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          <span>Available Now</span>
        </button>

        {/* Filter Toggle */}
        <button
          onClick={onToggleFilters}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
            showFilters
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-500 shadow-md shadow-blue-500/20'
              : 'bg-white/70 text-slate-700 border border-white/80 hover:border-blue-300'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-white/60 rounded-2xl p-1 border border-white/80">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-xl transition-all ${
              viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
            }`}
            title="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('map')}
            className={`p-2 rounded-xl transition-all ${
              viewMode === 'map' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
            }`}
            title="Map view"
          >
            <Map className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex items-center space-x-2 mt-4 overflow-x-auto pb-2">
        <span className="text-sm font-bold text-slate-400 flex-shrink-0">Quick:</span>
        <button
          onClick={() => onSearchChange('')}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white/80 border border-white/90 text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-600 hover:-translate-y-0.5 transition-all whitespace-nowrap shadow-2xs"
        >
          <Sparkles className="w-3 h-3" />
          <span>Best Match</span>
        </button>
        <button
          onClick={() => onOnlineToggle(true)}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white/80 border border-white/90 text-sm font-semibold text-slate-700 hover:border-emerald-500 hover:text-emerald-600 hover:-translate-y-0.5 transition-all whitespace-nowrap shadow-2xs"
        >
          <Zap className="w-3 h-3" />
          <span>Available Now</span>
        </button>
        <button
          onClick={() => onCityChange('Pune')}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white/80 border border-white/90 text-sm font-semibold text-slate-700 hover:border-purple-500 hover:text-purple-600 hover:-translate-y-0.5 transition-all whitespace-nowrap shadow-2xs"
        >
          <MapPin className="w-3 h-3" />
          <span>Near Me</span>
        </button>
        <button
          onClick={() => onSearchChange('')}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white/80 border border-white/90 text-sm font-semibold text-slate-700 hover:border-rose-500 hover:text-rose-600 hover:-translate-y-0.5 transition-all whitespace-nowrap shadow-2xs"
        >
          <Users className="w-3 h-3" />
          <span>Same Gender</span>
        </button>
      </div>
    </div>
  );
};
