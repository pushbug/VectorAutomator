import React from 'react';
import { Target, Calendar, CheckCircle2 } from 'lucide-react';

interface MonthlyGoalCardProps {
  target: number;
  current: number;
  percentage: number;
  daysRemaining: number;
  monthName: string;
}

export function MonthlyGoalCard({
  target,
  current,
  percentage,
  daysRemaining,
  monthName,
}: MonthlyGoalCardProps) {
  const isCompleted = current >= target && target > 0;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-xs relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Monthly Production Pace ({monthName})
            </h2>
            <p className="text-xs text-muted">
              Target: <span className="font-semibold text-foreground">{target} vectors</span> / month
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-muted">
            <Calendar className="w-3.5 h-3.5" />
            <span>{daysRemaining} days left</span>
          </span>
          <span className="font-mono font-bold text-foreground bg-surface-hover px-2.5 py-1 rounded-md border border-border">
            {current} / {target} ({percentage}%)
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="mt-4">
        <div className="w-full bg-surface-hover h-3 rounded-full overflow-hidden border border-border/60">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isCompleted
                ? 'bg-emerald-500'
                : percentage >= 70
                ? 'bg-blue-600 dark:bg-blue-500'
                : percentage >= 35
                ? 'bg-amber-500'
                : 'bg-primary'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>
      </div>

      {/* Status note */}
      <div className="mt-3 flex items-center justify-between text-xs">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Monthly target reached! Keep the momentum going.
          </span>
        ) : (
          <span className="text-muted">
            {target - current > 0 ? (
              <>
                Need <span className="font-semibold text-foreground">{target - current}</span> more vectors to reach your monthly goal.
              </>
            ) : (
              'Great pace for this month!'
            )}
          </span>
        )}
        <span className="text-muted text-[11px]">
          Avg: {daysRemaining > 0 ? ((target - current) / daysRemaining).toFixed(1) : 0} / day
        </span>
      </div>
    </div>
  );
}
