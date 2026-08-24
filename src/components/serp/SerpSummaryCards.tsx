'use client';

import React from 'react';
import { Search, Trophy, Flame, Image as ImageIcon } from 'lucide-react';

interface SerpSummaryProps {
  summary: {
    totalKeywords: number;
    page1Artworks: number;
    top10Artworks: number;
    bestRank: string;
  };
}

export function SerpSummaryCards({ summary }: SerpSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Tracked Keywords */}
      <div className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs uppercase font-bold tracking-wider text-muted mb-1">
            Tracked Keywords
          </p>
          <h3
            data-testid="serp-kpi-keywords"
            className="text-2xl font-extrabold text-foreground font-mono tabular-nums"
          >
            {summary.totalKeywords}
          </h3>
          <p className="text-[11px] text-muted mt-1">Unique search terms</p>
        </div>
        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
          <Search size={22} />
        </div>
      </div>

      {/* 2. Page 1 Artworks */}
      <div className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs uppercase font-bold tracking-wider text-muted mb-1">
            Page 1 Artworks
          </p>
          <h3
            data-testid="serp-kpi-page1-artworks"
            className="text-2xl font-extrabold text-foreground font-mono tabular-nums"
          >
            {summary.page1Artworks}
          </h3>
          <p className="text-[11px] text-muted mt-1">Ranks 1 – 100 on Page 1</p>
        </div>
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          <ImageIcon size={22} />
        </div>
      </div>

      {/* 3. Top 10 Dominance */}
      <div className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs uppercase font-bold tracking-wider text-muted mb-1">
            Top 10 Dominance
          </p>
          <h3
            data-testid="serp-kpi-top10"
            className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums"
          >
            {summary.top10Artworks}
          </h3>
          <p className="text-[11px] text-emerald-400/80 mt-1">Prime organic positions</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
          <Flame size={22} />
        </div>
      </div>

      {/* 4. Best Ranking */}
      <div className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between shadow-sm">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-xs uppercase font-bold tracking-wider text-muted mb-1">
            Best Ranking
          </p>
          <h3
            data-testid="serp-kpi-best-rank"
            className="text-xl font-extrabold text-amber-400 font-mono truncate"
            title={summary.bestRank}
          >
            {summary.bestRank}
          </h3>
          <p className="text-[11px] text-muted mt-1 truncate">Peak rank achieved</p>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
          <Trophy size={22} />
        </div>
      </div>
    </div>
  );
}
