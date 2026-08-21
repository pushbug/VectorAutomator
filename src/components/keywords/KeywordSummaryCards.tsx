'use client';

import React from 'react';
import { Tag, ImageIcon, DollarSign, Download } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface KeywordSummaryCardsProps {
  totalUniqueKeywords: number;
  totalTaggedAssets: number;
  topEarningKeyword: { keyword: string; earnings: number } | null;
  topDownloadedKeyword: { keyword: string; downloads: number } | null;
}

export function KeywordSummaryCards({
  totalUniqueKeywords,
  totalTaggedAssets,
  topEarningKeyword,
  topDownloadedKeyword,
}: KeywordSummaryCardsProps) {
  const cards = [
    {
      title: 'Unique Keywords',
      value: formatNumber(totalUniqueKeywords),
      icon: Tag,
      testId: 'keyword-kpi-total-keywords',
      color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
      subtitle: 'in portfolio pool',
    },
    {
      title: 'Tagged Artworks',
      value: formatNumber(totalTaggedAssets),
      icon: ImageIcon,
      testId: 'keyword-kpi-tagged-assets',
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      subtitle: 'active vector assets',
    },
    {
      title: 'Top Earning Keyword',
      value: topEarningKeyword ? topEarningKeyword.keyword : '-',
      subValue: topEarningKeyword ? formatCurrency(topEarningKeyword.earnings) : undefined,
      icon: DollarSign,
      testId: 'keyword-kpi-top-earning',
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      subtitle: topEarningKeyword ? `${formatCurrency(topEarningKeyword.earnings)} total revenue` : 'No sales yet',
    },
    {
      title: 'Top Downloaded',
      value: topDownloadedKeyword ? topDownloadedKeyword.keyword : '-',
      subValue: topDownloadedKeyword ? `${formatNumber(topDownloadedKeyword.downloads)} DL` : undefined,
      icon: Download,
      testId: 'keyword-kpi-top-downloads',
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      subtitle: topDownloadedKeyword ? `${formatNumber(topDownloadedKeyword.downloads)} downloads` : 'No downloads yet',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            data-testid={card.testId}
            className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between shadow-2xs transition-all hover:border-primary/30"
          >
            <div className="min-w-0 pr-2">
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1 truncate">
                {card.title}
              </p>
              <h3 className="text-xl md:text-2xl font-bold text-foreground font-mono tabular-nums truncate">
                {card.value}
              </h3>
              <p className="text-xs text-muted mt-1 truncate">
                {card.subtitle}
              </p>
            </div>
            <div className={`p-3 rounded-lg border ${card.color} shrink-0`}>
              <Icon size={22} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
