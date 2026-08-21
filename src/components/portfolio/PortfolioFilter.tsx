'use client';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';

interface PortfolioFilterProps {
  onFilterChange: (filters: { search: string; sortBy: string; sortOrder: string; startDate: string; endDate: string }) => void;
}

export function PortfolioFilter({ onFilterChange }: PortfolioFilterProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Debounce search and filter inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({ search, sortBy, sortOrder, startDate, endDate });
    }, 300);
    return () => clearTimeout(handler);
  }, [search, sortBy, sortOrder, startDate, endDate, onFilterChange]);

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6 bg-surface p-4 rounded-lg border border-border items-stretch md:items-end">
      <div className="w-full md:w-72 lg:w-80 shrink-0">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={({ startDate: s, endDate: e }) => {
            setStartDate(s);
            setEndDate(e);
          }}
        />
      </div>

      <div className="w-full md:w-auto md:flex-1">
        <label htmlFor="portfolio-search" className="block text-sm font-medium text-foreground mb-1">Search</label>
        <div className="relative flex items-center">
          <input
            id="portfolio-search"
            data-testid="portfolio-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, keywords, tags, code, or asset ID..."
            className="w-full pl-3 pr-9 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-10.5"
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

      <div className="w-full md:w-48 shrink-0">
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
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-10.5"
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
