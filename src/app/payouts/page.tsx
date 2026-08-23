'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ClipboardPaste, Landmark } from 'lucide-react';
import { PayoutSummaryCards } from '@/components/payouts/PayoutSummaryCards';
import { PayoutTable, PayoutRecord } from '@/components/payouts/PayoutTable';
import { PayoutEntryModal, PayoutFormData } from '@/components/payouts/PayoutEntryModal';
import { PayoutPasteModal } from '@/components/payouts/PayoutPasteModal';
import { PayoutBatchModal } from '@/components/payouts/PayoutBatchModal';
import { DeleteConfirmDialog } from '@/components/portfolio/DeleteConfirmDialog';

export default function PayoutsPage() {
  const [records, setRecords] = useState<PayoutRecord[]>([]);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalStockUsd: 0,
    totalPlatformUsd: 0,
    totalFeeUsd: 0,
    totalNetThb: 0,
    holdingUsd: 0,
    pendingUsd: 0,
    averageRate: 0,
    availableYears: [] as number[],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedStock, setSelectedStock] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('stockWithdrawDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal States
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayoutFormData | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [bundledItems, setBundledItems] = useState<PayoutRecord[]>([]);

  // Deletion States
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPayouts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        stockName: selectedStock,
        taxYear: selectedYear,
        search: searchQuery,
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/payouts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch payouts');
      const data = await res.json();

      setRecords(data.data || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
      if (data.summary) {
        setSummary({
          totalTransactions: data.summary.totalTransactions || 0,
          totalStockUsd: data.summary.totalStockUsd || 0,
          totalPlatformUsd: data.summary.totalPlatformUsd || 0,
          totalFeeUsd: data.summary.totalFeeUsd || 0,
          totalNetThb: data.summary.totalNetThb || 0,
          holdingUsd: data.summary.holdingUsd || 0,
          pendingUsd: data.summary.pendingUsd || 0,
          averageRate: data.summary.averageRate || 0,
          availableYears: data.summary.availableYears || [],
        });
      }
    } catch (err) {
      console.error('Error fetching payouts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedStock, selectedYear, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleSortChange = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleCreateOrUpdate = async (formData: PayoutFormData) => {
    if (formData.id) {
      // Update existing
      const res = await fetch(`/api/payouts/${formData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to update transaction');
      }
    } else {
      // Create new
      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create transaction');
      }
    }
    fetchPayouts();
  };

  const handleConfirmSingleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/payouts/${deleteTargetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete transaction');
      setDeleteTargetId(null);
      fetchPayouts();
    } catch (err) {
      console.error('Error deleting payout:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (!bulkDeleteIds || bulkDeleteIds.length === 0) return;
    try {
      setIsDeleting(true);
      const res = await fetch('/api/payouts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          ids: bulkDeleteIds,
        }),
      });
      if (!res.ok) throw new Error('Failed to delete transactions');
      setBulkDeleteIds(null);
      fetchPayouts();
    } catch (err) {
      console.error('Error in bulk delete:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = (record: PayoutRecord) => {
    setEditingRecord({
      id: record.id,
      stockWithdrawDate: record.stockWithdrawDate,
      stockName: record.stockName,
      stockAmountUsd: record.stockAmountUsd,
      platformDate: record.platformDate || undefined,
      platformName: record.platformName,
      platformAmountUsd: record.platformAmountUsd != null ? record.platformAmountUsd : undefined,
      bankReceivedDate: record.bankReceivedDate || undefined,
      bankName: record.bankName || undefined,
      exchangeRate: record.exchangeRate != null ? record.exchangeRate : undefined,
      netIncomeThb: record.netIncomeThb != null ? record.netIncomeThb : undefined,
      notes: record.notes || undefined,
    });
    setIsEntryModalOpen(true);
  };

  const handleOpenBundleModal = (selected: PayoutRecord[]) => {
    setBundledItems(selected);
    setIsBundleModalOpen(true);
  };

  return (
    <div className="p-6 max-w-370 mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Landmark size={26} className="text-primary" />
            Payouts & Withdrawals
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPasteModalOpen(true)}
            data-testid="payout-paste-btn"
            className="px-4 py-2 text-sm font-medium bg-surface hover:bg-surface-hover text-foreground border border-border rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <ClipboardPaste size={16} className="text-primary" />
            Smart Paste
          </button>
          <button
            onClick={() => {
              setEditingRecord(null);
              setIsEntryModalOpen(true);
            }}
            data-testid="payout-add-btn"
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Log Payout
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <PayoutSummaryCards
        totalNetThb={summary.totalNetThb}
        holdingUsd={summary.holdingUsd}
        totalFeeUsd={summary.totalFeeUsd}
        totalTransactions={summary.totalTransactions}
      />

      {/* Main Table */}
      <PayoutTable
        records={records}
        total={total}
        page={page}
        totalPages={totalPages}
        limit={50}
        onPageChange={(p) => setPage(p)}
        selectedYear={selectedYear}
        onYearChange={(y) => {
          setSelectedYear(y);
          setPage(1);
        }}
        availableYears={summary.availableYears}
        selectedStock={selectedStock}
        onStockChange={(st) => {
          setSelectedStock(st);
          setPage(1);
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        onEdit={handleOpenEdit}
        onDelete={(id) => setDeleteTargetId(id)}
        onBulkDelete={(ids) => setBulkDeleteIds(ids)}
        onOpenBundleModal={handleOpenBundleModal}
      />

      {/* Modals */}
      <PayoutEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => {
          setIsEntryModalOpen(false);
          setEditingRecord(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingRecord}
        mode={editingRecord ? 'edit' : 'create'}
      />

      <PayoutPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onSuccess={() => fetchPayouts()}
      />

      <PayoutBatchModal
        isOpen={isBundleModalOpen}
        onClose={() => {
          setIsBundleModalOpen(false);
          setBundledItems([]);
        }}
        onSuccess={() => fetchPayouts()}
        selectedItems={bundledItems.map((b) => ({
          id: b.id,
          stockName: b.stockName,
          stockWithdrawDate: b.stockWithdrawDate,
          stockAmountUsd: b.stockAmountUsd,
          platformAmountUsd: b.platformAmountUsd,
        }))}
      />

      {/* Single Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={!!deleteTargetId}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Payout Transaction"
        description="Are you sure you want to delete this payout transaction record? This action cannot be undone."
      />

      {/* Bulk Delete Confirmation */}
      <DeleteConfirmDialog
        isOpen={!!bulkDeleteIds}
        onCancel={() => setBulkDeleteIds(null)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Multiple Transactions"
        description={`Are you sure you want to delete ${bulkDeleteIds?.length || 0} selected payout records? This action cannot be undone.`}
      />
    </div>
  );
}
