import React from 'react';
import { Layers, Sparkles, Download, DollarSign } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface KpiCardsProps {
  totalVectors: number;
  monthlyVectors: number;
  totalDownloads: number;
  currentMonthEarnings: number;
  currentMonthName?: string;
}

export function KpiCards({
  totalVectors,
  monthlyVectors,
  totalDownloads,
  currentMonthEarnings,
  currentMonthName,
}: KpiCardsProps) {
  const cards = [
    {
      id: 'total-vectors',
      testId: 'dash-kpi-total-vectors',
      title: 'Total Vectors',
      value: formatNumber(totalVectors),
      subtitle: 'In local portfolio',
      icon: Layers,
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'monthly-vectors',
      testId: 'dash-kpi-monthly-vectors',
      title: 'Monthly Output',
      value: formatNumber(monthlyVectors),
      subtitle: currentMonthName || 'This month',
      icon: Sparkles,
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      id: 'total-downloads',
      testId: 'dash-kpi-total-downloads',
      title: 'Total Downloads',
      value: formatNumber(totalDownloads),
      subtitle: 'Adobe + Shutterstock',
      icon: Download,
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'month-earnings',
      testId: 'dash-kpi-month-earnings',
      title: 'Month Earnings',
      value: formatCurrency(currentMonthEarnings),
      subtitle: 'Current period revenue',
      icon: DollarSign,
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            data-testid={card.testId}
            className="bg-surface border border-border rounded-xl p-4.5 shadow-xs transition-all hover:border-primary/40 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg ${card.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {card.value}
              </div>
              <div className="text-xs text-muted mt-0.5">{card.subtitle}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
