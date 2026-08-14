'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, DollarSign, Sparkles } from 'lucide-react';
import { SalesSummaryCards } from '@/components/sales/SalesSummaryCards';
import { SalesTable, SaleItem } from '@/components/sales/SalesTable';
import { SaleEntryDrawer } from '@/components/sales/SaleEntryDrawer';
import { SmartPasteModal } from '@/components/sales/SmartPasteModal';
import { DeleteConfirmDialog } from '@/components/portfolio/DeleteConfirmDialog';

export default function SalesPage() {
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    totalDownloads: 0,
    topPlatform: '-',
    totalRecords: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);

  // Deletion state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '100',
        platform: platformFilter,
        search,
      });

      const res = await fetch(`/api/sales?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch sales');

      const json = await res.json();
      setSales(json.data || []);
      setSummary({
        totalEarnings: json.summary?.totalEarnings || 0,
        totalDownloads: json.summary?.totalDownloads || 0,
        topPlatform: json.summary?.topPlatform || '-',
        totalRecords: json.meta?.total || 0,
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [platformFilter, search]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sales?id=${encodeURIComponent(deleteTargetId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete sales record');
      }
      setDeleteTargetId(null);
      await fetchSales();
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Failed to delete sale record');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="text-primary" />
            <span>Sales &amp; Earnings Manager</span>
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Track download volume and revenue across all your stock platforms.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-testid="sales-smart-paste-btn"
            onClick={() => setIsPasteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-muted/10 text-foreground border border-border text-sm font-medium rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <Sparkles size={16} className="text-primary" />
            <span>Paste Stock Data</span>
          </button>

          <button
            type="button"
            data-testid="sales-add-sale-btn"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Record Sale</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <SalesSummaryCards
        totalEarnings={summary.totalEarnings}
        totalDownloads={summary.totalDownloads}
        topPlatform={summary.topPlatform}
        totalRecords={summary.totalRecords}
      />

      {/* Sales History Log Table */}
      <SalesTable
        sales={sales}
        isLoading={isLoading}
        onDelete={(id) => setDeleteTargetId(id)}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
        search={search}
        onSearchChange={setSearch}
      />

      {/* Sale Entry Slide-over Drawer */}
      <SaleEntryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchSales}
      />

      {/* Smart Paste Stock Statement Modal */}
      <SmartPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onSuccess={fetchSales}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        itemTitle="this sales record"
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
