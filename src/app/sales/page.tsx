'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Sparkles } from 'lucide-react';

import { SalesSummaryCards } from '@/components/sales/SalesSummaryCards';
import { SalesTable, SaleItem } from '@/components/sales/SalesTable';
import { SaleEntryDrawer } from '@/components/sales/SaleEntryDrawer';
import { SmartPasteModal } from '@/components/sales/SmartPasteModal';
import { BulkDateModal } from '@/components/sales/BulkDateModal';
import { DeleteConfirmDialog } from '@/components/portfolio/DeleteConfirmDialog';
import { PortfolioDetail } from '@/components/portfolio/PortfolioDetail';

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);

  // Single deletion state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk operations state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDateModalOpen, setIsBulkDateModalOpen] = useState(false);
  const [isBulkUpdatingDate, setIsBulkUpdatingDate] = useState(false);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100',
        platform: platformFilter,
        search,
        sortBy,
        sortOrder,
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/sales?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch sales');

      const json = await res.json();
      setSales(json.data || []);
      setTotalPages(json.meta?.totalPages || 1);
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
  }, [platformFilter, search, startDate, endDate, sortBy, sortOrder, page]);

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
      setSelectedIds((prev) => prev.filter((id) => id !== deleteTargetId));
      await fetchSales();
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Failed to delete sale record');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteIds || bulkDeleteIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/sales/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: bulkDeleteIds }),
      });
      if (!res.ok) {
        throw new Error('Failed to delete selected sales records');
      }
      setBulkDeleteIds(null);
      setSelectedIds([]);
      await fetchSales();
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('Failed to delete selected records');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDateConfirm = async (targetDate: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdatingDate(true);
    try {
      const res = await fetch('/api/sales/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, date: targetDate }),
      });
      if (!res.ok) {
        throw new Error('Failed to update sales date');
      }
      setIsBulkDateModalOpen(false);
      setSelectedIds([]);
      await fetchSales();
    } catch (error: any) {
      console.error('Error updating dates:', error);
      throw error;
    } finally {
      setIsBulkUpdatingDate(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Sales &amp; Earnings Manager
          </h1>
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
        onPlatformFilterChange={(p) => {
          setPlatformFilter(p);
          setPage(1);
        }}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
          setPage(1);
        }}
        search={search}
        onSearchChange={(s) => {
          setSearch(s);
          setPage(1);
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
          setPage(1);
        }}
        onSelectImage={(img) => setSelectedImage(img)}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        onBulkDelete={(ids) => setBulkDeleteIds(ids)}
        onBulkChangeDate={() => setIsBulkDateModalOpen(true)}
      />

      {/* Portfolio Artwork Slide-over Drawer Overlay */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 cursor-pointer"
            onClick={() => setSelectedImage(null)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md md:max-w-lg lg:max-w-xl h-full shadow-2xl flex flex-col">
              <PortfolioDetail
                image={selectedImage}
                className="w-full h-full rounded-l-2xl rounded-r-none border-y-0 border-r-0 border-l"
                onClose={() => setSelectedImage(null)}
                onLogSale={() => {
                  setSelectedImage(null);
                  setIsDrawerOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

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

      {/* Single Delete Confirmation Modal */}
      <DeleteConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        itemTitle="this sales record"
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmDialog
        isOpen={Boolean(bulkDeleteIds && bulkDeleteIds.length > 0)}
        itemTitle={`${bulkDeleteIds?.length || 0} selected sales records`}
        isDeleting={isBulkDeleting}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteIds(null)}
      />

      {/* Bulk Date Change Modal */}
      <BulkDateModal
        isOpen={isBulkDateModalOpen}
        selectedCount={selectedIds.length}
        onClose={() => setIsBulkDateModalOpen(false)}
        onConfirm={handleBulkDateConfirm}
        isUpdating={isBulkUpdatingDate}
      />
    </div>
  );
}
