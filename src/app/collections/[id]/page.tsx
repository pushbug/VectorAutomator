'use client';
import React, { useState, useEffect, useCallback, use, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TopSharedKeywordsBar, type KeywordViewMode } from '@/components/collections/TopSharedKeywordsBar';
import { EditCollectionModal } from '@/components/collections/EditCollectionModal';
import { PortfolioDetail } from '@/components/portfolio/PortfolioDetail';
import { DeleteConfirmDialog } from '@/components/portfolio/DeleteConfirmDialog';
import { 
  ArrowLeft, 
  Layers, 
  Download, 
  DollarSign, 
  Sparkles, 
  Trash2, 
  X, 
  FolderKanban, 
  Calendar,
  Image as ImageIcon,
  Star,
  Pencil,
  Tag
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDisplayDate, getImageUrl } from '@/lib/formatters';

import { parseKeywordsString } from '@/lib/keywordAnalytics';


export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const collectionId = resolvedParams.id;

  const [collection, setCollection] = useState<any | null>(null);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [keywordViewMode, setKeywordViewMode] = useState<KeywordViewMode>('frequency');
  const [itemToRemove, setItemToRemove] = useState<any | null>(null);

  const images = collection?.images || [];

  const filteredImages = useMemo(() => {
    let list = images;
    if (selectedKeyword) {
      const target = selectedKeyword.trim().toLowerCase();
      list = list.filter((img: any) => {
        if (!img.keywords) return false;
        const tokens = parseKeywordsString(img.keywords).map((k) => k.toLowerCase());
        return tokens.includes(target);
      });
    }

    const sorted = [...list];
    if (keywordViewMode === 'downloads') {
      sorted.sort((a: any, b: any) => {
        const dlDiff = (b.totalDownloads || 0) - (a.totalDownloads || 0);
        if (dlDiff !== 0) return dlDiff;
        const revDiff = (b.totalEarnings || 0) - (a.totalEarnings || 0);
        if (revDiff !== 0) return revDiff;
        return (b.code || '').localeCompare(a.code || '');
      });
    } else if (keywordViewMode === 'revenue') {
      sorted.sort((a: any, b: any) => {
        const revDiff = (b.totalEarnings || 0) - (a.totalEarnings || 0);
        if (revDiff !== 0) return revDiff;
        const dlDiff = (b.totalDownloads || 0) - (a.totalDownloads || 0);
        if (dlDiff !== 0) return dlDiff;
        return (b.code || '').localeCompare(a.code || '');
      });
    } else {
      // 'frequency' / default: preserve collection order (or addedAt desc)
      sorted.sort((a: any, b: any) => {
        if (a.addedAt && b.addedAt) {
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        }
        return 0;
      });
    }

    return sorted;
  }, [images, selectedKeyword, keywordViewMode]);

  const fetchCollection = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setCollection(null);
          return;
        }
        throw new Error('Failed to fetch collection');
      }
      const json = await res.json();
      setCollection(json);
    } catch (error) {
      console.error('Error fetching collection:', error);
    } finally {
      setIsLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const handleSetCover = async (imageId: string) => {
    try {
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverId: imageId }),
      });
      if (!res.ok) throw new Error('Failed to set cover image');
      setCollection((prev: any) => (prev ? { ...prev, coverId: imageId } : prev));
    } catch (error) {
      console.error('Error setting cover image:', error);
      alert('Failed to set cover image');
    }
  };

  const handleDeleteCollection = async () => {
    try {
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete collection');
      router.push('/collections');
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert('Failed to delete collection');
    }
  };

  const handleRemoveItem = async () => {
    if (!itemToRemove) return;
    try {
      const res = await fetch(`/api/collections/${collectionId}/items?imageId=${encodeURIComponent(itemToRemove.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove artwork from collection');
      setItemToRemove(null);
      if (selectedImage?.id === itemToRemove.id) {
        setSelectedImage(null);
      }
      await fetchCollection();
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Failed to remove artwork from collection');
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center text-muted text-xs">
        Loading collection details...
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="p-3 rounded-full bg-destructive/10 text-destructive">
          <FolderKanban size={28} />
        </div>
        <h2 className="text-base font-bold text-foreground">Collection Not Found</h2>
        <p className="text-xs text-muted max-w-sm">
          This collection may have been deleted or the link is invalid.
        </p>
        <Link
          href="/collections"
          className="mt-2 flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Collections</span>
        </Link>
      </div>
    );
  }

  const summary = collection.summary || {
    totalImages: images.length,
    totalDownloads: 0,
    totalEarnings: 0,
    avgRpi: 0,
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6 overflow-hidden">
      {/* Top Bar: Navigation & Collection Header */}
      <div className="mb-4 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/collections"
              data-testid="collection-detail-back-btn"
              className="p-2 text-muted hover:text-foreground hover:bg-surface border border-border rounded-xl transition-colors cursor-pointer"
              title="Back to Collections"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  data-testid="collection-detail-title"
                  className="text-2xl font-bold text-foreground tracking-tight"
                >
                  {collection.name}
                </h1>
                <button
                  type="button"
                  data-testid="collection-edit-btn"
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-1.5 text-muted hover:text-foreground hover:bg-surface border border-border rounded-lg transition-colors cursor-pointer"
                  title="Edit collection name and description"
                >
                  <Pencil size={15} />
                </button>
              </div>
              <p
                data-testid="collection-detail-description"
                className="text-xs text-muted mt-0.5"
              >
                {collection.description || 'No description provided.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="collection-detail-delete-btn"
            onClick={() => setIsDeletingCollection(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Delete Collection</span>
          </button>
        </div>

        {/* Collection Metric KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-surface border border-border rounded-xl flex items-center gap-3 shadow-2xs">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Layers size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted uppercase font-semibold">Artworks</span>
              <strong className="text-base font-bold text-foreground font-mono tabular-nums">
                {summary.totalImages}
              </strong>
            </div>
          </div>

          <div className="p-3 bg-surface border border-border rounded-xl flex items-center gap-3 shadow-2xs">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Download size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted uppercase font-semibold">Total Downloads</span>
              <strong className="text-base font-bold text-foreground font-mono tabular-nums">
                {formatNumber(summary.totalDownloads)}
              </strong>
            </div>
          </div>

          <div className="p-3 bg-surface border border-border rounded-xl flex items-center gap-3 shadow-2xs">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <DollarSign size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted uppercase font-semibold">Total Revenue</span>
              <strong className="text-base font-bold text-foreground font-mono tabular-nums">
                {formatCurrency(summary.totalEarnings)}
              </strong>
            </div>
          </div>

          <div className="p-3 bg-surface border border-border rounded-xl flex items-center gap-3 shadow-2xs">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted uppercase font-semibold">Revenue / Image (RPI)</span>
              <strong className="text-base font-bold text-primary font-mono tabular-nums">
                {formatCurrency(summary.avgRpi)}
              </strong>
            </div>
          </div>
        </div>

        {/* Top 15 Shared Keywords Bar */}
        <TopSharedKeywordsBar
          keywords={collection.topKeywords || []}
          totalImages={summary.totalImages}
          selectedKeyword={selectedKeyword}
          onSelectKeyword={(kw) => setSelectedKeyword(kw)}
          viewMode={keywordViewMode}
          onViewModeChange={setKeywordViewMode}
        />
      </div>

      {/* Main Content Area: Artworks Grid and Detail Drawer */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-4 md:gap-6 min-h-0">
        <div className="flex-1 overflow-y-auto pr-1 pb-6 min-h-0">
          {/* Active Tag Filter Indicator */}
          {selectedKeyword && (
            <div
              data-testid="collection-keyword-filter-badge"
              className="mb-3 flex items-center justify-between px-3.5 py-2 bg-primary/10 border border-primary/20 rounded-xl text-xs"
            >
              <div className="flex items-center gap-2">
                <Tag size={13} className="text-primary shrink-0" />
                <span className="text-muted">Filtering artworks containing tag:</span>
                <strong className="text-foreground font-semibold">&quot;{selectedKeyword}&quot;</strong>
                <span className="text-muted font-mono text-[11px]">
                  ({filteredImages.length} of {images.length} artworks)
                </span>
              </div>
              <button
                type="button"
                data-testid="collection-keyword-filter-clear-btn"
                onClick={() => setSelectedKeyword(null)}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                <X size={12} />
                <span>Clear Filter</span>
              </button>
            </div>
          )}

          {images.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-center border-2 border-dashed border-border rounded-2xl p-6 bg-surface/30">
              <ImageIcon size={28} className="text-muted" />
              <h3 className="text-sm font-bold text-foreground">No artworks in this collection</h3>
              <p className="text-xs text-muted max-w-sm">
                Go to the Portfolio page, select artworks via checkboxes, and click &quot;Add to...&quot; to add them here.
              </p>
              <Link
                href="/portfolio"
                className="mt-2 text-xs font-semibold text-primary hover:underline"
              >
                Browse Portfolio &rarr;
              </Link>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-center border-2 border-dashed border-border rounded-2xl p-6 bg-surface/30">
              <Tag size={28} className="text-muted" />
              <h3 className="text-sm font-bold text-foreground">No artworks match tag &quot;{selectedKeyword}&quot;</h3>
              <p className="text-xs text-muted max-w-sm">
                Try selecting a different keyword from the list above or clear the active filter.
              </p>
              <button
                type="button"
                onClick={() => setSelectedKeyword(null)}
                className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Clear Filter &rarr;
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {filteredImages.map((img: any, index: number) => {
                const isCover = collection.coverId ? collection.coverId === img.id : index === 0;

                return (
                  <div
                    key={img.id}
                    data-testid="collection-artwork-item"
                    onClick={() => setSelectedImage(img)}
                    className={`cursor-pointer group relative flex flex-col rounded-xl overflow-hidden border bg-surface transition-all shadow-xs hover:shadow-md ${
                      selectedImage?.id === img.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {/* Top Left: Cover Badge / Set Cover Button */}
                    {isCover ? (
                      <div
                        className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-xs flex items-center gap-1 backdrop-blur-xs"
                        title="Current collection cover image"
                      >
                        <Star size={10} className="fill-white" />
                        <span>Cover</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-testid={`collection-set-cover-btn-${img.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetCover(img.id);
                        }}
                        title="Set this image as collection cover"
                        className="absolute top-2 left-2 z-10 px-2 py-1 bg-surface/90 hover:bg-amber-500 hover:text-white text-muted text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-xs border border-border flex items-center gap-1 backdrop-blur-xs"
                      >
                        <Star size={11} />
                        <span>Set Cover</span>
                      </button>
                    )}

                    {/* Remove Item Button on Top Right */}
                    <button
                      type="button"
                      data-testid={`collection-item-remove-btn-${img.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToRemove(img);
                      }}
                      title="Remove artwork from collection"
                      className="absolute top-2 right-2 z-10 p-1.5 bg-surface/80 hover:bg-destructive hover:text-destructive-foreground text-muted rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-xs border border-border"
                    >
                      <X size={13} />
                    </button>

                    {/* Image Container */}
                    <div className="relative aspect-4/3 sm:aspect-square w-full bg-background overflow-hidden flex items-center justify-center p-2">
                      <Image
                        src={getImageUrl(img.filePath)}
                        alt={img.code || img.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                        className="object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />

                    </div>

                    {/* Bottom Info */}
                    <div className="p-2.5 border-t border-border bg-surface flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-foreground truncate">
                          {img.code ? img.code : `#${img.id.slice(0, 8)}`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono tabular-nums text-muted">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Download size={13} className="text-muted shrink-0" />
                          <span>{formatNumber(img.totalDownloads)}</span>
                        </span>
                        <span className="font-bold text-foreground">
                          {formatCurrency(img.totalEarnings)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Image Detail Panel */}
        {selectedImage && (
          <PortfolioDetail
            image={selectedImage}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </div>

      {/* Edit Collection Modal */}
      <EditCollectionModal
        isOpen={isEditModalOpen}
        collection={collection}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={(updated) => {
          setCollection((prev: any) => (prev ? { ...prev, ...updated } : prev));
          setIsEditModalOpen(false);
        }}
      />

      {/* Delete Collection Confirmation */}
      <DeleteConfirmDialog
        isOpen={isDeletingCollection}
        title="Delete Collection"
        description={`Are you sure you want to delete "${collection.name}"? This will only remove the group. All artworks will remain in your portfolio.`}
        onConfirm={handleDeleteCollection}
        onCancel={() => setIsDeletingCollection(false)}
      />

      {/* Remove Item from Collection Confirmation */}
      <DeleteConfirmDialog
        isOpen={!!itemToRemove}
        title="Remove from Collection"
        description={`Remove artwork "${itemToRemove?.code || itemToRemove?.title}" from this collection? It will remain in your portfolio.`}
        onConfirm={handleRemoveItem}
        onCancel={() => setItemToRemove(null)}
      />
    </div>
  );
}
