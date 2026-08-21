'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { CollectionTable, CollectionSummary } from '@/components/collections/CollectionTable';
import { CreateCollectionModal } from '@/components/collections/CreateCollectionModal';
import { EditCollectionModal } from '@/components/collections/EditCollectionModal';
import { DeleteConfirmDialog } from '@/components/portfolio/DeleteConfirmDialog';
import { PaginationCapsule } from '@/components/common/PaginationCapsule';
import { 
  Plus, 
  X, 
  FolderKanban, 
  Layers, 
  Download, 
  DollarSign, 
  Sparkles,
  LayoutGrid,
  List
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/formatters';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<any | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<{ id: string; name: string } | null>(null);

  // Load persisted view mode from localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('collections_view_mode');
      if (savedMode === 'grid' || savedMode === 'table') {
        setViewMode(savedMode);
      }
    } catch {
      // ignore localStorage error
    }
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    setPage(1);
    try {
      localStorage.setItem('collections_view_mode', mode);
    } catch {
      // ignore localStorage error
    }
  };

  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/collections?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch collections');
      const json = await res.json();
      setCollections(json.data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setIsLoading(false);
    }
  }, [search, sortBy, sortOrder]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Overall totals across all collections
  const totalCollections = collections.length;
  const totalArtworks = collections.reduce((sum, col) => sum + (col.totalImages || 0), 0);
  const totalDownloads = collections.reduce((sum, col) => sum + (col.totalDownloads || 0), 0);
  const totalEarnings = collections.reduce((sum, col) => sum + (col.totalEarnings || 0), 0);

  const itemsPerPage = viewMode === 'grid' ? 12 : 20;
  const totalPages = Math.max(1, Math.ceil(collections.length / itemsPerPage));

  const paginatedCollections = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return collections.slice(start, start + itemsPerPage);
  }, [collections, page, itemsPerPage]);

  const handleTableSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const handleDeleteCollection = async () => {
    if (!deletingTarget) return;
    try {
      const res = await fetch(`/api/collections/${deletingTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete collection');
      setDeletingTarget(null);
      await fetchCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert('Failed to delete collection');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Artwork Collections</h1>
            <p className="text-xs text-muted mt-0.5">
              Cluster portfolios by theme, keyword experiments, or style to track group revenue and keyword ROI.
            </p>
          </div>
          <button
            type="button"
            data-testid="collection-add-btn"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>New Collection</span>
          </button>
        </div>

        {/* Collections Summary KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-surface border border-border rounded-xl flex items-center gap-3 shadow-2xs">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <FolderKanban size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted uppercase font-semibold">Collections</span>
              <strong className="text-base font-bold text-foreground font-sans">
                {totalCollections}
              </strong>
            </div>
          </div>

          <div className="p-3 bg-surface border border-border rounded-xl flex items-center gap-3 shadow-2xs">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
              <Layers size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted uppercase font-semibold">Total Artworks</span>
              <strong className="text-base font-bold text-foreground font-mono tabular-nums">
                {totalArtworks}
              </strong>
            </div>
          </div>

          <div className="p-3 bg-surface border border-border rounded-xl flex items-center gap-3 shadow-2xs">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Download size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted uppercase font-semibold">Group Downloads</span>
              <strong className="text-base font-bold text-foreground font-mono tabular-nums">
                {formatNumber(totalDownloads)}
              </strong>
            </div>
          </div>

          <div className="p-3 bg-surface border border-border rounded-xl flex items-center gap-3 shadow-2xs">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <DollarSign size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted uppercase font-semibold">Group Revenue</span>
              <strong className="text-base font-bold text-foreground font-mono tabular-nums">
                {formatCurrency(totalEarnings)}
              </strong>
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Sort By, and View Toggle */}
        <div className="flex flex-col md:flex-row gap-4 bg-surface p-4 rounded-lg border border-border items-stretch md:items-end">
          {/* Search Input */}
          <div className="w-full md:flex-1">
            <label htmlFor="collection-search" className="block text-sm font-medium text-foreground mb-1">Search</label>
            <div className="relative flex items-center">
              <input
                id="collection-search"
                type="text"
                data-testid="collection-search-input"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by collection name or description..."
                className="w-full pl-3 pr-9 py-2 border border-border rounded-md bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary h-10.5"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 text-muted hover:text-foreground p-1 rounded-full hover:bg-muted/10 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Sort By Select */}
          <div className="w-full sm:w-48 shrink-0">
            <label htmlFor="collection-sort" className="block text-sm font-medium text-foreground mb-1">Sort By</label>
            <select
              id="collection-sort"
              data-testid="collection-sort-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary h-10.5 cursor-pointer"
            >
              <option value="updatedAt">Recently Updated</option>
              <option value="createdAt">Date Created</option>
              <option value="totalEarnings">Top Revenue</option>
              <option value="totalDownloads">Top Downloads</option>
              <option value="totalImages">Most Artworks</option>
              <option value="avgRpi">Highest Avg RPI</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle: Grid Cards vs Table Rows */}
          <div className="w-full sm:w-auto shrink-0">
            <span className="block text-sm font-medium text-foreground mb-1">View</span>
            <div className="flex items-center bg-background border border-border rounded-md p-1 h-10.5 gap-1">
              <button
                type="button"
                data-testid="collection-view-grid-btn"
                onClick={() => handleViewModeChange('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-surface text-primary shadow-2xs font-bold'
                    : 'text-muted hover:text-foreground'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid size={15} />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                data-testid="collection-view-table-btn"
                onClick={() => handleViewModeChange('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-surface text-primary shadow-2xs font-bold'
                    : 'text-muted hover:text-foreground'
                }`}
                title="Table List View"
              >
                <List size={15} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Grid Cards or Table Rows */}
      <div className="flex-1 overflow-y-auto pr-1 pb-2 min-h-0">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-muted text-xs">
            Loading collections...
          </div>
        ) : collections.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center border-2 border-dashed border-border rounded-2xl p-6 bg-surface/30">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <FolderKanban size={28} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">No collections found</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                {search ? `No collections matching "${search}"` : 'Group your artworks into theme collections to track their financial performance.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Create First Collection</span>
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <CollectionTable
            collections={paginatedCollections}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleTableSort}
            onEdit={(c) => setEditingCollection(c)}
            onDelete={(id, name) => setDeletingTarget({ id, name })}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {paginatedCollections.map((col) => (
              <CollectionCard
                key={col.id}
                collection={col}
                onEdit={(c) => setEditingCollection(c)}
                onDelete={(id, name) => setDeletingTarget({ id, name })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!isLoading && collections.length > 0 && totalPages > 1 && (
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <PaginationCapsule
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            prevTestId="collection-pagination-prev-btn"
            nextTestId="collection-pagination-next-btn"
            inputTestId="collection-pagination-page-input"
          />
        </div>
      )}

      {/* Create Modal */}
      <CreateCollectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchCollections();
        }}
      />

      {/* Edit Modal */}
      <EditCollectionModal
        isOpen={!!editingCollection}
        collection={editingCollection}
        onClose={() => setEditingCollection(null)}
        onSuccess={() => {
          setEditingCollection(null);
          fetchCollections();
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmDialog
        isOpen={!!deletingTarget}
        title="Delete Collection"
        description={`Are you sure you want to delete the collection "${deletingTarget?.name}"? The underlying artworks will remain in your portfolio.`}
        onConfirm={handleDeleteCollection}
        onCancel={() => setDeletingTarget(null)}
      />
    </div>
  );
}
