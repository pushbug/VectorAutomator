'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, X, Loader2, AlertCircle } from 'lucide-react';
import { SingleDatePicker } from '../portfolio/SingleDatePicker';

interface BulkDateModalProps {
  isOpen: boolean;
  selectedCount: number;
  onClose: () => void;
  onConfirm: (targetDate: string) => Promise<void>;
  isUpdating: boolean;
}

export function BulkDateModal({
  isOpen,
  selectedCount,
  onClose,
  onConfirm,
  isUpdating,
}: BulkDateModalProps) {
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!targetDate) {
      setErrorMsg('Please select a valid target date');
      return;
    }
    setErrorMsg(null);
    try {
      await onConfirm(targetDate);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update date');
    }
  };

  return (
    <div
      data-testid="sales-bulk-date-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-visible relative animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <CalendarIcon size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Change Sales Date</h2>
              <p className="text-[11px] text-muted">
                Updating {selectedCount} selected {selectedCount === 1 ? 'record' : 'records'}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="sales-bulk-date-close-btn"
            onClick={onClose}
            disabled={isUpdating}
            className="text-muted hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/10 cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 relative z-20 overflow-visible">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="text-xs text-muted leading-relaxed">
            Choose the target date for the selected records. Any collisions on the same artwork and platform will be merged safely.
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Target Statement Date
            </label>
            <div data-testid="sales-bulk-date-input" className="relative">
              <SingleDatePicker
                value={targetDate}
                onChange={setTargetDate}
                testId="sales-bulk-date-input"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-border bg-surface/50 flex items-center justify-end gap-2.5 rounded-b-2xl relative z-10">
          <button
            type="button"
            data-testid="sales-bulk-date-cancel-btn"
            onClick={onClose}
            disabled={isUpdating}
            className="px-3.5 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            data-testid="sales-bulk-date-confirm-btn"
            onClick={handleConfirm}
            disabled={isUpdating || !targetDate}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
          >
            {isUpdating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Updating Date...</span>
              </>
            ) : (
              <span>Apply Date to {selectedCount} Records</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
