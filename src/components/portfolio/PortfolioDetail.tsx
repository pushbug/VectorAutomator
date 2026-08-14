'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Trash2, DollarSign, Download, PlusCircle } from 'lucide-react';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface PortfolioImage {
  id: string;
  code?: string | null;
  year?: number | null;
  month?: number | null;
  seqNumber?: number | null;
  title: string;
  keywords: string;
  status: string;
  filePath: string;
  ssId: string | null;
  asId: string | null;
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
  onDelete?: (id: string) => Promise<void>;
  onLogSale?: (image: PortfolioImage) => void;
  onClose: () => void;
}

const PLATFORMS_DEFAULT = ['Shutterstock', 'Adobe Stock', 'Freepik', 'Vecteezy'];

export function PortfolioDetail({
  image,
  onDelete,
  onLogSale,
  onClose,
}: PortfolioDetailProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      className="w-full md:w-80 bg-surface border-l border-border p-4 h-full overflow-y-auto flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="flex-1 min-w-0">
            {image.code && (
              <div
                data-testid="portfolio-detail-code"
                className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-semibold text-xs mb-1.5 border border-primary/20"
              >
                {image.code}
              </div>
            )}
            <h2 className="text-lg font-bold text-foreground truncate">{image.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 rounded hover:bg-background cursor-pointer transition-colors"
          >
            ✕
          </button>
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
            <h3 className="font-semibold text-muted mb-1">Keywords</h3>
            <p className="whitespace-pre-wrap leading-relaxed">{image.keywords}</p>
          </div>

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
              <div className="space-y-1.5 text-xs">
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

                  return (
                    <div
                      key={p}
                      className="flex items-center justify-between p-2 rounded-md bg-background/50 border border-border/50"
                    >
                      <span className="font-medium text-foreground">{p}</span>
                      <div className="flex items-center gap-3 font-mono tabular-nums">
                        <span className="text-muted">{pDownloads} dl</span>
                        <span className="font-semibold text-emerald-500">
                          ${pEarnings.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {onLogSale && (
              <button
                type="button"
                onClick={() => onLogSale(image)}
                className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle size={15} />
                <span>Record New Sale for this Image</span>
              </button>
            )}
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
        itemTitle={image.code ? `${image.code} — ${image.title}` : image.title}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
