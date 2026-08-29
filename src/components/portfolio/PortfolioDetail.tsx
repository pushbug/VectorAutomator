'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Trash2, DollarSign, Download, PlusCircle, Edit3, Copy, Check, ImageOff, Image as ImageIcon, TrendingUp } from 'lucide-react';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { PortfolioAnalyticsTab } from './PortfolioAnalyticsTab';
import { PLATFORMS_DEFAULT, PLATFORM_THEMES } from '@/lib/platforms';

import { copyToClipboard } from '@/lib/clipboard';
import { calculatePlatformBreakdown, formatCurrency, formatNumber, getImageUrl } from '@/lib/formatters';


interface PortfolioImage {
  id: string;
  code?: string | null;
  year?: number | null;
  month?: number | null;
  seqNumber?: number | null;
  title: string;
  keywords: string;
  category?: string | null;
  tags?: string | null;
  notes?: string | null;
  status: string;
  filePath: string;
  ssId?: string | null;
  asId?: string | null;
  vzId?: string | null;
  ssDownloads: number;
  asDownloads: number;
  totalDownloads: number;
  totalEarnings?: number;
  platformBreakdown?: Record<string, { downloads: number; earnings: number }>;
  createdAt: string;
}

interface PortfolioDetailProps {
  image: PortfolioImage | null;
  onUpdate?: (id: string, ssDownloads: number, asDownloads: number) => Promise<void>;
  onImageUpdated?: (updatedImage: PortfolioImage) => void;
  onDelete?: (id: string) => Promise<void>;
  onLogSale?: (image: PortfolioImage) => void;
  onEdit?: (image: PortfolioImage) => void;
  onClose: () => void;
  benchmarks?: {
    top100AvgMonthlyEarnings?: number;
    top100AvgMonthlyDownloads?: number;
    portfolioAvgMonthlyEarnings?: number;
    portfolioAvgMonthlyDownloads?: number;
  };
  className?: string;
}

export function PortfolioDetail({
  image,
  onDelete,
  onImageUpdated,
  onLogSale,
  onEdit,
  onClose,
  benchmarks,
  className,
}: PortfolioDetailProps) {


  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [idInputVal, setIdInputVal] = useState('');
  const [isSavingId, setIsSavingId] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [enrichedData, setEnrichedData] = useState<PortfolioImage | null>(null);
  const [hasImageError, setHasImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'analytics'>('details');


  const handleCopy = async (text: string, field: string) => {
    if (!text) return;
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };


  React.useEffect(() => {
    setEnrichedData(null);
    setHasImageError(false);
    if (!image?.id) return;

    if (
      (image.totalEarnings !== undefined && image.platformBreakdown !== undefined) ||
      ((image as any).stats && Array.isArray((image as any).stats) && (image as any).stats.length > 0)
    ) {
      return;
    }

    let isMounted = true;
    fetch(`/api/portfolio?search=${encodeURIComponent(image.code || image.id)}&limit=1`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.data && json.data.length > 0) {
          const found = json.data.find((item: any) => item.id === image.id);
          if (found) {
            setEnrichedData(found);
          }
        }
      })
      .catch((err) => console.error('Failed to enrich image details:', err));

    return () => {
      isMounted = false;
    };
  }, [image?.id, image?.code, image?.totalEarnings, image?.platformBreakdown]);

  if (!image) return null;

  const activeImage = enrichedData ? { ...image, ...enrichedData } : image;

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(activeImage.id);
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error('Failed to delete image:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getPlatformId = (p: string) => {
    if (p === 'Shutterstock') return activeImage.ssId;
    if (p === 'Adobe Stock') return activeImage.asId;
    if (p === 'Vecteezy') return activeImage.vzId;
    return null;
  };

  const handleSaveId = async (p: string) => {
    setIsSavingId(true);
    try {
      const payload: any = { id: activeImage.id };
      const cleaned = idInputVal.trim() || null;
      if (p === 'Shutterstock') payload.ssId = cleaned;
      if (p === 'Adobe Stock') payload.asId = cleaned;
      if (p === 'Vecteezy') payload.vzId = cleaned;

      const res = await fetch('/api/portfolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setEnrichedData(updated);
        if (onImageUpdated) {
          onImageUpdated({
            ...activeImage,
            ...updated,
          });
        }
        setEditingPlatform(null);
      }
    } catch (err) {
      console.error('Failed to update platform ID:', err);
    } finally {
      setIsSavingId(false);
    }
  };

  const imageUrl = getImageUrl(
    activeImage.filePath,
    (activeImage as any).updatedAt || activeImage.createdAt
  );




  const stats = (activeImage as any).stats || [];
  let computedTotalEarnings = activeImage.totalEarnings;
  let computedPlatformBreakdown = activeImage.platformBreakdown;

  if ((computedTotalEarnings === undefined || !computedPlatformBreakdown) && stats.length > 0) {
    const calculated = calculatePlatformBreakdown(stats);
    if (computedTotalEarnings === undefined) computedTotalEarnings = calculated.totalEarnings;
    if (!computedPlatformBreakdown) computedPlatformBreakdown = calculated.platformBreakdown;
  }

  const totalEarnings = computedTotalEarnings || 0;

  // Build platform entries list
  const platformsToDisplay = Array.from(
    new Set([
      ...PLATFORMS_DEFAULT,
      ...Object.keys(computedPlatformBreakdown || {}),
    ])
  );


  return (
    <div
      data-testid="portfolio-detail-panel"
      className={`bg-surface border border-border shadow-sm p-5 h-full overflow-y-auto flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-200 ${
        className || 'w-full md:w-96 lg:w-md xl:w-120 shrink-0 rounded-2xl'
      }`}
    >

      <div>
        <div className="flex justify-between items-center mb-3 gap-2">
          {activeImage.code ? (
            <div className="flex items-center gap-1.5">
              <div
                data-testid="portfolio-detail-code"
                className="inline-block px-2.5 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold text-xs border border-primary/20"
              >
                {activeImage.code}
              </div>
              <button
                type="button"
                data-testid="portfolio-copy-code-btn"
                onClick={() => handleCopy(activeImage.code!, 'code')}
                title={copiedField === 'code' ? 'Copied!' : 'Copy Code'}
                className="p-0.5 rounded text-muted hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                {copiedField === 'code' ? (
                  <Check size={13} className="text-emerald-500" />
                ) : (
                  <Copy size={13} className="text-muted hover:text-foreground" />
                )}
              </button>
            </div>
          ) : activeImage.id ? (
            <div className="flex items-center gap-1.5">
              <div
                data-testid="portfolio-detail-code"
                className="inline-block px-2.5 py-0.5 rounded bg-muted/40 text-muted font-mono font-bold text-xs border border-border"
              >
                #{activeImage.id.slice(0, 8)}
              </div>
              <button
                type="button"
                data-testid="portfolio-copy-code-btn"
                onClick={() => handleCopy(activeImage.id, 'code')}
                title={copiedField === 'code' ? 'Copied!' : 'Copy ID'}
                className="p-0.5 rounded text-muted hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                {copiedField === 'code' ? (
                  <Check size={13} className="text-emerald-500" />
                ) : (
                  <Copy size={13} className="text-muted hover:text-foreground" />
                )}
              </button>
            </div>
          ) : <div />}
          <div className="flex items-center gap-1.5">
            {onEdit && (
              <button
                type="button"
                data-testid="portfolio-detail-edit-btn"
                onClick={() => onEdit(activeImage)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted hover:text-foreground bg-background/50 hover:bg-background border border-border/80 rounded-md transition-colors cursor-pointer"
                title="Edit Image"
              >
                <Edit3 size={13} className="text-primary" />
                <span>Edit</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-foreground p-1 rounded hover:bg-background cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-background rounded-lg border border-border mb-4">
          <button
            type="button"
            data-testid="portfolio-detail-tab-info"
            onClick={() => setActiveTab('details')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'bg-surface text-foreground shadow-2xs font-semibold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <ImageIcon size={14} />
            <span>Details &amp; Info</span>
          </button>
          <button
            type="button"
            data-testid="portfolio-detail-tab-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-surface text-primary shadow-2xs font-semibold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <TrendingUp size={14} />
            <span>Sales &amp; Analytics</span>
          </button>
        </div>

        {activeTab === 'details' ? (
          <div>
            {!imageUrl || hasImageError ? (

          <div 
            data-testid="portfolio-detail-image-placeholder"
            className="relative w-full aspect-video bg-muted/40 rounded-md mb-4 overflow-hidden shrink-0 border border-border flex flex-col items-center justify-center gap-2 p-4 text-center"
          >
            <ImageOff size={32} className="text-muted/60" />
            <div>
              <p className="text-xs font-semibold text-foreground">No Image File Linked</p>
              <p className="text-[11px] text-muted mt-0.5">Click Edit to upload or sync from public/uploads</p>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(activeImage)}
                className="mt-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Upload Image
              </button>
            )}
          </div>
        ) : (
          <div className="relative w-full aspect-video bg-muted rounded-md mb-4 overflow-hidden shrink-0">
            <Image
              src={imageUrl}
              alt={activeImage.title}
              fill
              priority
              className="object-cover"
              unoptimized // Avoid CPU spike from aggressive local resizing
              onError={() => setHasImageError(true)}
            />
          </div>
        )}

        <div className="flex flex-col gap-4 text-sm text-foreground">
          <div>
            <h3 className="font-semibold text-muted mb-1">Upload Date</h3>
            <p data-testid="portfolio-detail-upload-date" className="text-foreground font-medium">
              {activeImage.createdAt
                ? new Date(activeImage.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Unknown'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="font-semibold text-muted">Title</h3>
              <button
                type="button"
                data-testid="portfolio-copy-title-btn"
                onClick={() => handleCopy(activeImage.title, 'title')}
                title={copiedField === 'title' ? 'Copied!' : 'Copy Title'}
                className="p-0.5 rounded text-muted hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                {copiedField === 'title' ? (
                  <Check size={13} className="text-emerald-500" />
                ) : (
                  <Copy size={13} className="text-muted hover:text-foreground" />
                )}
              </button>
            </div>
            <p data-testid="portfolio-detail-title" className="whitespace-pre-wrap leading-relaxed text-foreground wrap-break-word">
              {activeImage.title}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="font-semibold text-muted">Keywords</h3>
              <button
                type="button"
                data-testid="portfolio-copy-keywords-btn"
                onClick={() => handleCopy(activeImage.keywords, 'keywords')}
                title={copiedField === 'keywords' ? 'Copied!' : 'Copy Keywords'}
                className="p-0.5 rounded text-muted hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                {copiedField === 'keywords' ? (
                  <Check size={13} className="text-emerald-500" />
                ) : (
                  <Copy size={13} className="text-muted hover:text-foreground" />
                )}
              </button>
            </div>
            <p data-testid="portfolio-detail-keywords" className="whitespace-pre-wrap leading-relaxed text-foreground wrap-break-word">{activeImage.keywords}</p>
          </div>

          {activeImage.category && (
            <div>
              <h3 className="font-semibold text-muted mb-1">Category</h3>
              <p data-testid="portfolio-detail-category" className="whitespace-pre-wrap leading-relaxed text-foreground font-medium wrap-break-word">{activeImage.category}</p>
            </div>
          )}

          {activeImage.tags && (
            <div>
              <h3 className="font-semibold text-muted mb-1">Tags</h3>
              <p data-testid="portfolio-detail-tags" className="whitespace-pre-wrap leading-relaxed text-foreground font-medium wrap-break-word">{activeImage.tags}</p>
            </div>
          )}

          {activeImage.notes && (
            <div>
              <h3 className="font-semibold text-muted mb-1">Notes</h3>
              <p data-testid="portfolio-detail-notes" className="whitespace-pre-wrap leading-relaxed text-foreground bg-background/50 p-2.5 rounded-lg border border-border/60 text-xs wrap-break-word">{activeImage.notes}</p>
            </div>
          )}

          {/* Performance & Platform Stats */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-muted">Performance &amp; Earnings</h3>
              {onLogSale && (
                <button
                  type="button"
                  data-testid="portfolio-detail-log-sale-btn"
                  onClick={() => onLogSale(activeImage)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  <PlusCircle size={14} />
                  <span>Log Sale</span>
                </button>
              )}
            </div>

            {/* Overview Summary Box */}
            <div className="grid grid-cols-2 gap-2 mb-4 bg-background p-3 rounded-lg border border-border">
              <div>
                <p className="text-[11px] text-muted uppercase font-medium">Downloads</p>
                <p className="text-base font-bold text-foreground font-mono tabular-nums flex items-center gap-1 mt-0.5">
                  <Download size={14} className="text-muted shrink-0" />
                  <span>{activeImage.totalDownloads.toLocaleString()}</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase font-medium">Revenue</p>
                <p className="text-base font-bold text-foreground font-mono tabular-nums flex items-center gap-1 mt-0.5">
                  <DollarSign size={14} className="text-foreground shrink-0" />
                  <span>${totalEarnings.toFixed(2)}</span>
                </p>
              </div>
            </div>

            {/* Breakdown by Platform */}
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-muted">Platform Breakdown</p>
              <div className="space-y-2">
                {platformsToDisplay.map((p) => {
                  let pDownloads = 0;
                  let pEarnings = 0;
                  if (computedPlatformBreakdown && computedPlatformBreakdown[p]) {
                    pDownloads = computedPlatformBreakdown[p].downloads;
                    pEarnings = computedPlatformBreakdown[p].earnings;
                  } else if (p === 'Shutterstock') {
                    pDownloads = activeImage.ssDownloads || 0;
                  } else if (p === 'Adobe Stock') {
                    pDownloads = activeImage.asDownloads || 0;
                  }

                  const currentId = getPlatformId(p);
                  const isEditing = editingPlatform === p;
                  const theme = PLATFORM_THEMES[p] || {
                    dot: 'bg-muted',
                    text: 'text-foreground',
                    bg: 'bg-muted/20',
                    border: 'border-border',
                  };

                  return (
                    <div
                      key={p}
                      data-testid={`portfolio-detail-platform-card-${p.toLowerCase().replace(/\s+/g, '-')}`}
                      className="p-2.5 rounded-lg bg-background/60 border border-border space-y-1.5 transition-colors"
                    >
                      {/* Top row: Platform Badge + Asset ID */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${theme.bg} ${theme.text} border ${theme.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} shrink-0`} />
                            {p}
                          </span>
                          {currentId && (
                            <button
                              type="button"
                              data-testid={`portfolio-copy-platform-id-${p.toLowerCase().replace(/\s+/g, '-')}-btn`}
                              onClick={() => handleCopy(currentId, `platform-id-${p}`)}
                              title={copiedField === `platform-id-${p}` ? 'Copied ID!' : `Copy ${p} ID`}
                              className="p-0.5 rounded text-muted hover:text-foreground transition-colors cursor-pointer inline-flex items-center justify-center"
                            >
                              {copiedField === `platform-id-${p}` ? (
                                <Check size={13} className="text-emerald-500" />
                              ) : (
                                <Copy size={13} className="text-muted hover:text-foreground" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Asset ID display / editor */}
                        <div className="flex items-center gap-1 text-xs">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                data-testid={`portfolio-detail-edit-id-input-${p.toLowerCase().replace(/\s+/g, '-')}`}
                                value={idInputVal}
                                onChange={(e) => setIdInputVal(e.target.value)}
                                placeholder="Asset ID"
                                className="w-24 px-1.5 py-0.5 bg-surface border border-primary rounded text-xs font-mono text-foreground focus:outline-hidden"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveId(p);
                                  if (e.key === 'Escape') setEditingPlatform(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveId(p)}
                                disabled={isSavingId}
                                className="px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-[11px] font-medium cursor-pointer"
                              >
                                {isSavingId ? '...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPlatform(null)}
                                className="px-1 py-0.5 text-muted hover:text-foreground text-[11px] cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              data-testid={`portfolio-detail-platform-id-${p.toLowerCase().replace(/\s+/g, '-')}`}
                              onClick={() => {
                                setEditingPlatform(p);
                                setIdInputVal(currentId || '');
                              }}
                              className="group flex items-center gap-1 text-muted hover:text-foreground cursor-pointer transition-colors"
                              title="Click to edit Asset ID"
                            >
                              <span className="font-mono text-[11px]">
                                {currentId ? `#${currentId}` : '+ Add ID'}
                              </span>
                              <Edit3 size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom row: Downloads & Earnings */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs font-mono tabular-nums">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Download size={12} className="text-muted shrink-0" />
                          <span>{pDownloads.toLocaleString()}</span>
                        </span>
                        <span className="font-bold text-foreground flex items-center gap-0.5">
                          <DollarSign size={12} className="text-foreground shrink-0" />
                          <span>${pEarnings.toFixed(2)}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <PortfolioAnalyticsTab
          image={activeImage}
          onLogSale={onLogSale}
          top100AvgMonthlyEarnings={benchmarks?.top100AvgMonthlyEarnings}
          top100AvgMonthlyDownloads={benchmarks?.top100AvgMonthlyDownloads}
          portfolioAvgMonthlyEarnings={benchmarks?.portfolioAvgMonthlyEarnings}
          portfolioAvgMonthlyDownloads={benchmarks?.portfolioAvgMonthlyDownloads}
        />
      )}
    </div>




      {/* Delete Action at Bottom */}
      {onDelete && (
        <div className="border-t border-border pt-4 mt-6">
          <button
            type="button"
            data-testid="portfolio-delete-btn"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-destructive border border-destructive/20 hover:bg-destructive/10 rounded-md text-sm font-medium transition-colors cursor-pointer"
          >
            <Trash2 size={16} />
            <span>Delete Image</span>
          </button>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        imageCode={activeImage.code ? activeImage.code : `#${activeImage.id.slice(0, 8)}`}
        imageSrc={imageUrl}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />

    </div>
  );
}
