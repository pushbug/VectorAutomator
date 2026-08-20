'use client';

import React from 'react';
import { DollarSign, Download, Trophy, TrendingUp } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface SalesSummaryCardsProps {
  totalEarnings: number;
  totalDownloads: number;
  topPlatform: string;
  totalRecords?: number;
}

export function SalesSummaryCards({
  totalEarnings,
  totalDownloads,
  topPlatform,
}: SalesSummaryCardsProps) {
  const avgPerDownload = totalDownloads > 0 ? totalEarnings / totalDownloads : 0;

  const cards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(totalEarnings),
      icon: DollarSign,
      testId: 'sales-kpi-total-earnings',
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Total Downloads',
      value: formatNumber(totalDownloads),
      icon: Download,
      testId: 'sales-kpi-total-downloads',
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Avg. / Download',
      value: formatCurrency(avgPerDownload),
      icon: TrendingUp,
      testId: 'sales-kpi-avg-download',
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
    {
      title: 'Top Platform',
      value: topPlatform || '-',
      icon: Trophy,
      testId: 'sales-kpi-top-platform',
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
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
            className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between shadow-xs transition-all hover:border-primary/30"
          >
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">
                {card.title}
              </p>
              <h3 className="text-xl md:text-2xl font-bold text-foreground font-mono tabular-nums">
                {card.value}
              </h3>
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
