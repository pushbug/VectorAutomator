'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, BookOpen } from 'lucide-react';
import { KeywordSummaryCards } from '@/components/keywords/KeywordSummaryCards';
import { KeywordTable } from '@/components/keywords/KeywordTable';
import { KeywordDetailDrawer } from '@/components/keywords/KeywordDetailDrawer';
import { KeywordGuideModal } from '@/components/keywords/KeywordGuideModal';
import { PortfolioDetail } from '@/components/portfolio/PortfolioDetail';
import { KeywordAnalyticsToken, KeywordSortMode } from '@/lib/keywordAnalytics';

export default function KeywordsPage() {
  const [tokens, setTokens] = useState<KeywordAnalyticsToken[]>([]);
  const [summary, setSummary] = useState({
    totalUniqueKeywords: 0,
    totalTaggedAssets: 0,
    topEarningKeyword: null as { keyword: string; earnings: number } | null,
    topDownloadedKeyword: null as { keyword: string; downloads: number } | null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<KeywordSortMode>('earnings');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tierFilter, setTierFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Drill-down inspect state
  const [inspectKeyword, setInspectKeyword] = useState<string | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);

  const fetchKeywords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        search,
        sortBy,
        sortOrder,
        tier: tierFilter,
        timeRange,
      });

      const res = await fetch(`/api/keywords?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch keyword analytics');

      const json = await res.json();
      setTokens(json.data || []);
      setTotalPages(json.meta?.totalPages || 1);
      setSummary({
        totalUniqueKeywords: json.summary?.totalUniqueKeywords || 0,
        totalTaggedAssets: json.summary?.totalTaggedAssets || 0,
        topEarningKeyword: json.summary?.topEarningKeyword || null,
        topDownloadedKeyword: json.summary?.topDownloadedKeyword || null,
      });
    } catch (error) {
      console.error('Error fetching keywords data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, sortBy, sortOrder, tierFilter, timeRange]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Keyword Insights
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-testid="keyword-guide-btn"
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-muted/10 text-foreground border border-border text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <BookOpen size={15} className="text-primary" />
            <span>Guidelines</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KeywordSummaryCards
        totalUniqueKeywords={summary.totalUniqueKeywords}
        totalTaggedAssets={summary.totalTaggedAssets}
        topEarningKeyword={summary.topEarningKeyword}
        topDownloadedKeyword={summary.topDownloadedKeyword}
      />

      {/* Analytics Data Table */}
      <KeywordTable
        tokens={tokens}
        isLoading={isLoading}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(newSortBy, newSortOrder) => {
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
          setPage(1);
        }}
        tierFilter={tierFilter}
        onTierFilterChange={(t) => {
          setTierFilter(t);
          setPage(1);
        }}
        timeRange={timeRange}
        onTimeRangeChange={(r) => {
          setTimeRange(r);
          setPage(1);
        }}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onInspectKeyword={(kw) => setInspectKeyword(kw)}
      />

      {/* Keyword Linked Artworks Slide-over Drawer */}
      <KeywordDetailDrawer
        keyword={inspectKeyword}
        isOpen={Boolean(inspectKeyword)}
        onClose={() => setInspectKeyword(null)}
        onSelectImage={(img) => {
          setSelectedArtwork(img);
        }}
      />

      {/* Keyword Guide Guidelines Modal */}
      <KeywordGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Portfolio Artwork Slide-over Drawer Overlay */}
      {selectedArtwork && (
        <div className="fixed inset-0 z-60 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 cursor-pointer"
            onClick={() => setSelectedArtwork(null)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md md:max-w-lg lg:max-w-xl h-full shadow-2xl flex flex-col">
              <PortfolioDetail
                image={selectedArtwork}
                className="w-full h-full rounded-l-2xl rounded-r-none border-y-0 border-r-0 border-l"
                onClose={() => setSelectedArtwork(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
