'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Trash2, DollarSign, Download, PlusCircle, Edit3 } from 'lucide-react';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

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
}

const PLATFORMS_DEFAULT = ['Shutterstock', 'Adobe Stock', 'Vecteezy'];

const PLATFORM_THEMES: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  Shutterstock: { dot: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  'Adobe Stock': { dot: 'bg-blue-500', text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  Vecteezy: { dot: 'bg-amber-500', text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
};

export function PortfolioDetail({
  image,
  onDelete,
  onImageUpdated,
  onLogSale,
  onEdit,
  onClose,
}: PortfolioDetailProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [idInputVal, setIdInputVal] = useState('');
  const [isSavingId, setIsSavingId] = useState(false);

  if (!image) return null;

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(image.id);
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error('Failed to delete image:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getPlatformId = (p: string) => {
    if (p === 'Shutterstock') return image.ssId;
    if (p === 'Adobe Stock') return image.asId;
    if (p === 'Vecteezy') return image.vzId;
    return null;
  };

  const handleSaveId = async (p: string) => {
    setIsSavingId(true);
    try {
      const payload: any = { id: image.id };
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
        if (onImageUpdated) {
          onImageUpdated({
            ...image,
            ...updated,
          });
        } else {
          if (p === 'Shutterstock') image.ssId = cleaned;
          if (p === 'Adobe Stock') image.asId = cleaned;
          if (p === 'Vecteezy') image.vzId = cleaned;
        }
        setEditingPlatform(null);
      }
    } catch (err) {
      console.error('Failed to update platform ID:', err);
    } finally {
      setIsSavingId(false);
    }
  };

  const imageUrl = `/api/image?path=${encodeURIComponent(image.filePath)}`;
  const totalEarnings = image.totalEarnings || 0;

  // Build platform entries list
  const platformsToDisplay = Array.from(
    new Set([
      ...PLATFORMS_DEFAULT,
      ...Object.keys(image.platformBreakdown || {}),
    ])
  );

  return (
    <div
      data-testid="portfolio-detail-panel"
      className="w-full md:w-96 lg:w-md xl:w-120 shrink-0 bg-surface border border-border rounded-2xl shadow-sm p-5 h-full overflow-y-auto flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-200"
    >
      <div>
        <div className="flex justify-between items-center mb-3 gap-2">
          {image.code ? (
            <div
              data-testid="portfolio-detail-code"
              className="inline-block px-2.5 py-0.5 rounded bg-primary/10 text-primary font-mono font-bold text-xs border border-primary/20"
            >
              {image.code}
            </div>
          ) : <div />}
          <div className="flex items-center gap-1.5">
            {onEdit && (
              <button
                type="button"
                data-testid="portfolio-detail-edit-btn"
                onClick={() => onEdit(image)}
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

        <div className="relative w-full aspect-video bg-muted rounded-md mb-4 overflow-hidden shrink-0">
          <Image
            src={imageUrl}
            alt={image.title}
            fill
            className="object-cover"
            unoptimized // Avoid CPU spike from aggressive local resizing
          />
        </div>

        <div className="flex flex-col gap-4 text-sm text-foreground">
          <div>
            <h3 className="font-semibold text-muted mb-1">Upload Date</h3>
            <p data-testid="portfolio-detail-upload-date" className="text-foreground font-medium">
              {image.createdAt
                ? new Date(image.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Unknown'}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-muted mb-1">Title</h3>
            <p data-testid="portfolio-detail-title" className="whitespace-pre-wrap leading-relaxed text-foreground wrap-break-word">
              {image.title}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-muted mb-1">Keywords</h3>
            <p data-testid="portfolio-detail-keywords" className="whitespace-pre-wrap leading-relaxed text-foreground wrap-break-word">{image.keywords}</p>
          </div>

          {image.category && (
            <div>
              <h3 className="font-semibold text-muted mb-1">Category</h3>
              <p data-testid="portfolio-detail-category" className="whitespace-pre-wrap leading-relaxed text-foreground font-medium wrap-break-word">{image.category}</p>
            </div>
          )}

          {image.tags && (
            <div>
              <h3 className="font-semibold text-muted mb-1">Tags</h3>
              <p data-testid="portfolio-detail-tags" className="whitespace-pre-wrap leading-relaxed text-foreground font-medium wrap-break-word">{image.tags}</p>
            </div>
          )}

          {image.notes && (
            <div>
              <h3 className="font-semibold text-muted mb-1">Notes</h3>
              <p data-testid="portfolio-detail-notes" className="whitespace-pre-wrap leading-relaxed text-foreground bg-background/50 p-2.5 rounded-lg border border-border/60 text-xs wrap-break-word">{image.notes}</p>
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
                  onClick={() => onLogSale(image)}
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
                  <span>{image.totalDownloads.toLocaleString()}</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase font-medium">Revenue</p>
                <p className="text-base font-bold text-emerald-500 font-mono tabular-nums flex items-center gap-1 mt-0.5">
                  <DollarSign size={14} className="text-emerald-500 shrink-0" />
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

                  if (image.platformBreakdown && image.platformBreakdown[p]) {
                    pDownloads = image.platformBreakdown[p].downloads;
                    pEarnings = image.platformBreakdown[p].earnings;
                  } else if (p === 'Shutterstock') {
                    pDownloads = image.ssDownloads || 0;
                  } else if (p === 'Adobe Stock') {
                    pDownloads = image.asDownloads || 0;
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
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${theme.bg} ${theme.text} border ${theme.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} shrink-0`} />
                          {p}
                        </span>

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
                        <span className="text-muted flex items-center gap-1">
                          <Download size={12} className="text-muted shrink-0" />
                          <span>{pDownloads.toLocaleString()} dl</span>
                        </span>
                        <span className="font-semibold text-emerald-500 flex items-center gap-0.5">
                          <DollarSign size={12} className="text-emerald-500 shrink-0" />
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
        imageCode={image.code ? image.code : `#${image.id.slice(0, 8)}`}
        imageSrc={imageUrl}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
