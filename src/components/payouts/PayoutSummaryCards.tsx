'use client';

import React from 'react';
import { Wallet, Coins, ArrowDownToLine, Receipt } from 'lucide-react';
import { formatCurrency, formatBaht } from '@/lib/formatters';

interface PayoutSummaryCardsProps {
  totalNetThb: number;
  holdingUsd: number;
  totalFeeUsd: number;
  totalTransactions: number;
}

export function PayoutSummaryCards({
  totalNetThb,
  holdingUsd,
  totalFeeUsd,
  totalTransactions,
}: PayoutSummaryCardsProps) {
  const cards = [
    {
      title: 'Realized Net Income (THB)',
      value: formatBaht(totalNetThb),
      subtitle: 'Deposited into Thai bank',
      icon: Wallet,
      testId: 'payout-kpi-realized-thb',
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Holding in Platform (USD)',
      value: formatCurrency(holdingUsd),
      subtitle: 'Available in Payoneer / PayPal',
      icon: Coins,
      testId: 'payout-kpi-holding-usd',
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Total Platform Fees',
      value: formatCurrency(totalFeeUsd),
      subtitle: 'Transfer & intermediary fees',
      icon: ArrowDownToLine,
      testId: 'payout-kpi-total-fees',
      color: 'text-red-500 bg-red-500/10 border-red-500/20',
    },
    {
      title: 'Total Transactions',
      value: `${totalTransactions.toLocaleString()} Items`,
      subtitle: 'Recorded payout withdrawals',
      icon: Receipt,
      testId: 'payout-kpi-total-transactions',
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
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
              <p className="text-xs text-muted mt-1">{card.subtitle}</p>
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
