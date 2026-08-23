'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, Building2, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';
import { calculateBundledSplit, THAI_BANKS } from '@/lib/payoutCalculations';
import { formatCurrency, formatBaht, formatTableDate } from '@/lib/formatters';

interface SelectedPayoutItem {
  id: string;
  stockName: string;
  stockWithdrawDate: string;
  stockAmountUsd: number;
  platformAmountUsd?: number | null;
}

interface PayoutBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedItems: SelectedPayoutItem[];
}

export function PayoutBatchModal({
  isOpen,
  onClose,
  onSuccess,
  selectedItems,
}: PayoutBatchModalProps) {
  const [bankReceivedDate, setBankReceivedDate] = useState('');
  const [bankName, setBankName] = useState('Bangkok Bank (BBL)');
  const [exchangeRate, setExchangeRate] = useState<string>('');
  const [totalNetIncomeThb, setTotalNetIncomeThb] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBankReceivedDate(new Date().toISOString().slice(0, 10));
      setBankName('Bangkok Bank (BBL)');
      setExchangeRate('');
      setTotalNetIncomeThb('');
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  const totalBaseUsd = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + (item.platformAmountUsd ?? item.stockAmountUsd), 0);
  }, [selectedItems]);

  const splitBreakdown = useMemo(() => {
    const r = parseFloat(exchangeRate);
    const thb = parseFloat(totalNetIncomeThb);
    return calculateBundledSplit(
      selectedItems.map((s) => ({
        id: s.id,
        stockAmountUsd: s.stockAmountUsd,
        platformAmountUsd: s.platformAmountUsd,
      })),
      {
        exchangeRate: !isNaN(r) && r > 0 ? r : undefined,
        totalNetIncomeThb: !isNaN(thb) && thb > 0 ? thb : undefined,
      }
    );
  }, [selectedItems, exchangeRate, totalNetIncomeThb]);

  const splitMap = useMemo(() => {
    return new Map(splitBreakdown.map((s) => [s.id, s]));
  }, [splitBreakdown]);

  if (!isOpen) return null;

  const handleRateChange = (rateVal: string) => {
    setExchangeRate(rateVal);
    const r = parseFloat(rateVal);
    if (!isNaN(r) && r > 0 && totalBaseUsd > 0) {
      setTotalNetIncomeThb((totalBaseUsd * r).toFixed(2));
    }
  };

  const handleThbChange = (thbVal: string) => {
    setTotalNetIncomeThb(thbVal);
    const thb = parseFloat(thbVal);
    if (!isNaN(thb) && thb > 0 && totalBaseUsd > 0) {
      setExchangeRate((thb / totalBaseUsd).toFixed(4));
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedItems.length === 0) {
      setError('No items selected for bundled withdrawal.');
      return;
    }

    const r = parseFloat(exchangeRate);
    const thb = parseFloat(totalNetIncomeThb);
    if ((isNaN(r) || r <= 0) && (isNaN(thb) || thb <= 0)) {
      setError('Please provide a valid Exchange Rate or Total Net THB amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/payouts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bundle_withdraw',
          ids: selectedItems.map((i) => i.id),
          bankReceivedDate,
          bankName,
          exchangeRate: !isNaN(r) ? r : undefined,
          totalNetIncomeThb: !isNaN(thb) ? thb : undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Bundled withdrawal failed');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Bundled withdrawal failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        data-testid="payout-batch-modal"
        className="bg-surface border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Building2 size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Bundled Bank Withdrawal</h2>
              <p className="text-xs text-muted">
                Combine {selectedItems.length} platform payouts into a single Thai bank deposit with proportional rate distribution.
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

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleBatchSubmit} className="p-6 space-y-5">
          {/* Inputs Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-background/50 border border-border rounded-xl p-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Destination Bank</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary"
              >
                {THAI_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Bank Received Date *</label>
              <input
                type="date"
                value={bankReceivedDate}
                onChange={(e) => setBankReceivedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Exchange Rate (฿ / $) *
              </label>
              <input
                type="number"
                step="0.0001"
                placeholder="34.50"
                value={exchangeRate}
                onChange={(e) => handleRateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground font-mono tabular-nums focus:outline-hidden focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Total Net THB Received (฿) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={totalNetIncomeThb}
                onChange={(e) => handleThbChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-emerald-500 font-bold font-mono tabular-nums focus:outline-hidden focus:border-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Notes / Statement Reference</label>
            <input
              type="text"
              placeholder="e.g. Bundled Payoneer transfer to KBANK"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary"
            />
          </div>

          {/* Summary & Proportional Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted uppercase">Selected Transactions Distribution</span>
              <span className="text-xs text-muted font-mono">
                Total USD: <strong className="text-foreground">{formatCurrency(totalBaseUsd)}</strong>
              </span>
            </div>

            <div className="border border-border rounded-xl overflow-hidden max-h-52 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface sticky top-0 border-b border-border text-muted uppercase">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Stock Agency</th>
                    <th className="py-2 px-3 text-right">USD Base</th>
                    <th className="py-2 px-3 text-right">Proportional THB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedItems.map((item) => {
                    const split = splitMap.get(item.id);
                    const baseUsd = item.platformAmountUsd ?? item.stockAmountUsd;
                    return (
                      <tr key={item.id} className="hover:bg-surface-hover/50">
                        <td className="py-2 px-3 font-mono text-muted">{formatTableDate(item.stockWithdrawDate)}</td>
                        <td className="py-2 px-3 font-medium text-foreground">{item.stockName}</td>
                        <td className="py-2 px-3 text-right font-mono text-foreground">{formatCurrency(baseUsd)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-500">
                          {split ? formatBaht(split.netIncomeThb) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="payout-submit-btn"
              disabled={isSubmitting || selectedItems.length === 0}
              className="px-5 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Complete Bundled Transfer ({selectedItems.length})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
