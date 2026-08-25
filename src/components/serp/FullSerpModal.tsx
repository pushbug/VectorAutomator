'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, ExternalLink, Loader2, Users, Image as ImageIcon, Sparkles, Calendar } from 'lucide-react';
import { getImageUrl } from '@/lib/formatters';

interface SerpItemDetail {
  id: string;
  rank: number;
  assetId: string;
  title: string;
  author: string | null;
  thumbnailUrl: string | null;
  detailUrl: string | null;
  isMine: boolean;
  matchedImage?: {
    id: string;
    code: string | null;
    title: string;
    filePath: string;
  } | null;
}

interface FullSerpModalProps {
  queryId: string | null;
  onClose: () => void;
}

export function FullSerpModal({ queryId, onClose }: FullSerpModalProps) {
  const [queryData, setQueryData] = useState<{
    keyword: string;
    platform: string;
    searchedAt: string;
    pageNumber: number;
    totalItems: number;
    items: SerpItemDetail[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAuthor, setFilterAuthor] = useState<string | null>(null);

  useEffect(() => {
    if (!queryId) return;

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/serp?queryId=${encodeURIComponent(queryId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setQueryData(data.query || null);
      })
      .catch((err) => console.error('Error fetching full SERP snapshot:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [queryId]);

  const formatTableDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const totalItems = useMemo(() => queryData?.items || [], [queryData]);

  // Accurate breakdown counts
  const myArtworksCount = useMemo(() => totalItems.filter((i) => i.isMine).length, [totalItems]);
  const unknownAuthorCount = useMemo(
    () => totalItems.filter((i) => !i.isMine && (!i.author || i.author === 'Unknown Author')).length,
    [totalItems]
  );

  const namedAuthors = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of totalItems) {
      if (item.isMine) continue;
      if (!item.author || item.author === 'Unknown Author') continue;
      map.set(item.author, (map.get(item.author) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [totalItems]);

  const filteredItems = useMemo(() => {
    return totalItems.filter((item) => {
      // 1. Author / My Artwork filtering
      if (filterAuthor === 'MY_ARTWORK') {
        if (!item.isMine) return false;
      } else if (filterAuthor === 'Unknown Author') {
        if (item.isMine || (item.author && item.author !== 'Unknown Author')) return false;
      } else if (filterAuthor !== null) {
        if (item.author !== filterAuthor) return false;
      }

      // 2. Search query filtering
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (item.title || '').toLowerCase().includes(q);
        const matchesAssetId = (item.assetId || '').includes(q);
        const matchesAuthor = (item.author || '').toLowerCase().includes(q);
        const matchesCode = (item.matchedImage?.code || '').toLowerCase().includes(q);
        return matchesTitle || matchesAssetId || matchesAuthor || matchesCode;
      }

      return true;
    });
  }, [totalItems, filterAuthor, search]);

  if (!queryId) return null;

  return (
    <div
      data-testid="full-serp-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Consolidated Header & Filter Toolbar (Without harsh double divider lines) */}
        <div className="border-b border-border bg-surface-hover/20">
          {/* Main Title Row */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono">
                  {queryData?.platform || 'Adobe Stock'}
                </span>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Full Ranking Snapshot: <span className="text-primary font-mono font-semibold">'{queryData?.keyword}'</span>
                </h2>
              </div>
              <p className="text-xs text-muted flex items-center gap-2 font-mono">
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-muted shrink-0" />
                  <span>Date: {formatTableDate(queryData?.searchedAt)}</span>
                </span>
                <span className="text-border">|</span>
                <span>{queryData?.totalItems || totalItems.length || 0} items crawled</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cleanly Aligned Filter Pills & Search Input */}
          <div className="px-6 pb-4 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                <Users size={13} className="text-primary" /> Filter:
              </span>

              {/* All */}
              <button
                type="button"
                onClick={() => setFilterAuthor(null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  filterAuthor === null
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : 'bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                All ({totalItems.length})
              </button>

              {/* My Artwork */}
              {myArtworksCount > 0 && (
                <button
                  type="button"
                  data-testid="filter-my-artwork-btn"
                  onClick={() => setFilterAuthor(filterAuthor === 'MY_ARTWORK' ? null : 'MY_ARTWORK')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                    filterAuthor === 'MY_ARTWORK'
                      ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-semibold'
                  }`}
                >
                  <Sparkles size={12} />
                  <span>My Artwork ({myArtworksCount})</span>
                </button>
              )}

              {/* Unknown Author */}
              {unknownAuthorCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterAuthor(filterAuthor === 'Unknown Author' ? null : 'Unknown Author')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer ${
                    filterAuthor === 'Unknown Author'
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : 'bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-hover'
                  }`}
                >
                  Unknown Author ({unknownAuthorCount})
                </button>
              )}

              {/* Other Named Authors */}
              {namedAuthors.map((a, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFilterAuthor(filterAuthor === a.author ? null : a.author)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer ${
                    filterAuthor === a.author
                      ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                      : 'bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-hover'
                  }`}
                >
                  {a.author} <span className="opacity-70 font-mono text-[11px]">({a.count})</span>
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative sm:w-64 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by title, asset ID..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-surface border border-border focus:border-primary focus:outline-none text-xs transition-all placeholder:text-muted/60"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Items List Table */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 text-muted gap-3">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="text-xs">Loading ranking list...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center p-12 text-muted text-xs">
              No items match your filter criteria.
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden bg-surface shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-hover/50 text-[11px] font-semibold text-muted uppercase tracking-wider">
                      <th className="py-3 px-4 w-16 text-center">Rank</th>
                      <th className="py-3 px-4">Artwork Title &amp; Asset ID</th>
                      <th className="py-3 px-4 w-44">Author / Creator</th>
                      <th className="py-3 px-4 w-36 text-right">Stock Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredItems.map((item) => {
                      const stockUrl =
                        item.detailUrl ||
                        (queryData?.platform?.toLowerCase().includes('shutter')
                          ? `https://www.shutterstock.com/image-vector/${item.assetId}`
                          : `https://stock.adobe.com/images/${item.assetId}`);

                      return (
                        <tr
                          key={item.id}
                          className={`group transition-colors ${
                            item.isMine
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                              : 'hover:bg-surface-hover/60'
                          }`}
                        >
                          {/* Rank # */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded-md font-mono text-xs font-bold ${
                                item.isMine
                                  ? 'bg-emerald-500 text-black font-extrabold shadow-xs'
                                  : item.rank === 1
                                  ? 'bg-amber-500 text-black font-extrabold shadow-xs'
                                  : item.rank === 2
                                  ? 'bg-slate-300 text-black font-bold'
                                  : item.rank === 3
                                  ? 'bg-amber-700/80 text-white font-bold'
                                  : item.rank <= 10
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-surface-hover border border-border text-muted'
                              }`}
                            >
                              #{item.rank}
                            </span>
                          </td>

                          {/* Title & Asset ID */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {item.thumbnailUrl ? (
                                <img
                                  src={item.thumbnailUrl}
                                  alt={item.title}
                                  className="w-10 h-10 rounded-lg object-cover bg-surface border border-border shrink-0"
                                  loading="lazy"
                                />
                              ) : item.matchedImage?.filePath ? (
                                <img
                                  src={getImageUrl(item.matchedImage.filePath)}
                                  alt={item.title}
                                  className="w-10 h-10 rounded-lg object-cover bg-surface border border-border shrink-0"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-muted shrink-0">
                                  <ImageIcon size={16} />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <p
                                  className="font-medium text-foreground text-xs leading-snug line-clamp-1 group-hover:text-primary transition-colors mb-1"
                                  title={item.title}
                                >
                                  {item.title}
                                </p>

                                <div className="flex items-center gap-2 text-[11px] font-mono text-muted">
                                  {item.matchedImage?.code && (
                                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                                      {item.matchedImage.code}
                                    </span>
                                  )}
                                  <span>
                                    Asset ID: <strong className="text-foreground/80">{item.assetId}</strong>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Author / Creator */}
                          <td className="py-3 px-4">
                            {item.isMine ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-2xs">
                                <Sparkles size={12} className="text-emerald-400 shrink-0" />
                                <span>My Artwork</span>
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                                  item.author && item.author !== 'Unknown'
                                    ? 'bg-surface-hover text-foreground border border-border/80'
                                    : 'text-muted italic'
                                }`}
                              >
                                <Users size={12} className="text-primary/70 shrink-0" />
                                <span className="truncate max-w-32" title={item.author || 'Unknown'}>
                                  {item.author || 'Unknown Author'}
                                </span>
                              </span>
                            )}
                          </td>

                          {/* Direct URL Link */}
                          <td className="py-3 px-4 text-right">
                            <a
                              href={stockUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-primary/10 text-muted hover:text-primary border border-border hover:border-primary/30 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                              title={`Open ${item.assetId} on ${queryData?.platform || 'Adobe Stock'}`}
                            >
                              <span>View Asset</span>
                              <ExternalLink size={12} />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-surface-hover/20 text-xs text-muted">
          <span>
            Showing <strong className="text-foreground">{filteredItems.length}</strong> of {queryData?.items.length || 0} items
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-hover border border-border text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
