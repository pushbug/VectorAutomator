'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { SerpSummaryCards } from '@/components/serp/SerpSummaryCards';
import { SerpTable, SerpRankedItem } from '@/components/serp/SerpTable';
import { SmartSerpPasteModal } from '@/components/serp/SmartSerpPasteModal';
import { ArtworkSerpDrawer } from '@/components/serp/ArtworkSerpDrawer';
import { FullSerpModal } from '@/components/serp/FullSerpModal';
import { DeleteConfirmDialog } from '@/components/portfolio/DeleteConfirmDialog';

export default function SerpPage() {
  const [items, setItems] = useState<SerpRankedItem[]>([]);
  const [summary, setSummary] = useState({
    totalKeywords: 0,
    page1Artworks: 0,
    top10Artworks: 0,
    bestRank: '-',
  });
  const [trackedKeywords, setTrackedKeywords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & State
  const [keywordFilter, setKeywordFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Drawer States
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [selectedFullSerpQueryId, setSelectedFullSerpQueryId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ queryId: string; keyword: string; date: string } | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSerpData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        view: 'artworks',
        page: page.toString(),
        limit: '100',
        sortBy,
        sortOrder,
      });

      if (keywordFilter) params.append('keyword', keywordFilter);
      if (search) params.append('search', search);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/serp?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch SERP rankings');

      const json = await res.json();
      setItems(json.items || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setSummary(
        json.summary || {
          totalKeywords: 0,
          page1Artworks: 0,
          top10Artworks: 0,
          bestRank: '-',
        }
      );
      setTrackedKeywords(json.trackedKeywords || []);
    } catch (error) {
      console.error('Error fetching SERP data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, keywordFilter, search, startDate, endDate, sortBy, sortOrder]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget && (!bulkDeleteIds || bulkDeleteIds.length === 0)) return;
    setIsDeleting(true);
    try {
      const targetQueryIds = deleteTarget ? [deleteTarget.queryId] : bulkDeleteIds || [];
      const res = await fetch(`/api/serp?ids=${encodeURIComponent(targetQueryIds.join(','))}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete ranking snapshot(s)');
      setDeleteTarget(null);
      setBulkDeleteIds(null);
      await fetchSerpData();
    } catch (err) {
      console.error('Error deleting ranking snapshot:', err);
      alert('Failed to delete ranking snapshot');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchSerpData();
    const handleFocus = () => {
      fetchSerpData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchSerpData]);

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 max-w-370 mx-auto w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary/10 text-primary inline-flex">
              <TrendingUp size={24} />
            </span>
            Asset Rankings
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            data-testid="serp-paste-btn"
            onClick={() => setIsPasteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 cursor-pointer"
          >
            <Sparkles size={16} />
            Paste Rank Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <SerpSummaryCards summary={summary} />

      {/* Main Table with Integrated Toolbar & Bulk Actions */}
      <SerpTable
        items={items}
        isLoading={isLoading}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
          setPage(1);
        }}
        keywordFilter={keywordFilter}
        onKeywordFilterChange={(kw) => {
          setKeywordFilter(kw);
          setPage(1);
        }}
        trackedKeywords={trackedKeywords}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
          setPage(1);
        }}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
        onSelectArtwork={(imageId) => setSelectedArtworkId(imageId)}
        onViewFullSerp={(queryId) => setSelectedFullSerpQueryId(queryId)}
        onDeleteSnapshot={(queryId, keyword, date) => setDeleteTarget({ queryId, keyword, date })}
        onDeleteBulkSnapshots={(ids) => setBulkDeleteIds(ids)}
      />

      {/* Modals & Drawers */}
      <SmartSerpPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onSuccess={() => {
          setIsPasteModalOpen(false);
          fetchSerpData();
        }}
      />

      <ArtworkSerpDrawer
        imageId={selectedArtworkId}
        onClose={() => setSelectedArtworkId(null)}
      />

      <FullSerpModal
        queryId={selectedFullSerpQueryId}
        onClose={() => setSelectedFullSerpQueryId(null)}
      />

      {/* Single / Bulk Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={Boolean(deleteTarget) || Boolean(bulkDeleteIds && bulkDeleteIds.length > 0)}
        title={bulkDeleteIds ? 'ยืนยันการลบหลายรายการ (Delete Selected Snapshots)' : 'ยืนยันการลบประวัติอันดับ (Delete Snapshot)'}
        description={
          bulkDeleteIds
            ? `คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการค้นหาจำนวน ${bulkDeleteIds.length} รายการที่เลือกออกจากระบบอย่างถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้`
            : `คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการค้นหาคำว่า "${deleteTarget?.keyword}" ของวันที่ ${deleteTarget?.date ? new Date(deleteTarget.date).toLocaleDateString() : ''} ออกจากระบบ? การกระทำนี้ไม่สามารถย้อนกลับได้`
        }
        itemTitle={deleteTarget?.keyword ? `Keyword: ${deleteTarget.keyword}` : bulkDeleteIds ? `${bulkDeleteIds.length} Snapshot Queries` : ''}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setBulkDeleteIds(null);
        }}
      />
    </div>
  );
}
