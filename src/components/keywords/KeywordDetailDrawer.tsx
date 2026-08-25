'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { X, Tag, Download, DollarSign, ExternalLink, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { formatCurrency, formatNumber, formatTableDate, getImageUrl } from '@/lib/formatters';


import { calculateCoOccurringKeywords } from '@/lib/keywordAnalytics';
import { copyToClipboard } from '@/lib/clipboard';

interface KeywordDetailDrawerProps {
  keyword: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectImage?: (image: any) => void;
}

export function KeywordDetailDrawer({
  keyword,
  isOpen,
  onClose,
  onSelectImage,
}: KeywordDetailDrawerProps) {
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecipeCopied, setIsRecipeCopied] = useState(false);

  const fetchLinkedArtworks = useCallback(async () => {
    if (!keyword) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search: keyword,
        searchField: 'exactKeyword',
        limit: '100',
        sortBy: 'totalDownloads',
        sortOrder: 'desc',
      });
      const res = await fetch(`/api/portfolio?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch linked artworks');
      const json = await res.json();
      setImages(json.data || []);
    } catch (err: any) {
      console.error('Error fetching keyword artworks:', err);
      setError(err.message || 'Failed to load artworks');
    } finally {
      setIsLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    if (isOpen && keyword) {
      fetchLinkedArtworks();
    } else {
      setImages([]);
    }
  }, [isOpen, keyword, fetchLinkedArtworks]);

  // Compute winning co-occurring keyword combinations
  const winningTags = useMemo(() => {
    if (!keyword || images.length === 0) return [];
    return calculateCoOccurringKeywords(images, keyword, 8);
  }, [images, keyword]);

  const handleCopyRecipe = async () => {
    if (!keyword) return;
    const allRecipeTags = [keyword, ...winningTags.map((t) => t.keyword)];
    const success = await copyToClipboard(allRecipeTags.join(', '));
    if (success) {
      setIsRecipeCopied(true);
      setTimeout(() => setIsRecipeCopied(false), 2000);
    }
  };

  if (!isOpen || !keyword) return null;

  return (
    <div
      data-testid="keyword-detail-drawer"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 cursor-pointer"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md md:max-w-lg lg:max-w-xl h-full bg-surface border-l border-border shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Tag size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground truncate">
                    #{keyword}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted/20 text-muted font-medium shrink-0">
                    {images.length} {images.length === 1 ? 'artwork' : 'artworks'}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Portfolio vector artworks containing this keyword
                </p>
              </div>
            </div>

            <button
              type="button"
              data-testid="keyword-detail-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-muted/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {/* Winning Tag Recipe Card */}
            {!isLoading && winningTags.length > 0 && (
              <div
                data-testid="keyword-drawer-winning-tags"
                className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                    <Sparkles size={14} />
                    <span>Winning Tag Combinations (สูตรคำทำเงินร่วม)</span>
                  </div>
                  <button
                    type="button"
                    data-testid="keyword-drawer-copy-recipe-btn"
                    onClick={handleCopyRecipe}
                    className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-[11px] font-semibold rounded-md hover:bg-primary/90 transition-all cursor-pointer shadow-2xs"
                  >
                    {isRecipeCopied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{isRecipeCopied ? 'Copied Recipe!' : 'Copy Tag Recipe'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-muted leading-relaxed">
                  คำที่ถูกใช้คู่กับ <strong className="text-foreground">#{keyword}</strong> แล้วสร้างยอดขายและอัตราการแปลงสูงสุด:
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {winningTags.map((t) => (
                    <span
                      key={t.keyword}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-background border border-border rounded-md text-xs text-foreground font-mono"
                    >
                      <span>#{t.keyword}</span>
                      <span className="text-[10px] text-muted">({t.count}x)</span>
                      {t.totalEarnings > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          ${t.totalEarnings}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-muted gap-3">
                <Loader2 size={28} className="animate-spin text-primary" />
                <p className="text-sm">Loading linked vector artworks...</p>
              </div>
            )}

            {!isLoading && error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {!isLoading && !error && images.length === 0 && (
              <div className="text-center py-16 text-muted">
                <Tag size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium text-foreground">No artworks found</p>
                <p className="text-xs mt-1">No vector assets currently have the #{keyword} keyword.</p>
              </div>
            )}

            {!isLoading &&
              images.map((img) => {
                const totalEarnings = img.stats && img.stats.length > 0
                  ? img.stats.reduce((sum: number, s: any) => sum + (s.earnings || 0), 0)
                  : img.totalEarnings || 0;

                return (
                  <div
                    key={img.id}
                    className="p-3 bg-surface hover:bg-muted/5 border border-border rounded-xl flex items-center justify-between gap-3.5 transition-all hover:border-primary/40 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-border/80 shrink-0 relative bg-muted/20 flex items-center justify-center">
                        <Image
                          src={getImageUrl(img.filePath)}
                          alt={img.title || 'Vector preview'}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />

                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {img.code && (
                            <span className="text-xs font-mono font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                              {img.code}
                            </span>
                          )}
                          <p className="text-xs text-muted">
                            {formatTableDate(img.createdAt)}
                          </p>
                        </div>
                        <h4 className="text-sm font-medium text-foreground truncate" title={img.title}>
                          {img.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-foreground font-mono tabular-nums flex items-center justify-end gap-1">
                          <DollarSign size={12} className="text-emerald-500" />
                          {formatCurrency(totalEarnings).replace('$', '')}
                        </p>
                        <p className="text-xs text-muted font-mono tabular-nums flex items-center justify-end gap-1">
                          <Download size={11} className="text-blue-500" />
                          {formatNumber(img.totalDownloads ?? 0)}
                        </p>
                      </div>

                      {onSelectImage && (
                        <button
                          type="button"
                          onClick={() => onSelectImage(img)}
                          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-muted/10 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <ExternalLink size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
