'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Copy, Check, TrendingUp, Sparkles, FolderArchive, ArrowRight } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

export interface DashboardAssetItem {
  id: string;
  code: string | null;
  title: string;
  filePath: string;
  status: string;
  totalDownloads: number;
  ssDownloads: number;
  asDownloads: number;
  keywords: string;
  createdAt: string;
}

interface ActivitySplitGridProps {
  recentUploads: DashboardAssetItem[];
  topPerformers: DashboardAssetItem[];
}

export function ActivitySplitGrid({ recentUploads, topPerformers }: ActivitySplitGridProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyKeywords = async (id: string, keywords: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!keywords) return;
    await copyToClipboard(keywords);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Recent Vectors */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Recent Ingestion</h2>
            </div>
            <Link
              href="/portfolio"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentUploads.length === 0 ? (
            <div className="py-8 text-center text-muted text-xs flex flex-col items-center justify-center gap-2">
              <FolderArchive className="w-8 h-8 text-muted/50" />
              <p>No vectors in library yet.</p>
              <Link
                href="/upload"
                className="text-xs text-primary font-medium hover:underline mt-1"
              >
                Upload your first vector →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentUploads.map((item) => (
                <div
                  key={item.id}
                  data-testid={`dash-recent-item-${item.id}`}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border/80 relative shrink-0 overflow-hidden flex items-center justify-center">
                      {item.filePath ? (
                        <Image
                          src={item.filePath}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <FolderArchive className="w-4 h-4 text-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {item.code || 'NO-CODE'}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                            item.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : item.status === 'uploaded'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate mt-1">
                        {item.title || 'Untitled Vector'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-muted shrink-0 font-mono">
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Top Performers */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-foreground">Top Performers</h2>
            </div>
            <Link
              href="/sales"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>Sales Log</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {topPerformers.length === 0 ? (
            <div className="py-8 text-center text-muted text-xs flex flex-col items-center justify-center gap-2">
              <TrendingUp className="w-8 h-8 text-muted/50" />
              <p>No sales or downloads recorded yet.</p>
              <Link
                href="/sales"
                className="text-xs text-primary font-medium hover:underline mt-1"
              >
                Sync sales statement →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {topPerformers.map((item) => (
                <div
                  key={item.id}
                  data-testid={`dash-top-item-${item.id}`}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border/80 relative shrink-0 overflow-hidden flex items-center justify-center">
                      {item.filePath ? (
                        <Image
                          src={item.filePath}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <FolderArchive className="w-4 h-4 text-muted" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground bg-surface-hover px-1.5 py-0.5 rounded border border-border">
                          {item.code || 'NO-CODE'}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {item.totalDownloads} dl
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate mt-1">
                        {item.title || 'Untitled Vector'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleCopyKeywords(item.id, item.keywords, e)}
                    title="Copy keywords for new work"
                    className="shrink-0 p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-muted hover:text-foreground transition-colors text-xs flex items-center gap-1"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] text-emerald-500 font-medium hidden sm:inline">
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium hidden sm:inline">
                          Keywords
                        </span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
