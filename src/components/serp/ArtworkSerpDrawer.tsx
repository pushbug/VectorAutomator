'use client';

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, DollarSign, Download, Sparkles, Calendar, Search, Loader2, Image as ImageIcon, Award } from 'lucide-react';
import { formatCurrency, formatNumber, getImageUrl } from '@/lib/formatters';

interface ActiveKeyword {
  keyword: string;
  currentRank: number;
  pageNumber: number;
  lastCheckedAt: string;
  previousRank: number | null;
  rankDelta: number | null;
  isNew: boolean;
  bestRank: number;
  totalChecks: number;
}

interface HistoryItem {
  date: string;
  keyword: string;
  rank: number;
  previousRank: number | null;
  rankDelta: number | null;
  isNew: boolean;
  pageNumber: number;
  milestone: string | null;
  cumulativeDownloads: number;
  cumulativeEarnings: number;
}

interface ArtworkData {
  id: string;
  code: string | null;
  title: string;
  filePath: string;
  asId: string | null;
  ssId: string | null;
  totalDownloads: number;
  asDownloads: number;
  totalEarnings: number;
  keywords: string;
  createdAt: string;
}

interface ArtworkSerpDrawerProps {
  imageId: string | null;
  onClose: () => void;
}

export function ArtworkSerpDrawer({ imageId, onClose }: ArtworkSerpDrawerProps) {
  const [data, setData] = useState<{
    artwork: ArtworkData;
    activeKeywords: ActiveKeyword[];
    history: HistoryItem[];
    statsTimeline: Array<{ date: string; downloads: number; earnings: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  useEffect(() => {
    if (!imageId) return;

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/serp/artwork/${encodeURIComponent(imageId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        setData(json);
        if (json.activeKeywords && json.activeKeywords.length > 0) {
          setSelectedKeyword(json.activeKeywords[0].keyword);
        }
      })
      .catch((err) => console.error('Error loading artwork SERP history:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [imageId]);

  if (!imageId) return null;

  const formatTableDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const filteredHistory = (data?.history || []).filter((h) => {
    if (selectedKeyword && selectedKeyword !== 'ALL') {
      return h.keyword === selectedKeyword;
    }
    return true;
  });

  return (
    <div
      data-testid="artwork-serp-drawer"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Dark Backdrop Overlay */}
      <div
        data-testid="artwork-serp-backdrop"
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 cursor-pointer"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className="w-screen max-w-xl h-full bg-surface border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-primary/10 text-primary">
            <TrendingUp size={18} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-foreground">Artwork Ranking History</h2>
            <p className="text-xs text-muted">Keyword positions & revenue correlation</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          title="Close drawer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="text-xs">Loading historical ranking telemetry...</span>
          </div>
        ) : !data ? (
          <div className="py-20 text-center text-xs text-muted">
            Failed to load ranking details for this artwork.
          </div>
        ) : (
          <>
            {/* Artwork Card */}
            <div className="p-4 rounded-2xl bg-surface-hover/50 border border-border flex items-start gap-3.5">
              <div className="w-16 h-16 rounded-xl bg-surface border border-border overflow-hidden shrink-0 flex items-center justify-center">
                {data.artwork.filePath ? (
                  <img
                    src={getImageUrl(data.artwork.filePath)}
                    alt={data.artwork.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon size={24} className="text-muted" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {data.artwork.code && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/15 text-primary">
                      {data.artwork.code}
                    </span>
                  )}
                  {data.artwork.asId && (
                    <span className="text-xs font-mono text-muted">
                      AS ID: {data.artwork.asId}
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-relaxed">
                  {data.artwork.title}
                </h3>

                {/* Revenue & Download Pills */}
                <div className="flex items-center gap-4 mt-2.5 text-xs">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Download size={13} className="text-primary" />
                    <strong className="font-mono tabular-nums">{formatNumber(data.artwork.totalDownloads)}</strong>
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-400">
                    <DollarSign size={13} className="text-emerald-400" />
                    <strong className="font-mono tabular-nums">{formatCurrency(data.artwork.totalEarnings)}</strong>
                  </span>
                </div>
              </div>
            </div>

              {/* Active Keywords Selection Pills */}
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Search size={14} className="text-primary" /> Active Indexed Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedKeyword('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      selectedKeyword === 'ALL'
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'bg-surface-hover/60 border border-border text-muted hover:text-foreground'
                    }`}
                  >
                    All Keywords
                  </button>
                  {data.activeKeywords.map((kw, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedKeyword(kw.keyword)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
                        selectedKeyword === kw.keyword
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                          : 'bg-surface-hover/60 border border-border text-muted hover:text-foreground'
                      }`}
                    >
                      <span>{kw.keyword}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[11px] font-mono font-bold ${
                        kw.currentRank <= 3
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-black/20 text-foreground'
                      }`}>
                        #{kw.currentRank}
                      </span>
                      {kw.rankDelta !== null && kw.rankDelta !== 0 && (
                        <span className={`text-[11px] font-bold ${kw.rankDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {kw.rankDelta > 0 ? `▲+${kw.rankDelta}` : `▼${kw.rankDelta}`}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Rank Progression Timeline */}
              {filteredHistory.length > 1 && (
                <div className="p-4 rounded-2xl bg-surface-hover/30 border border-border space-y-3">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-emerald-400" /> Rank Trajectory
                  </h4>
                  <div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
                    {filteredHistory
                      .slice()
                      .reverse()
                      .map((point, idx) => (
                        <div key={idx} className="flex flex-col items-center min-w-20 shrink-0">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md mb-1.5 shadow-sm ${
                            point.rank <= 3
                              ? 'bg-emerald-500 text-black font-extrabold'
                              : point.rank <= 10
                              ? 'bg-blue-500 text-white'
                              : 'bg-surface border border-border text-foreground'
                          }`}>
                            #{point.rank}
                          </span>
                          <div className="w-2 h-2 rounded-full bg-primary mb-1" />
                          <span className="text-[10px] text-muted font-mono">
                            {new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Chronological Snapshot Comparison Table */}
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary" /> Snapshot Log & Growth Metrics
                </h4>

                <div className="border border-border rounded-xl overflow-hidden bg-surface">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-surface-hover/50 text-muted font-semibold">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Keyword</th>
                        <th className="py-2.5 px-3 text-center">Rank & Delta</th>
                        <th className="py-2.5 px-3 text-right">Downloads</th>
                        <th className="py-2.5 px-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredHistory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-hover/30 transition-colors">
                          <td className="py-2.5 px-3 text-foreground font-mono whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-muted shrink-0" />
                              <span>{formatTableDate(item.date)}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-foreground">
                            {item.keyword}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="font-bold font-mono text-foreground mr-1.5">
                              #{item.rank}
                            </span>
                            {item.isNew ? (
                              <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                ★ NEW
                              </span>
                            ) : item.rankDelta !== null && item.rankDelta > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                ▲ +{item.rankDelta}
                              </span>
                            ) : item.rankDelta !== null && item.rankDelta < 0 ? (
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                ▼ {item.rankDelta}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted">
                                =
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className="font-mono tabular-nums text-xs font-medium text-foreground flex items-center justify-end gap-1">
                              <Download size={13} className="text-muted shrink-0" />
                              {formatNumber(item.cumulativeDownloads || 0)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                            {formatCurrency(item.cumulativeEarnings)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-3 border-t border-border bg-surface-hover/20 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-hover border border-border text-foreground transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
