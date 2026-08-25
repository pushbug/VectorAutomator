'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';

export type SearchScope = 'all' | 'title' | 'keywords' | 'code' | 'ids';

export type IdStatusFilter =
  | 'all'
  | 'missing_asId'
  | 'missing_ssId'
  | 'missing_all_ids'
  | 'missing_image_file';

interface FilterOption {
  value: IdStatusFilter;
  label: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Assets' },
  { value: 'missing_asId', label: 'Missing Adobe ID' },
  { value: 'missing_ssId', label: 'Missing Shutterstock ID' },
  { value: 'missing_all_ids', label: 'No Platform IDs' },
  { value: 'missing_image_file', label: 'Missing Image File' },
];

export interface PortfolioFilterValues {
  search: string;
  searchField: SearchScope;
  idStatus: IdStatusFilter;
  sortBy: string;
  sortOrder: string;
  startDate: string;
  endDate: string;
}

interface PortfolioFilterProps {
  onFilterChange: (filters: PortfolioFilterValues) => void;
}

export function PortfolioFilter({ onFilterChange }: PortfolioFilterProps) {
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState<SearchScope>('all');
  const [idStatus, setIdStatus] = useState<IdStatusFilter>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Debounce search and filter inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({ search, searchField, idStatus, sortBy, sortOrder, startDate, endDate });
    }, 300);
    return () => clearTimeout(handler);
  }, [search, searchField, idStatus, sortBy, sortOrder, startDate, endDate, onFilterChange]);

  const getCurrentFilterLabel = (status: IdStatusFilter) => {
    const found = FILTER_OPTIONS.find(o => o.value === status);
    return found ? found.label : 'All Assets';
  };

  const getSearchPlaceholder = (field: SearchScope) => {
    switch (field) {
      case 'keywords':
        return 'Search keywords (e.g. infographic, 3d)...';
      case 'title':
        return 'Search image title...';
      case 'code':
        return 'Search vector code (e.g. 2608-35)...';
      case 'ids':
        return 'Search Shutterstock, Adobe, Vecteezy ID...';
      case 'all':
      default:
        return 'Search across all fields (title, keywords, code, ID)...';
    }
  };

  return (
    <div className="flex flex-col md:flex-row flex-wrap gap-4 mb-6 bg-surface p-4 rounded-lg border border-border items-stretch md:items-end">
      <div className="w-full md:w-64 lg:w-72 shrink-0">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={({ startDate: s, endDate: e }) => {
            setStartDate(s);
            setEndDate(e);
          }}
        />
      </div>

      <div className="w-full md:w-auto md:flex-1 min-w-50">
        <label htmlFor="portfolio-search" className="block text-sm font-medium text-foreground mb-1">Search</label>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-background border border-border rounded-md px-2.5 shrink-0 h-10.5">
            <select
              id="portfolio-search-field"
              data-testid="portfolio-search-field-select"
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as SearchScope)}
              aria-label="Search scope"
              className="bg-transparent text-sm text-foreground focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All</option>
              <option value="title">Title</option>
              <option value="keywords">Keywords</option>
              <option value="code">Code</option>
              <option value="ids">Asset IDs</option>
            </select>
          </div>

          <div className="relative flex-1 flex items-center">
            <input
              id="portfolio-search"
              data-testid="portfolio-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={getSearchPlaceholder(searchField)}
              className="w-full pl-3 pr-9 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-10.5 text-sm"
            />
            {search && (
              <button
                type="button"
                data-testid="portfolio-search-clear-btn"
                onClick={() => setSearch('')}
                className="absolute right-2.5 text-muted hover:text-foreground p-1 rounded-full hover:bg-muted/10 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Dropdown (Custom downwards popover) */}
      <div className="relative w-full sm:w-56 shrink-0" ref={dropdownRef}>
        <label htmlFor="portfolio-id-status" className="block text-sm font-medium text-foreground mb-1">Filter</label>
        
        {/* Hidden accessible select for test and form automation */}
        <select
          id="portfolio-id-status"
          data-testid="portfolio-id-status-select"
          value={idStatus}
          onChange={(e) => setIdStatus(e.target.value as IdStatusFilter)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Custom Trigger Button */}
        <button
          type="button"
          data-testid="portfolio-id-status-trigger"
          onClick={() => setIsDropdownOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-md bg-background text-foreground hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary h-10.5 text-sm cursor-pointer transition-colors"
        >
          <span className="truncate font-medium text-left">
            {getCurrentFilterLabel(idStatus)}
          </span>
          <ChevronDown
            size={16}
            className={`text-muted shrink-0 ml-1.5 transition-transform duration-200 ${
              isDropdownOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        </button>

        {/* Custom Popover - STRICTLY drops downwards (top-full mt-1.5) */}
        {isDropdownOpen && (
          <div
            data-testid="portfolio-id-status-menu"
            className="absolute top-full mt-1.5 left-0 w-60 bg-surface border border-border rounded-xl shadow-xl z-50 p-1.5 backdrop-blur-md"
          >
            <div className="space-y-0.5">
              {FILTER_OPTIONS.map((opt) => {
                const isSelected = idStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-testid={`portfolio-filter-option-${opt.value}`}
                    onClick={() => {
                      setIdStatus(opt.value);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={14} className="text-primary shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="w-full sm:w-44 shrink-0">
        <label htmlFor="portfolio-sort" className="block text-sm font-medium text-foreground mb-1">Sort By</label>
        <select
          id="portfolio-sort"
          data-testid="portfolio-sort-select"
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [newSortBy, newSortOrder] = e.target.value.split('-');
            setSortBy(newSortBy);
            setSortOrder(newSortOrder);
          }}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-10.5 text-sm cursor-pointer"
        >
          <option value="createdAt-desc">Newest First</option>
          <option value="createdAt-asc">Oldest First</option>
          <option value="totalDownloads-desc">Downloads (Highest)</option>
          <option value="totalDownloads-asc">Downloads (Lowest)</option>
        </select>
      </div>
    </div>
  );
}


