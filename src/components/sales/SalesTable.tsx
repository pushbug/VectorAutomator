'use client';

import React from 'react';
import Image from 'next/image';
import { Trash2, Download, Calendar, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Eye, X } from 'lucide-react';
import { DateRangePicker } from '../portfolio/DateRangePicker';
import { SALES_FILTER_PLATFORMS } from '@/lib/platforms';
import { formatCurrency, formatNumber, formatTableDate } from '@/lib/formatters';

export interface SaleItem {
  id: string;
  imageId?: string | null;
  platformAssetId?: string | null;
  platform: string;
  downloads: number;
  earnings: number;
  date: string;
  image?: {
    id: string;
    code?: string | null;
    year?: number | null;
    month?: number | null;
    seqNumber?: number | null;
    title: string;
    keywords?: string;
    category?: string | null;
    tags?: string | null;
    notes?: string | null;
    status?: string;
    filePath: string;
    ssId?: string | null;
    asId?: string | null;
    vzId?: string | null;
    ssDownloads?: number;
    asDownloads?: number;
    totalDownloads?: number;
    totalEarnings?: number;
    createdAt?: string;
  } | null;
}

interface SalesTableProps {
  sales: SaleItem[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  platformFilter: string;
  onPlatformFilterChange: (platform: string) => void;
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onSelectImage?: (image: any) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkChangeDate?: (ids: string[]) => void;
}

export function SalesTable({
  sales,
  isLoading,
  onDelete,
  platformFilter,
  onPlatformFilterChange,
  startDate,
  endDate,
  onDateRangeChange,
  search,
  onSearchChange,
  sortBy = 'date',
  sortOrder = 'desc',
  onSortChange,
  onSelectImage,
  page = 1,
  totalPages = 1,
  onPageChange,
  selectedIds: controlledSelectedIds,
  onSelectedIdsChange,
  onBulkDelete,
  onBulkChangeDate,
}: SalesTableProps) {
  const [internalSelectedIds, setInternalSelectedIds] = React.useState<string[]>([]);
  const selectedIds = controlledSelectedIds ?? internalSelectedIds;

  const setSelectedIds = React.useCallback(
    (newIds: string[]) => {
      if (onSelectedIdsChange) {
        onSelectedIdsChange(newIds);
      } else {
        setInternalSelectedIds(newIds);
      }
    },
    [onSelectedIdsChange]
  );

  // Auto-reset selection on page, platform filter, or search change to prevent cross-page state leakage
  React.useEffect(() => {
    setSelectedIds([]);
  }, [page, platformFilter, search, setSelectedIds]);

  const [hoveredThumb, setHoveredThumb] = React.useState<{
    src: string;
    title: string;
    code?: string;
    x: number;
    y: number;
  } | null>(null);
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);
  const [inputPage, setInputPage] = React.useState(page.toString());

  React.useEffect(() => {
    setInputPage(page.toString());
  }, [page]);

  React.useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handlePageCommit = (valStr: string) => {
    if (!totalPages || !onPageChange) return;
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(totalPages, parsed));
      setInputPage(clamped.toString());
      if (clamped !== page) {
        onPageChange(clamped);
      }
    } else {
      setInputPage(page.toString());
    }
  };

  const platforms = SALES_FILTER_PLATFORMS;

  const handleHeaderClick = (column: string) => {
    if (!onSortChange) return;
    if (sortBy === column) {
      onSortChange(column, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      const defaultOrder = column === 'image' || column === 'platform' ? 'asc' : 'desc';
      onSortChange(column, defaultOrder);
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

  const isAllPageSelected = sales.length > 0 && sales.every((s) => selectedIds.includes(s.id));
  const isSomePageSelected = sales.some((s) => selectedIds.includes(s.id)) && !isAllPageSelected;

  const handleToggleSelectAll = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(sales.map((s) => s.id));
      setSelectedIds(selectedIds.filter((id) => !pageIds.has(id)));
    } else {
      const newSelected = Array.from(new Set([...selectedIds, ...sales.map((s) => s.id)]));
      setSelectedIds(newSelected);
    }
  };

  const handleToggleRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden relative">
      {/* Controls Bar */}
      <div className="p-4 border-b border-border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-surface">
        {/* Left controls: Date Range Filter & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {onDateRangeChange && (
            <div className="w-full sm:w-72">
              <DateRangePicker
                startDate={startDate || ''}
                endDate={endDate || ''}
                onChange={({ startDate: s, endDate: e }) => onDateRangeChange(s, e)}
                showLabel={false}
                testIdPrefix="sales-date"
              />
            </div>
          )}

          {/* Search input */}
          <div className="w-full sm:w-64 relative flex items-center">
            <input
              type="text"
              placeholder="Search by code or title..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-hidden focus:border-primary h-10"
            />
            {search && (
              <button
                type="button"
                data-testid="sales-search-clear-btn"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 text-muted hover:text-foreground p-0.5 rounded-full hover:bg-muted/10 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Right controls: Platform Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 shrink-0">
          {platforms.map((p) => {
            const isSelected = platformFilter === p;
            return (
              <button
                key={p}
                type="button"
                data-testid={`sales-platform-filter-${p}`}
                onClick={() => onPlatformFilterChange(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? p === 'unlinked'
                      ? 'bg-amber-500 text-white font-semibold shadow-xs'
                      : 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : p === 'unlinked'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
                    : 'bg-background hover:bg-surface-hover text-muted hover:text-foreground border border-border'
                }`}
              >
                {p === 'all' ? 'All Platforms' : p === 'unlinked' ? 'Unlinked' : p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table data-testid="sales-table" className="w-full text-left text-sm">
          <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold w-10 text-center">
                <input
                  type="checkbox"
                  data-testid="sales-select-all-checkbox"
                  checked={isAllPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomePageSelected;
                  }}
                  onChange={handleToggleSelectAll}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer accent-primary"
                  aria-label="Select all on this page"
                />
              </th>
              <th className="px-4 py-3 font-semibold">
                <button
                  type="button"
                  data-testid="sales-sort-date-btn"
                  onClick={() => handleHeaderClick('date')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                >
                  <span>Date</span>
                  {renderSortIcon('date')}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">
                <button
                  type="button"
                  data-testid="sales-sort-image-btn"
                  onClick={() => handleHeaderClick('image')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                >
                  <span>Image</span>
                  {renderSortIcon('image')}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold">
                <button
                  type="button"
                  data-testid="sales-sort-platform-btn"
                  onClick={() => handleHeaderClick('platform')}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                >
                  <span>Platform</span>
                  {renderSortIcon('platform')}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold text-right">
                <button
                  type="button"
                  data-testid="sales-sort-downloads-btn"
                  onClick={() => handleHeaderClick('downloads')}
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer ml-auto"
                >
                  <span>Downloads</span>
                  {renderSortIcon('downloads')}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold text-right">
                <button
                  type="button"
                  data-testid="sales-sort-earnings-btn"
                  onClick={() => handleHeaderClick('earnings')}
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer ml-auto"
                >
                  <span>Earnings</span>
                  {renderSortIcon('earnings')}
                </button>
              </th>
              <th className="px-4 py-3 font-semibold text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  Loading sales records...
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  No sales recorded yet. Click &quot;Record Sale&quot; to log your first earnings!
                </td>
              </tr>
            ) : (
              sales.map((sale) => {
                const isSelected = selectedIds.includes(sale.id);
                return (
                  <tr
                    key={sale.id}
                    className={`hover:bg-surface-hover/50 transition-colors ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        data-testid={`sales-row-checkbox-${sale.id}`}
                        checked={isSelected}
                        onChange={() => handleToggleRow(sale.id)}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer accent-primary"
                        aria-label={`Select sale ${sale.id}`}
                      />
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-xs text-foreground font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-muted shrink-0" />
                        <span>{formatTableDate(sale.date)}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {sale.image ? (
                        <div
                          data-testid={`sales-table-artwork-btn-${sale.id}`}
                          onClick={() => onSelectImage?.(sale.image)}
                          className={`flex items-center gap-3 min-w-50 max-w-xs ${
                            onSelectImage
                              ? 'cursor-pointer group p-1 -m-1 rounded-lg hover:bg-muted/10 transition-colors'
                              : ''
                          }`}
                        >
                          {sale.image.filePath && (
                            <div
                              className="relative w-9 h-9 rounded bg-muted overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-primary/40 transition-all cursor-zoom-in"
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredThumb({
                                  src: `/api/image?path=${encodeURIComponent(sale.image!.filePath)}`,
                                  title: sale.image!.title,
                                  code: sale.image!.code || undefined,
                                  x: rect.right + 12,
                                  y: Math.min(
                                    Math.max(16, rect.top + rect.height / 2 - 140),
                                    typeof window !== 'undefined' ? window.innerHeight - 300 : 16
                                  ),
                                });
                              }}
                              onMouseLeave={() => setHoveredThumb(null)}
                            >
                              <Image
                                src={`/api/image?path=${encodeURIComponent(sale.image.filePath)}`}
                                alt={sale.image.title || 'Image'}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            {sale.image.code && (
                              <span className="font-mono font-bold text-xs text-foreground mr-1.5">
                                {sale.image.code}
                              </span>
                            )}
                            <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate block">
                              {sale.image.title || 'Unknown Image'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 min-w-50 max-w-xs">
                          <div className="w-9 h-9 rounded-lg bg-surface border border-border border-dashed flex items-center justify-center text-muted shrink-0 text-[10px] font-mono">
                            N/A
                          </div>
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-xs text-muted mr-1.5">
                              {sale.platformAssetId ? `#${sale.platformAssetId}` : 'Unlinked'}
                            </span>
                            <span className="text-xs text-muted truncate block">
                              Unlinked Artwork
                            </span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-medium text-foreground">
                        {sale.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-mono tabular-nums text-xs font-medium text-foreground flex items-center justify-end gap-1">
                        <Download size={13} className="text-muted" />
                        {sale.downloads.toLocaleString()}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-mono tabular-nums text-xs font-bold text-foreground">
                        {formatCurrency(sale.earnings)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap relative">
                      <button
                        type="button"
                        data-testid={`sales-row-menu-btn-${sale.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === sale.id ? null : sale.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          activeMenuId === sale.id
                            ? 'bg-surface-hover text-foreground'
                            : 'text-muted hover:text-foreground hover:bg-surface-hover'
                        }`}
                        title="Options"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeMenuId === sale.id && (
                        <div
                          data-testid={`sales-row-menu-dropdown-${sale.id}`}
                          className="absolute right-4 top-11 z-30 w-36 bg-surface border border-border rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150 flex flex-col text-left divide-y divide-border/50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            data-testid={`sales-row-preview-btn-${sale.id}`}
                            onClick={() => {
                              setActiveMenuId(null);
                              if (sale.image) {
                                onSelectImage?.(sale.image);
                              }
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                          >
                            <Eye size={14} className="text-primary shrink-0" />
                            <span>Preview</span>
                          </button>

                          <button
                            type="button"
                            data-testid={`sales-row-delete-btn-${sale.id}`}
                            onClick={() => {
                              setActiveMenuId(null);
                              onDelete(sale.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} className="shrink-0" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
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
        <div className="p-4 border-t border-border flex justify-center items-center gap-3 bg-surface">
          <div className="inline-flex items-center gap-2.5 bg-surface/90 backdrop-blur-xs border border-border px-3.5 py-1.5 rounded-xl shadow-xs">
            <button
              type="button"
              data-testid="sales-pagination-prev-btn"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 bg-background border border-border rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-muted/10 transition-colors cursor-pointer"
            >
              Prev
            </button>
            <div className="flex items-center gap-1.5 text-xs text-foreground font-mono font-medium">
              <span className="text-muted">Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                data-testid="sales-pagination-page-input"
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                onBlur={() => handlePageCommit(inputPage)}
                className="w-12 h-6 px-1 text-center font-mono font-bold text-xs bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-muted">of {totalPages}</span>
            </div>
            <button
              type="button"
              data-testid="sales-pagination-next-btn"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-2.5 py-1 bg-background border border-border rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-muted/10 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Floating Enlarged Image Hover Preview */}
      {hoveredThumb && (
        <div
          data-testid="sales-image-hover-preview"
          className="fixed z-50 pointer-events-none bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-2.5 w-64 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-2"
          style={{
            left: `${hoveredThumb.x}px`,
            top: `${hoveredThumb.y}px`,
          }}
        >
          <div className="relative w-full aspect-square rounded-lg bg-muted overflow-hidden border border-border/50">
            <Image
              src={hoveredThumb.src}
              alt={hoveredThumb.title}
              fill
              className="object-contain bg-black/5"
              unoptimized
            />
          </div>
          <div className="px-1 py-0.5">
            {hoveredThumb.code && (
              <span className="font-mono font-bold text-xs text-primary mr-1.5">
                {hoveredThumb.code}
              </span>
            )}
            <span className="text-xs text-foreground font-medium line-clamp-2">
              {hoveredThumb.title}
            </span>
          </div>
        </div>
      )}

      {/* Floating Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div
          data-testid="sales-bulk-action-bar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface/95 backdrop-blur-md border border-border px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-150"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground pr-2 border-r border-border">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Selected {selectedIds.length} {selectedIds.length === 1 ? 'item' : 'items'}</span>
          </div>

          {onBulkChangeDate && (
            <button
              type="button"
              data-testid="sales-bulk-date-btn"
              onClick={() => onBulkChangeDate(selectedIds)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-background hover:bg-surface-hover text-foreground border border-border rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Calendar size={14} className="text-primary" />
              <span>Change Date</span>
            </button>
          )}

          {onBulkDelete && (
            <button
              type="button"
              data-testid="sales-bulk-delete-btn"
              onClick={() => onBulkDelete(selectedIds)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Delete Selected</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-xs text-muted hover:text-foreground transition-colors px-2 py-1 cursor-pointer"
          >
            Deselect
          </button>
        </div>
      )}
    </div>
  );
}
