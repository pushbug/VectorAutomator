'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  TrendingUp,
  Search,
  Image as ImageIcon,
  ExternalLink,
  MoreHorizontal,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Trash2,
  Calendar,
  X,
  Tag,
  ChevronDown,
  Check,
  Download,
} from 'lucide-react';
import { formatCurrency, formatNumber, getImageUrl } from '@/lib/formatters';
import { DateRangePicker } from '@/components/portfolio/DateRangePicker';
import { PaginationCapsule } from '@/components/common/PaginationCapsule';

export interface SerpRankedItem {
  id: string;
  rank: number;
  assetId: string;
  title: string;
  author?: string | null;
  thumbnailUrl?: string | null;
  detailUrl?: string | null;
  keyword: string;
  platform: string;
  pageNumber: number;
  searchedAt: string;
  serpQueryId: string;
  matchedImageId?: string | null;
  imageCode?: string | null;
  imageTitle?: string | null;
  imageFilePath?: string | null;
  previousRank?: number | null;
  rankDelta?: number | null;
  isNew: boolean;
  asDownloads: number;
  totalDownloads: number;
  totalEarnings: number;
}

interface SerpTableProps {
  items: SerpRankedItem[];
  isLoading: boolean;
  onSelectArtwork: (imageId: string) => void;
  onViewFullSerp: (queryId: string) => void;
  onDeleteSnapshot?: (queryId: string, keyword: string, date: string) => void;
  onDeleteBulkSnapshots?: (queryIds: string[]) => void;
  // Controls & Filters
  search: string;
  onSearchChange: (val: string) => void;
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (start: string, end: string) => void;
  keywordFilter?: string;
  onKeywordFilterChange?: (kw: string) => void;
  trackedKeywords?: string[];
  // Sorting & Pagination
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
  onSort?: (field: string) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function SerpTable({
  items,
  isLoading,
  onSelectArtwork,
  onViewFullSerp,
  onDeleteSnapshot,
  onDeleteBulkSnapshots,
  search,
  onSearchChange,
  startDate,
  endDate,
  onDateRangeChange,
  keywordFilter = '',
  onKeywordFilterChange,
  trackedKeywords = [],
  sortBy = 'date',
  sortOrder = 'desc',
  onSortChange,
  onSort,
  page = 1,
  totalPages = 1,
  onPageChange,
}: SerpTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isKeywordDropdownOpen, setIsKeywordDropdownOpen] = useState(false);
  const [keywordSearchInput, setKeywordSearchInput] = useState('');
  const keywordDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      setActiveMenuId(null);
      if (
        keywordDropdownRef.current &&
        !keywordDropdownRef.current.contains(event.target as Node)
      ) {
        setIsKeywordDropdownOpen(false);
      }
    };
    if (activeMenuId || isKeywordDropdownOpen) {
      document.addEventListener('click', handleDocumentClick);
      return () => document.removeEventListener('click', handleDocumentClick);
    }
  }, [activeMenuId, isKeywordDropdownOpen]);

  // Format date helper matching other modules (DD-MM-YYYY)
  const formatTableDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Checkbox helpers
  const isAllPageSelected = items.length > 0 && items.every((i) => selectedIds.includes(i.id));
  const isSomePageSelected = items.some((i) => selectedIds.includes(i.id)) && !isAllPageSelected;

  const handleToggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !items.some((item) => item.id === id)));
    } else {
      const pageIds = items.map((i) => i.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Map selected item IDs to unique query IDs for bulk actions
  const selectedQueryIds = Array.from(
    new Set(
      items
        .filter((item) => selectedIds.includes(item.id))
        .map((item) => item.serpQueryId)
    )
  );

  // Reset selection on filter, search, page, or sort change
  useEffect(() => {
    setSelectedIds([]);
  }, [page, keywordFilter, search, startDate, endDate, sortBy, sortOrder]);

  const handleHeaderClick = (column: string) => {
    if (!onSortChange && !onSort) return;
    if (sortBy === column) {
      const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      if (onSortChange) onSortChange(column, nextOrder);
      else if (onSort) onSort(column);
    } else {
      const defaultOrder = column === 'rank' || column === 'keyword' ? 'asc' : 'desc';
      if (onSortChange) onSortChange(column, defaultOrder);
      else if (onSort) onSort(column);
    }
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown size={12} className="opacity-40 shrink-0" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={12} className="text-primary shrink-0" />
    ) : (
      <ArrowDown size={12} className="text-primary shrink-0" />
    );
  };

  const filteredTrackedKeywords = trackedKeywords.filter((kw) =>
    kw.toLowerCase().includes(keywordSearchInput.toLowerCase().trim())
  );

  return (
    <div
      data-testid="serp-table"
      className="w-full bg-surface border border-border rounded-2xl shadow-sm flex flex-col relative"
    >
      {/* Controls Bar (Matching Sales and Portfolio Layout) */}
      <div className="p-4 border-b border-border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-surface rounded-t-2xl">
        {/* Left controls: Date Range Filter & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {onDateRangeChange && (
            <div className="w-full sm:w-72">
              <DateRangePicker
                startDate={startDate || ''}
                endDate={endDate || ''}
                onChange={({ startDate: s, endDate: e }) => onDateRangeChange(s, e)}
                showLabel={false}
                testIdPrefix="serp-date"
              />
            </div>
          )}

          {/* Search input */}
          <div className="w-full sm:w-64 relative flex items-center">
            <input
              type="text"
              data-testid="serp-search-input"
              placeholder="Search by code, title, or asset ID..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-hidden focus:border-primary h-10"
            />
            {search && (
              <button
                type="button"
                data-testid="serp-search-clear-btn"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 text-muted hover:text-foreground p-0.5 rounded-full hover:bg-muted/10 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Right controls: Searchable Keyword Combobox */}
        {trackedKeywords.length > 0 && onKeywordFilterChange && (
          <div className="relative shrink-0" ref={keywordDropdownRef}>
            <button
              type="button"
              data-testid="serp-keyword-filter-dropdown-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsKeywordDropdownOpen((prev) => !prev);
                setKeywordSearchInput('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer h-10 ${
                keywordFilter
                  ? 'bg-primary/10 border-primary/40 text-primary shadow-xs'
                  : 'bg-background hover:bg-surface-hover text-foreground border-border'
              }`}
            >
              <Tag size={14} className={keywordFilter ? 'text-primary' : 'text-muted'} />
              <span className="truncate max-w-44">
                {keywordFilter ? keywordFilter : `All Keywords (${trackedKeywords.length})`}
              </span>
              <ChevronDown
                size={14}
                className={`text-muted transition-transform duration-200 ${
                  isKeywordDropdownOpen ? 'rotate-180 text-foreground' : ''
                }`}
              />
            </button>

            {/* Dropdown Popover */}
            {isKeywordDropdownOpen && (
              <div
                data-testid="serp-keyword-filter-popover"
                className="absolute right-0 top-12 z-50 w-72 bg-surface border border-border rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Search inside Dropdown */}
                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-3 text-muted" />
                  <input
                    type="text"
                    placeholder="Search keywords..."
                    value={keywordSearchInput}
                    onChange={(e) => setKeywordSearchInput(e.target.value)}
                    autoFocus
                    className="w-full pl-8 pr-7 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-hidden focus:border-primary"
                  />
                  {keywordSearchInput && (
                    <button
                      type="button"
                      onClick={() => setKeywordSearchInput('')}
                      className="absolute right-2 text-muted hover:text-foreground p-0.5 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Keyword List */}
                <div className="max-h-60 overflow-y-auto space-y-0.5 py-1 pr-1 custom-scrollbar">
                  {/* All Keywords Option */}
                  <button
                    type="button"
                    data-testid="serp-keyword-option-all"
                    onClick={() => {
                      onKeywordFilterChange('');
                      setIsKeywordDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      keywordFilter === ''
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'hover:bg-surface-hover text-foreground'
                    }`}
                  >
                    <span>All Keywords</span>
                    <span className="font-mono text-[11px] opacity-80">({trackedKeywords.length})</span>
                  </button>

                  {/* Filtered Keywords */}
                  {filteredTrackedKeywords.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted">
                      No keyword matching &quot;{keywordSearchInput}&quot;
                    </div>
                  ) : (
                    filteredTrackedKeywords.map((kw) => {
                      const isSelected = keywordFilter === kw;
                      return (
                        <button
                          key={kw}
                          type="button"
                          data-testid={`serp-keyword-option-${kw}`}
                          onClick={() => {
                            onKeywordFilterChange(kw);
                            setIsKeywordDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                            isSelected
                              ? 'bg-primary text-primary-foreground font-semibold'
                              : 'hover:bg-surface-hover text-foreground'
                          }`}
                        >
                          <span className="truncate pr-2">{kw}</span>
                          {isSelected && <Check size={14} className="shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className={`overflow-x-auto ${totalPages > 1 && onPageChange ? '' : 'rounded-b-2xl'}`}>
        <table className="w-full text-left text-xs border-collapse">
          <thead className="border-b border-border bg-muted/10 text-xs font-semibold text-muted uppercase tracking-wider select-none">
            <tr>
              <th className="px-4 py-3 font-semibold w-10 text-center">
                <input
                  type="checkbox"
                  data-testid="serp-select-all-checkbox"
                  checked={isAllPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomePageSelected;
                  }}
                  onChange={handleToggleSelectAll}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer accent-primary"
                  aria-label="Select all artworks"
                />
              </th>
              <th
                onClick={() => handleHeaderClick('date')}
                className="py-3 px-4 font-semibold whitespace-nowrap min-w-28 cursor-pointer hover:bg-surface-hover/60 transition-colors select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  {renderSortIcon('date')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick('keyword')}
                className="py-3 px-4 font-semibold whitespace-nowrap min-w-44 cursor-pointer hover:bg-surface-hover/60 transition-colors select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Keyword</span>
                  {renderSortIcon('keyword')}
                </div>
              </th>
              <th className="py-3 px-4 font-semibold min-w-64">Artwork</th>
              <th
                onClick={() => handleHeaderClick('rank')}
                className="py-3 px-4 font-semibold text-center whitespace-nowrap min-w-32 cursor-pointer hover:bg-surface-hover/60 transition-colors select-none"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Current Rank</span>
                  {renderSortIcon('rank')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick('delta')}
                className="py-3 px-4 font-semibold text-center whitespace-nowrap min-w-32 cursor-pointer hover:bg-surface-hover/60 transition-colors select-none"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Rank Change</span>
                  {renderSortIcon('delta')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick('downloads')}
                className="py-3 px-4 font-semibold text-right whitespace-nowrap min-w-28 cursor-pointer hover:bg-surface-hover/60 transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Downloads</span>
                  {renderSortIcon('downloads')}
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick('revenue')}
                className="py-3 px-4 font-semibold text-right whitespace-nowrap min-w-32 cursor-pointer hover:bg-surface-hover/60 transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Total Revenue</span>
                  {renderSortIcon('revenue')}
                </div>
              </th>
              <th className="py-3 px-4 pr-6 font-semibold text-right whitespace-nowrap min-w-24">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-muted">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-xs">Loading asset rankings...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-muted">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-4 rounded-2xl bg-surface-hover text-muted">
                      <Search size={32} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">No Asset Rankings Found</h3>
                      <p className="text-xs text-muted max-w-sm mt-1">
                        Click <strong>Paste Rank Data</strong> above to paste search results and start tracking your organic positions.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-surface-hover/50 transition-colors group ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        data-testid={`serp-row-checkbox-${item.id}`}
                        checked={isSelected}
                        onChange={() => handleToggleRow(item.id)}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer accent-primary"
                        aria-label={`Select artwork ${item.id}`}
                      />
                    </td>

                    {/* 1. Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-foreground font-medium">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar size={14} className="text-muted shrink-0" />
                        <span>{formatTableDate(item.searchedAt)}</span>
                      </div>
                    </td>

                    {/* 2. Keyword */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-block font-semibold text-foreground bg-surface-hover/80 px-2.5 py-1 rounded-lg border border-border whitespace-nowrap">
                        {item.keyword}
                      </span>
                    </td>

                    {/* 3. Image (Clickable to inspect) */}
                    <td className="py-3.5 px-4">
                      <div
                        onClick={() => item.matchedImageId && onSelectArtwork(item.matchedImageId)}
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0 max-w-sm sm:max-w-md"
                      >
                        <div className="w-10 h-10 rounded-lg bg-surface border border-border overflow-hidden shrink-0 flex items-center justify-center">
                          {item.imageFilePath || item.thumbnailUrl ? (
                            <img
                              src={item.imageFilePath ? getImageUrl(item.imageFilePath) : item.thumbnailUrl!}
                              alt={item.imageTitle || item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon size={18} className="text-muted" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span
                            className="font-medium text-foreground text-xs leading-snug truncate block mb-0.5"
                            title={item.imageTitle || item.title}
                          >
                            {item.imageTitle || item.title}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-muted whitespace-nowrap">
                            {item.imageCode && (
                              <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                                {item.imageCode}
                              </span>
                            )}
                            <span>
                              Asset ID: <strong className="text-foreground/80">{item.assetId}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 4. Current Rank */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-lg shadow-sm ${
                          item.rank <= 3
                            ? 'bg-emerald-500 text-black'
                            : item.rank <= 10
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : item.rank <= 30
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-surface-hover text-muted border border-border'
                        }`}
                      >
                        #{item.rank}
                      </span>
                    </td>

                    {/* 5. Rank Delta */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.isNew ? (
                        <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                          ★ NEW
                        </span>
                      ) : typeof item.rankDelta === 'number' && item.rankDelta > 0 ? (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          ▲ +{item.rankDelta}
                        </span>
                      ) : typeof item.rankDelta === 'number' && item.rankDelta < 0 ? (
                        <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                          ▼ {item.rankDelta}
                        </span>
                      ) : (
                        <span className="text-muted font-mono text-xs">=</span >
                      )}
                    </td>

                    {/* 6. Downloads */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="font-mono tabular-nums text-xs font-medium text-foreground flex items-center justify-end gap-1">
                        <Download size={13} className="text-muted" />
                        {formatNumber(item.totalDownloads || item.asDownloads || 0)}
                      </span>
                    </td>

                    {/* 7. Total Revenue */}
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-400 font-bold">
                      {formatCurrency(item.totalEarnings)}
                    </td>

                    {/* 8. Actions */}
                    <td className="py-3.5 px-4 pr-6 text-right whitespace-nowrap relative min-w-24">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.matchedImageId && (
                          <button
                            onClick={() => onSelectArtwork(item.matchedImageId!)}
                            title="Inspect Rank & Revenue Correlation"
                            className="p-1.5 rounded-lg text-muted hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
                          >
                            <TrendingUp size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => onViewFullSerp(item.serpQueryId)}
                          title="View Full 100 Ranking Snapshot"
                          className="p-1.5 rounded-lg text-muted hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Eye size={16} />
                        </button>
                        {onDeleteSnapshot && (
                          <div className="relative">
                            <button
                              type="button"
                              data-testid={`serp-row-menu-btn-${item.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === item.id ? null : item.id);
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                activeMenuId === item.id
                                  ? 'bg-surface-hover text-foreground'
                                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
                              }`}
                              title="More options"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {activeMenuId === item.id && (
                              <div
                                data-testid={`serp-row-menu-dropdown-${item.id}`}
                                className="absolute right-0 top-9 z-30 w-44 bg-surface border border-border rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150 flex flex-col text-left divide-y divide-border/50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  data-testid={`serp-row-delete-btn-${item.id}`}
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onDeleteSnapshot(item.serpQueryId, item.keyword, item.searchedAt);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={14} className="shrink-0" />
                                  <span>Delete Snapshot</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && onPageChange && (
        <div className="p-4 border-t border-border flex justify-center items-center gap-3 bg-surface rounded-b-xl">
          <PaginationCapsule
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            prevTestId="serp-pagination-prev-btn"
            nextTestId="serp-pagination-next-btn"
            inputTestId="serp-pagination-page-input"
          />
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && onDeleteBulkSnapshots && (
        <div
          data-testid="serp-bulk-floating-bar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-surface/95 text-foreground border border-border rounded-2xl shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
        >
          <div className="flex items-center gap-2 pl-1 pr-3 border-r border-border font-medium text-xs sm:text-sm">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold font-mono">
              {selectedIds.length}
            </span>
            <span className="text-muted">artworks selected</span>
          </div>

          <button
            type="button"
            data-testid="serp-bulk-delete-btn"
            onClick={() => onDeleteBulkSnapshots(selectedQueryIds)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Delete Selected Snapshots</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
            title="Clear selection"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
