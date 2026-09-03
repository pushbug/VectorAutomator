'use client';

import React, { useState } from 'react';
import { Target, Calendar, CheckCircle2, Pencil, X, Loader2 } from 'lucide-react';

interface MonthlyGoalCardProps {
  target: number;
  current: number;
  percentage: number;
  daysRemaining: number;
  monthName: string;
  onTargetUpdated?: (newTarget: number) => void;
}

export function MonthlyGoalCard({
  target,
  current,
  percentage,
  daysRemaining,
  monthName,
  onTargetUpdated,
}: MonthlyGoalCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState(String(target));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompleted = current >= target && target > 0;

  const handleOpenModal = () => {
    setInputValue(String(target));
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const parsed = parseInt(inputValue, 10);
    if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed < 1 || parsed > 100000) {
      setError('Please enter an integer between 1 and 100,000.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyVectorGoal: parsed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update goal');
      }

      setIsModalOpen(false);
      if (onTargetUpdated) {
        onTargetUpdated(parsed);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save goal';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-5 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Monthly Production Pace ({monthName})
              </h2>
              <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                <span>
                  Target: <span className="font-semibold text-foreground">{target} vectors</span> / month
                </span>
                <button
                  type="button"
                  data-testid="dash-goal-edit-btn"
                  onClick={handleOpenModal}
                  title="Edit monthly production target"
                  className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors inline-flex items-center"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
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
            Avg: {daysRemaining > 0 ? Math.max(0, (target - current) / daysRemaining).toFixed(1) : 0} / day
          </span>
        </div>
      </div>

      {/* Goal Configuration Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="goal-dialog-title"
          data-testid="dash-goal-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="bg-surface border border-border rounded-xl p-6 shadow-xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <Target className="w-4 h-4" />
                </div>
                <h3 id="goal-dialog-title" className="text-sm font-semibold text-foreground">
                  Set Monthly Production Goal
                </h3>
              </div>
              <button
                type="button"
                data-testid="dash-goal-cancel-btn"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="text-muted hover:text-foreground p-1 rounded-md transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted">
              Choose a monthly output preset or enter a custom target. Changes are saved automatically to your workspace.
            </p>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted">Presets:</span>
              <div className="flex flex-wrap gap-2">
                {[30, 50, 100, 200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    data-testid={`dash-goal-preset-${preset}`}
                    onClick={() => {
                      setInputValue(String(preset));
                      setError(null);
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      inputValue === String(preset)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-surface-hover text-muted hover:text-foreground border-border'
                    }`}
                  >
                    {preset} / mo
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="space-y-1.5">
              <label htmlFor="goal-input" className="text-xs font-medium text-muted">
                Custom Target (vectors / month)
              </label>
              <input
                id="goal-input"
                type="number"
                data-testid="dash-goal-input"
                min="1"
                max="100000"
                step="1"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 font-mono"
                placeholder="e.g. 50"
                autoFocus
              />
              {error && (
                <p className="text-xs text-destructive mt-1">
                  {error}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="px-3.5 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover rounded-lg border border-border transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="dash-goal-save-btn"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Goal</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
