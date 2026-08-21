'use client';

import React, { useState } from 'react';
import { 
  Search, 
  X, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  Check, 
  Eye, 
  Sparkles, 
  Filter
} from 'lucide-react';
import { KeywordAnalyticsToken, KeywordSortMode, KeywordTier } from '@/lib/keywordAnalytics';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { copyToClipboard } from '@/lib/clipboard';
import { PaginationCapsule } from '@/components/common/PaginationCapsule';

export interface KeywordTableProps {
  tokens: KeywordAnalyticsToken[];
  isLoading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  sortBy: KeywordSortMode;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: KeywordSortMode, sortOrder: 'asc' | 'desc') => void;
  tierFilter: string;
  onTierFilterChange: (tier: string) => void;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onInspectKeyword: (keyword: string) => void;
}

const TIER_CONFIG: Record<KeywordTier, { label: string; badgeClass: string; icon: string }> = {
  draw_more: {
    label: 'Draw More',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    icon: '💎',
  },
  star: {
    label: 'Star',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    icon: '🌟',
  },
  workhorse: {
    label: 'Workhorse',
    badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    icon: '📦',
  },
  dormant: {
    label: 'Dormant',
    badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    icon: '💤',
  },
  untested: {
    label: 'Untested',
    badgeClass: 'bg-muted/10 text-muted border-border',
    icon: '⚪',
  },
};

export function KeywordTable({
  tokens,
  isLoading,
  search,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  tierFilter,
  onTierFilterChange,
  timeRange = 'all',
  onTimeRangeChange,
  page,
  totalPages,
  onPageChange,
  onInspectKeyword,
}: KeywordTableProps) {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  // Reset selection on filter or page change
  React.useEffect(() => {
    setSelectedKeywords([]);
  }, [page, tierFilter, search, timeRange]);

  const handleToggleSelectAll = () => {
    if (selectedKeywords.length === tokens.length && tokens.length > 0) {
      setSelectedKeywords([]);
    } else {
      setSelectedKeywords(tokens.map((t) => t.keyword));
    }
  };

  const handleToggleRow = (keyword: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(keyword) ? prev.filter((k) => k !== keyword) : [...prev, keyword]
    );
  };

  const handleCopySelected = async () => {
    if (selectedKeywords.length === 0) return;
    const success = await copyToClipboard(selectedKeywords.join(', '));
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSort = (field: KeywordSortMode) => {
    if (sortBy === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'desc');
    }
  };

  const renderSortIcon = (field: KeywordSortMode) => {
    if (sortBy !== field) {
      return <ArrowUpDown size={14} className="opacity-40" />;
    }
    if (sortOrder === 'asc') {
      return <ArrowUp size={14} className="text-primary font-bold" />;
    }
    return <ArrowDown size={14} className="text-primary font-bold" />;
  };

  const timeRanges = [
    { id: 'all', label: 'All Time' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
    { id: '1y', label: '1 Year' },
  ];

  const tiers = [
    { id: 'all', label: 'All Tiers' },
    { id: 'draw_more', label: '💎 Draw More' },
    { id: 'star', label: '🌟 Star' },
    { id: 'workhorse', label: '📦 Workhorse' },
    { id: 'dormant', label: '💤 Dormant' },
    { id: 'untested', label: '⚪ Untested' },
  ];

  const allSelected = tokens.length > 0 && selectedKeywords.length === tokens.length;

  return (
    <div className="bg-surface border border-border rounded-xl shadow-2xs overflow-hidden flex flex-col flex-1">
      {/* Controls Bar */}
      <div className="p-4 border-b border-border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 bg-surface/50">
        {/* Left Section: Search & Time Range Velocity Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              data-testid="keyword-search-input"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search keywords in portfolio..."
              className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
            />
            {search && (
              <button
                type="button"
                data-testid="keyword-search-clear-btn"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Time Range Filter Pills */}
          {onTimeRangeChange && (
            <div className="inline-flex p-0.5 bg-background border border-border rounded-lg shrink-0">
              {timeRanges.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  data-testid={`keyword-time-range-${r.id}`}
                  onClick={() => onTimeRangeChange(r.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    timeRange === r.id
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Section: Tier Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {tiers.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`keyword-filter-tier-${t.id}`}
              onClick={() => onTierFilterChange(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer whitespace-nowrap ${
                tierFilter === t.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                  : 'bg-background hover:bg-muted/10 text-muted hover:text-foreground border-border'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-x-auto">
        <table data-testid="keyword-table" className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/10 text-xs font-semibold text-muted uppercase tracking-wider select-none">
              <th className="py-3.5 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  data-testid="keyword-select-all-checkbox"
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                  aria-label="Select all keywords on page"
                  className="rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                />
              </th>
              <th className="py-3.5 px-4 min-w-44">
                <button
                  type="button"
                  onClick={() => handleSort('alphabetical')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                >
                  <span>Keyword</span>
                  {renderSortIcon('alphabetical')}
                </button>
              </th>
              <th className="py-3.5 px-3 min-w-28">Tier</th>
              <th className="py-3.5 px-3 text-right min-w-24">
                <button
                  type="button"
                  data-testid="keyword-sort-frequency-btn"
                  onClick={() => handleSort('frequency')}
                  className="flex items-center justify-end gap-1.5 hover:text-foreground transition-colors cursor-pointer ml-auto"
                >
                  <span>Assets</span>
                  {renderSortIcon('frequency')}
                </button>
              </th>
              <th className="py-3.5 px-3 text-right min-w-28">
                <button
                  type="button"
                  data-testid="keyword-sort-downloads-btn"
                  onClick={() => handleSort('downloads')}
                  className="flex items-center justify-end gap-1.5 hover:text-foreground transition-colors cursor-pointer ml-auto"
                >
                  <span>Downloads</span>
                  {renderSortIcon('downloads')}
                </button>
              </th>
              <th className="py-3.5 px-3 text-right min-w-28">
                <button
                  type="button"
                  data-testid="keyword-sort-earnings-btn"
                  onClick={() => handleSort('earnings')}
                  className="flex items-center justify-end gap-1.5 hover:text-foreground transition-colors cursor-pointer ml-auto"
                >
                  <span>Earnings</span>
                  {renderSortIcon('earnings')}
                </button>
              </th>
              <th className="py-3.5 px-3 text-right min-w-24">
                <button
                  type="button"
                  data-testid="keyword-sort-rpi-btn"
                  onClick={() => handleSort('rpi')}
                  className="flex items-center justify-end gap-1.5 hover:text-foreground transition-colors cursor-pointer ml-auto"
                  title="Revenue Per Image ($/Asset)"
                >
                  <span>RPI</span>
                  {renderSortIcon('rpi')}
                </button>
              </th>
              <th className="py-3.5 px-3 text-right min-w-24">
                <button
                  type="button"
                  data-testid="keyword-sort-rpd-btn"
                  onClick={() => handleSort('rpd')}
                  className="flex items-center justify-end gap-1.5 hover:text-foreground transition-colors cursor-pointer ml-auto"
                  title="Revenue Per Download ($/Download)"
                >
                  <span>RPD</span>
                  {renderSortIcon('rpd')}
                </button>
              </th>
              <th className="py-3.5 px-3 text-center min-w-20">Top 5</th>
              <th className="py-3.5 px-4 text-center min-w-20">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm">Calculating keyword metrics...</p>
                  </div>
                </td>
              </tr>
            ) : tokens.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter size={32} className="opacity-30" />
                    <p className="text-base font-medium text-foreground">No keywords match your criteria</p>
                    <p className="text-xs">Try clearing search filters or changing tier tabs.</p>
                  </div>
                </td>
              </tr>
            ) : (
              tokens.map((token) => {
                const isSelected = selectedKeywords.includes(token.keyword);
                const tierConf = TIER_CONFIG[token.tier] || TIER_CONFIG.untested;

                return (
                  <tr
                    key={token.keyword}
                    className={`hover:bg-muted/10 transition-colors group ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        data-testid={`keyword-row-checkbox-${token.keyword}`}
                        checked={isSelected}
                        onChange={() => handleToggleRow(token.keyword)}
                        aria-label={`Select keyword ${token.keyword}`}
                        className="rounded border-border text-primary focus:ring-primary/30 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">#{token.keyword}</span>
                        {token.isTopFive && (
                          <span
                            title={`Top 5 placement in ${token.topFiveCount} artworks`}
                            className="text-amber-500 shrink-0"
                          >
                            <Sparkles size={13} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        data-testid={`keyword-tier-badge-${token.keyword}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${tierConf.badgeClass}`}
                      >
                        <span>{tierConf.icon}</span>
                        <span>{tierConf.label}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-foreground">
                      {formatNumber(token.frequency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-foreground">
                      {formatNumber(token.totalDownloads)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-emerald-500">
                      {formatCurrency(token.totalEarnings)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-foreground/80">
                      {formatCurrency(token.rpi)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-foreground/80">
                      {formatCurrency(token.rpd)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-muted text-xs">
                      {token.topFiveCount > 0 ? `${token.topFiveCount}x` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        data-testid={`keyword-row-inspect-btn-${token.keyword}`}
                        onClick={() => onInspectKeyword(token.keyword)}
                        className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-muted/10 transition-colors cursor-pointer"
                        title="Inspect Artworks"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedKeywords.length > 0 && (
        <div className="bg-primary/10 border-t border-primary/20 px-4 py-2.5 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">
              {selectedKeywords.length} {selectedKeywords.length === 1 ? 'keyword' : 'keywords'} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedKeywords([])}
              className="px-2.5 py-1 text-xs text-muted hover:text-foreground cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              data-testid="keyword-bulk-copy-btn"
              onClick={handleCopySelected}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-all cursor-pointer shadow-2xs"
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
              <span>{isCopied ? 'Copied Tags!' : 'Copy Tags'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && onPageChange && (
        <div className="p-4 border-t border-border flex justify-center items-center gap-3 bg-surface rounded-b-xl">
          <PaginationCapsule
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            prevTestId="keyword-pagination-prev-btn"
            nextTestId="keyword-pagination-next-btn"
            inputTestId="keyword-pagination-page-input"
          />
        </div>
      )}
    </div>
  );
}
