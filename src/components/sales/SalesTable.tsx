'use client';

import React from 'react';
import Image from 'next/image';
import { Trash2, DollarSign, Download, Calendar } from 'lucide-react';

export interface SaleItem {
  id: string;
  imageId: string;
  platform: string;
  downloads: number;
  earnings: number;
  date: string;
  image?: {
    id: string;
    code?: string | null;
    title: string;
    filePath: string;
  };
}

interface SalesTableProps {
  sales: SaleItem[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  platformFilter: string;
  onPlatformFilterChange: (platform: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  Shutterstock: 'bg-red-500/10 text-red-500 border-red-500/20',
  'Adobe Stock': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Freepik: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  Vecteezy: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

export function SalesTable({
  sales,
  isLoading,
  onDelete,
  platformFilter,
  onPlatformFilterChange,
  search,
  onSearchChange,
}: SalesTableProps) {
  const platforms = ['all', 'Shutterstock', 'Adobe Stock', 'Freepik', 'Vecteezy'];

  return (
    <div className="bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
      {/* Controls Bar */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface">
        {/* Platform Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {platforms.map((p) => {
            const isSelected = platformFilter === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPlatformFilterChange(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'bg-background hover:bg-surface-hover text-muted hover:text-foreground border border-border'
                }`}
              >
                {p === 'all' ? 'All Platforms' : p}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by code or title..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-hidden focus:border-primary"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table data-testid="sales-table" className="w-full text-left text-sm">
          <thead className="bg-background/50 border-b border-border text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Image</th>
              <th className="px-4 py-3 font-semibold">Platform</th>
              <th className="px-4 py-3 font-semibold text-right">Downloads</th>
              <th className="px-4 py-3 font-semibold text-right">Earnings</th>
              <th className="px-4 py-3 font-semibold text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  Loading sales records...
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  No sales recorded yet. Click &quot;Record Sale&quot; to log your first earnings!
                </td>
              </tr>
            ) : (
              sales.map((sale) => {
                const badgeStyle =
                  PLATFORM_COLORS[sale.platform] || 'bg-muted/10 text-muted border-border';
                const formattedDate = sale.date
                  ? new Date(sale.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '-';

                return (
                  <tr key={sale.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-muted shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-50 max-w-xs">
                        {sale.image?.filePath && (
                          <div className="relative w-9 h-9 rounded bg-muted overflow-hidden shrink-0">
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
                          {sale.image?.code && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/15 text-primary border border-primary/20 mr-1.5">
                              {sale.image.code}
                            </span>
                          )}
                          <span className="text-xs font-medium text-foreground truncate block">
                            {sale.image?.title || 'Unknown Image'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle}`}
                      >
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
                      <span className="font-mono tabular-nums text-xs font-bold text-emerald-500">
                        ${sale.earnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        data-testid="sales-row-delete-btn"
                        onClick={() => onDelete(sale.id)}
                        className="p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
