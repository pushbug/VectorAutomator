'use client';

import React, { useState, useMemo } from 'react';
import { X, ClipboardPaste, CheckCircle2, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { parseGoogleSheetPayoutsTSV, ParsedPayoutRow } from '@/lib/payoutCalculations';
import { formatCurrency, formatBaht, formatTableDate } from '@/lib/formatters';

interface PayoutPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PayoutPasteModal({ isOpen, onClose, onSuccess }: PayoutPasteModalProps) {
  const [pastedText, setPastedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedRows: ParsedPayoutRow[] = useMemo(() => {
    return parseGoogleSheetPayoutsTSV(pastedText);
  }, [pastedText]);

  if (!isOpen) return null;

  const totalParsedStockUsd = parsedRows.reduce((sum, r) => sum + r.stockAmountUsd, 0);
  const totalParsedNetThb = parsedRows.reduce((sum, r) => sum + (r.netIncomeThb || 0), 0);

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      setError('No valid payout rows detected. Please check your copied text.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch('/api/payouts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_many',
          items: parsedRows,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Failed to import records');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        data-testid="payout-paste-modal"
        className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ClipboardPaste size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Smart Paste from Google Sheet</h2>
              <p className="text-xs text-muted">
                Copy columns directly from your spreadsheet and paste below for instant multi-row import.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-muted">
                Paste Tab-Separated Rows (From Google Sheet / Excel)
              </label>
              {pastedText && (
                <button
                  type="button"
                  onClick={() => setPastedText('')}
                  className="text-xs text-muted hover:text-destructive flex items-center gap-1"
                >
                  <Trash2 size={12} /> Clear
                </button>
              )}
            </div>
            <textarea
              rows={5}
              placeholder="01/09/23	ShutterStock	548.04	07/09/23	PayOneer	539.26	-	-	
03/09/23	AdobeStock	2,667.41	09/09/23	PayOneer	2,664.41	34.72	114,595.77	Rate 35.45..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-mono bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:border-primary placeholder:text-muted/60"
            />
          </div>

          {/* Live Preview Bar */}
          {parsedRows.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted">Detected Rows</p>
                  <p className="text-lg font-bold text-foreground font-mono">{parsedRows.length}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-xs text-muted">Total Stock USD</p>
                  <p className="text-lg font-bold text-foreground font-mono">
                    {formatCurrency(totalParsedStockUsd)}
                  </p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-xs text-muted">Total Net THB</p>
                  <p className="text-lg font-bold text-emerald-500 font-mono">
                    {formatBaht(totalParsedNetThb)}
                  </p>
                </div>
              </div>
              <span className="text-xs text-primary font-medium flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-md">
                <CheckCircle2 size={14} /> Ready to Ingest
              </span>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface sticky top-0 border-b border-border text-muted uppercase">
                  <tr>
                    <th className="py-2 px-3">Withdraw</th>
                    <th className="py-2 px-3">Stock Agency</th>
                    <th className="py-2 px-3 text-right">Stock USD</th>
                    <th className="py-2 px-3">Wallet</th>
                    <th className="py-2 px-3 text-right">Wallet USD</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Net THB</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-hover/50">
                      <td className="py-2 px-3 font-mono text-muted">{formatTableDate(row.stockWithdrawDate)}</td>
                      <td className="py-2 px-3 font-medium text-foreground">{row.stockName}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-foreground">
                        {formatCurrency(row.stockAmountUsd)}
                      </td>
                      <td className="py-2 px-3 text-muted">{row.platformName}</td>
                      <td className="py-2 px-3 text-right font-mono text-muted">
                        {row.platformAmountUsd != null ? formatCurrency(row.platformAmountUsd) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-muted">
                        {row.exchangeRate != null ? row.exchangeRate.toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-500">
                        {row.netIncomeThb != null ? formatBaht(row.netIncomeThb) : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                            row.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : row.status === 'in_platform'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}
                        >
                          {row.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-surface">
          <p className="text-xs text-muted">
            Header rows like &quot;Summary&quot; or &quot;Stock Withdraw&quot; are automatically skipped.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isSubmitting || parsedRows.length === 0}
              className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                'Importing...'
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Import {parsedRows.length} Records
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
