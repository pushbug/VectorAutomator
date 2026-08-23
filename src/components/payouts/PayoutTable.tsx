'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Trash2, 
  Edit3, 
  MoreVertical,
  ArrowUpDown, 
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { formatCurrency, formatBaht, formatTableDate } from '@/lib/formatters';
import { STOCK_AGENCIES, getStockBadgeColor } from '@/lib/payoutCalculations';

export interface PayoutRecord {
  id: string;
  stockWithdrawDate: string;
  stockName: string;
  stockAmountUsd: number;
  platformDate?: string | null;
  platformName: string;
  platformAmountUsd?: number | null;
  feeUsd?: number | null;
  bankReceivedDate?: string | null;
  bankName?: string | null;
  exchangeRate?: number | null;
  netIncomeThb?: number | null;
  status: string;
  taxYear?: number | null;
  leadTimeDays?: number | null;
  notes?: string | null;
}

interface PayoutTableProps {
  records: PayoutRecord[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  selectedYear: string;
  onYearChange: (year: string) => void;
  availableYears: number[];
  selectedStock: string;
  onStockChange: (stock: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (column: string) => void;
  onEdit: (record: PayoutRecord) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onOpenBundleModal: (selected: PayoutRecord[]) => void;
}

const STOCK_OPTIONS = ['all', ...STOCK_AGENCIES];

export function PayoutTable({
  records,
  total,
  page,
  totalPages,
  onPageChange,
  selectedYear,
  onYearChange,
  availableYears,
  selectedStock,
  onStockChange,
  searchQuery,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  onEdit,
  onDelete,
  onBulkDelete,
  onOpenBundleModal,
}: PayoutTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  React.useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === records.length && records.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map((r) => r.id)));
    }
  };

  const selectedRecords = records.filter((r) => selectedIds.has(r.id));
  const isAllSelected = records.length > 0 && selectedIds.size === records.length;

  return (
    <div className="space-y-4" data-testid="payout-table">
      {/* Year Segmented Switcher & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Year Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" data-testid="payout-year-filter">
          <button
            onClick={() => onYearChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedYear === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-surface hover:bg-surface-hover text-muted border border-border'
            }`}
          >
            All Years
          </button>
          {availableYears.map((yr) => (
            <button
              key={yr}
              onClick={() => onYearChange(String(yr))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap font-mono transition-colors ${
                selectedYear === String(yr)
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-surface hover:bg-surface-hover text-muted border border-border'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Stock Filter */}
          <div data-testid="payout-stock-filter">
            <select
              value={selectedStock}
              onChange={(e) => onStockChange(e.target.value)}
              className="px-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary"
            >
              {STOCK_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Stock Agencies' : s}
                </option>
              ))}
            </select>
          </div>

          {/* Search Field */}
          <div className="relative min-w-45">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search stock, bank, note..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-hidden focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Multi-Selection Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">
              {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenBundleModal(selectedRecords)}
              data-testid="payout-batch-withdraw-btn"
              className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Building2 size={14} />
              Bundle Withdraw to Bank
            </button>
            <button
              onClick={() => {
                onBulkDelete(Array.from(selectedIds));
                setSelectedIds(new Set());
              }}
              className="px-3 py-1.5 text-xs font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={14} />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-border bg-muted/10 text-xs font-semibold text-muted uppercase tracking-wider select-none">
              <tr>
                <th className="py-3 px-3 w-8 text-center align-middle">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => onSortChange('stockWithdrawDate')}
                  className="py-3 px-3 cursor-pointer hover:text-foreground whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col leading-tight">
                      <span>Withdraw</span>
                      <span className="text-[10px] text-muted/70 font-normal normal-case">Date</span>
                    </div>
                    <ArrowUpDown size={12} className="shrink-0 text-muted" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <div className="flex flex-col leading-tight">
                    <span>Stock</span>
                    <span className="text-[10px] text-muted/70 font-normal normal-case">Agency</span>
                  </div>
                </th>
                <th
                  onClick={() => onSortChange('stockAmountUsd')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-foreground whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="flex flex-col items-end leading-tight">
                      <span>Stock</span>
                      <span className="text-[10px] text-muted/70 font-normal normal-case">USD ($)</span>
                    </div>
                    <ArrowUpDown size={12} className="shrink-0 text-muted" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <div className="flex flex-col leading-tight">
                    <span>Platform</span>
                    <span className="text-[10px] text-muted/70 font-normal normal-case">Wallet</span>
                  </div>
                </th>
                <th
                  onClick={() => onSortChange('platformAmountUsd')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-foreground whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="flex flex-col items-end leading-tight">
                      <span>Wallet</span>
                      <span className="text-[10px] text-muted/70 font-normal normal-case">USD ($)</span>
                    </div>
                    <ArrowUpDown size={12} className="shrink-0 text-muted" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap">
                  <div className="flex flex-col items-end leading-tight">
                    <span>Fee</span>
                    <span className="text-[10px] text-muted/70 font-normal normal-case">(USD $)</span>
                  </div>
                </th>
                <th
                  onClick={() => onSortChange('exchangeRate')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-foreground whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="flex flex-col items-end leading-tight">
                      <span>Rate</span>
                      <span className="text-[10px] text-muted/70 font-normal normal-case">(฿ / $)</span>
                    </div>
                    <ArrowUpDown size={12} className="shrink-0 text-muted" />
                  </div>
                </th>
                <th
                  onClick={() => onSortChange('netIncomeThb')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-foreground whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="flex flex-col items-end leading-tight">
                      <span>Net Income</span>
                      <span className="text-[10px] text-emerald-500 font-normal normal-case">THB (฿)</span>
                    </div>
                    <ArrowUpDown size={12} className="shrink-0 text-muted" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <div className="flex flex-col leading-tight">
                    <span>Thai Bank</span>
                    <span className="text-[10px] text-muted/70 font-normal normal-case">& Received Date</span>
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">
                  <div className="flex flex-col leading-tight">
                    <span>Notes</span>
                    <span className="text-[10px] text-muted/70 font-normal normal-case">Remarks</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap">
                  <div className="flex flex-col items-end leading-tight">
                    <span>Actions</span>
                    <span className="text-[10px] text-muted/70 font-normal normal-case">Edit / Delete</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-muted">
                    <Coins size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No payout transactions found</p>
                    <p className="text-xs text-muted mt-1">
                      Log a new payout or paste records from Google Sheet to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const isSelected = selectedIds.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-surface-hover/60 transition-colors ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(r.id)}
                          className="rounded text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-foreground whitespace-nowrap">
                        {formatTableDate(r.stockWithdrawDate)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getStockBadgeColor(
                            r.stockName
                          )}`}
                        >
                          {r.stockName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                        {formatCurrency(r.stockAmountUsd)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{r.platformName}</span>
                          {r.platformDate && (
                            <span className="text-[10px] text-muted font-mono">
                              {formatTableDate(r.platformDate)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-foreground whitespace-nowrap">
                        {r.platformAmountUsd != null ? formatCurrency(r.platformAmountUsd) : <span className="text-muted">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        {r.feeUsd != null && r.feeUsd > 0 ? (
                          <span className="text-red-500 font-medium">-${r.feeUsd.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-foreground whitespace-nowrap">
                        {r.exchangeRate != null ? r.exchangeRate.toFixed(2) : <span className="text-muted">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-500 whitespace-nowrap">
                        {r.netIncomeThb != null ? formatBaht(r.netIncomeThb) : <span className="text-muted">-</span>}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {r.bankReceivedDate ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{r.bankName || 'Thai Bank'}</span>
                            <span className="text-[10px] text-muted font-mono">
                              {formatTableDate(r.bankReceivedDate)}
                              {r.leadTimeDays != null && ` (${r.leadTimeDays}d)`}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-500 font-medium">
                            <Clock size={11} />
                            Holding
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-foreground max-w-64 truncate" title={r.notes || ''}>
                        {r.notes || <span className="text-muted">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap relative">
                        <button
                          type="button"
                          data-testid={`payout-action-menu-btn-${r.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === r.id ? null : r.id);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            activeMenuId === r.id
                              ? 'bg-surface-hover text-foreground'
                              : 'text-muted hover:text-foreground hover:bg-surface-hover'
                          }`}
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeMenuId === r.id && (
                          <div
                            data-testid={`payout-action-dropdown-${r.id}`}
                            className="absolute right-3 top-10 z-30 w-36 bg-surface border border-border rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150 flex flex-col text-left divide-y divide-border/50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              data-testid={`payout-edit-btn-${r.id}`}
                              onClick={() => {
                                setActiveMenuId(null);
                                onEdit(r);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                            >
                              <Edit3 size={14} className="text-primary shrink-0" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              data-testid={`payout-delete-btn-${r.id}`}
                              onClick={() => {
                                setActiveMenuId(null);
                                onDelete(r.id);
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
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted">
          <span>
            Showing {records.length} of {total} transactions
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-border text-foreground hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-border text-foreground hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
