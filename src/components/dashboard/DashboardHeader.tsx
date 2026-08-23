import React from 'react';
import { Tag, Clock } from 'lucide-react';

interface DashboardHeaderProps {
  latestCode: string;
  pendingCount: number;
}

export function DashboardHeader({ latestCode, pendingCount }: DashboardHeaderProps) {
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Auto-Pilot
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted mt-1 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{dateFormatted}</span>
        </p>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="inline-flex items-center gap-1.5 bg-surface border border-border px-3 py-1.5 rounded-lg shadow-xs text-xs font-medium text-foreground">
          <Tag className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted">Latest Seq:</span>
          <span className="font-mono font-semibold text-primary">{latestCode}</span>
        </div>

        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-600 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{pendingCount} pending queue</span>
          </span>
        )}
      </div>
    </div>
  );
}
