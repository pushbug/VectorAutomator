'use client';
import React, { useState, useMemo } from 'react';
import { Tag, Copy, Check, Sparkles, Layers, Download, DollarSign } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';
import { formatCurrency, formatNumber } from '@/lib/formatters';

export interface SharedKeyword {
  keyword: string;
  frequency: number;
  percentage: number;
  totalDownloads: number;
  totalEarnings: number;
}

export type KeywordViewMode = 'frequency' | 'downloads' | 'revenue';

interface TopSharedKeywordsBarProps {
  keywords: SharedKeyword[];
  totalImages: number;
  selectedKeyword?: string | null;
  onSelectKeyword?: (keyword: string | null) => void;
}

export function TopSharedKeywordsBar({
  keywords,
  totalImages,
  selectedKeyword,
  onSelectKeyword,
}: TopSharedKeywordsBarProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<KeywordViewMode>('frequency');

  const sortedKeywords = useMemo(() => {
    const list = [...keywords];
    if (viewMode === 'downloads') {
      list.sort((a, b) => {
        if (b.totalDownloads !== a.totalDownloads) return b.totalDownloads - a.totalDownloads;
        if (b.totalEarnings !== a.totalEarnings) return b.totalEarnings - a.totalEarnings;
        return b.frequency - a.frequency;
      });
    } else if (viewMode === 'revenue') {
      list.sort((a, b) => {
        if (b.totalEarnings !== a.totalEarnings) return b.totalEarnings - a.totalEarnings;
        if (b.totalDownloads !== a.totalDownloads) return b.totalDownloads - a.totalDownloads;
        return b.frequency - a.frequency;
      });
    } else {
      list.sort((a, b) => {
        if (b.frequency !== a.frequency) return b.frequency - a.frequency;
        if (b.totalEarnings !== a.totalEarnings) return b.totalEarnings - a.totalEarnings;
        return b.totalDownloads - a.totalDownloads;
      });
    }
    return list.slice(0, 15);
  }, [keywords, viewMode]);

  if (keywords.length === 0) return null;

  const handleCopyAll = async () => {
    const text = sortedKeywords.map((k) => k.keyword).join(', ');
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyButtonLabel = () => {
    if (viewMode === 'downloads') return `Copy Top ${sortedKeywords.length} by Downloads`;
    if (viewMode === 'revenue') return `Copy Top ${sortedKeywords.length} by Revenue`;
    return `Copy Top ${sortedKeywords.length} Keywords`;
  };

  return (
    <div
      data-testid="collection-top-keywords-bar"
      className="p-4 bg-surface border border-border rounded-2xl flex flex-col gap-3 shadow-xs"
    >
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Top Shared Keywords</h3>
            <p className="text-[10px] text-muted">
              Ranking across {totalImages} artworks in this collection • Click tag to filter grid
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Segmented View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-background border border-border rounded-lg text-xs">
            <button
              type="button"
              data-testid="collection-keywords-view-freq-btn"
              onClick={() => setViewMode('frequency')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'frequency'
                  ? 'bg-surface text-foreground shadow-xs font-semibold'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Layers size={11} />
              <span>Frequency</span>
            </button>
            <button
              type="button"
              data-testid="collection-keywords-view-dl-btn"
              onClick={() => setViewMode('downloads')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'downloads'
                  ? 'bg-surface text-foreground shadow-xs font-semibold'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Download size={11} />
              <span>Downloads</span>
            </button>
            <button
              type="button"
              data-testid="collection-keywords-view-rev-btn"
              onClick={() => setViewMode('revenue')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'revenue'
                  ? 'bg-surface text-foreground shadow-xs font-semibold'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <DollarSign size={11} />
              <span>Revenue</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            data-testid="collection-copy-top-keywords-btn"
            onClick={handleCopyAll}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
              copied
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'
            }`}
          >
            {copied ? (
              <>
                <Check size={13} />
                <span>Copied {sortedKeywords.length} Tags!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>{copyButtonLabel()}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tag Cloud */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {sortedKeywords.map((tag) => {
          const isSelected = selectedKeyword?.toLowerCase() === tag.keyword.toLowerCase();

          return (
            <button
              key={tag.keyword}
              type="button"
              data-testid={`collection-top-keyword-tag-${tag.keyword}`}
              onClick={() => onSelectKeyword?.(isSelected ? null : tag.keyword)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20 font-semibold'
                  : 'bg-background border-border hover:border-primary/50 text-foreground'
              }`}
              title={`${tag.frequency}/${totalImages} artworks (${tag.percentage}%) • ${formatNumber(tag.totalDownloads)} downloads • ${formatCurrency(tag.totalEarnings)} — Click to filter artworks`}
            >
              <Tag size={11} className={isSelected ? 'text-primary-foreground' : 'text-primary/70 shrink-0'} />
              <span className="font-medium">{tag.keyword}</span>

              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                  isSelected
                    ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                    : 'bg-surface text-muted border-border'
                }`}
              >
                {viewMode === 'downloads' ? (
                  <>
                    <Download size={10} className={isSelected ? 'text-primary-foreground' : 'text-muted shrink-0'} />
                    <span>{formatNumber(tag.totalDownloads)}</span>
                  </>
                ) : viewMode === 'revenue' ? (
                  formatCurrency(tag.totalEarnings)
                ) : (
                  `${tag.frequency}`
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
