'use client';

import React, { useState, useEffect } from 'react';
import { X, DollarSign, Building2, Calendar, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import {
  calculatePayoutDerivedFields,
  normalizeDateToUTC,
  STOCK_AGENCIES,
  PAYMENT_PLATFORMS,
  THAI_BANKS,
} from '@/lib/payoutCalculations';
import { formatCurrency, formatBaht } from '@/lib/formatters';

export interface PayoutFormData {
  id?: string;
  stockWithdrawDate: string;
  stockName: string;
  stockAmountUsd: number | string;
  platformDate?: string | null;
  platformName: string;
  platformAmountUsd?: number | string | null;
  bankReceivedDate?: string | null;
  bankName?: string | null;
  exchangeRate?: number | string | null;
  netIncomeThb?: number | string | null;
  status?: string | null;
  notes?: string | null;
}

interface PayoutEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PayoutFormData) => Promise<void>;
  initialData?: PayoutFormData | null;
  mode?: 'create' | 'edit';
}

export function PayoutEntryModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create',
}: PayoutEntryModalProps) {
  const [stockWithdrawDate, setStockWithdrawDate] = useState('');
  const [stockName, setStockName] = useState('Adobe Stock');
  const [stockAmountUsd, setStockAmountUsd] = useState<string>('');
  const [platformDate, setPlatformDate] = useState('');
  const [platformName, setPlatformName] = useState('Payoneer');
  const [platformAmountUsd, setPlatformAmountUsd] = useState<string>('');
  const [bankReceivedDate, setBankReceivedDate] = useState('');
  const [bankName, setBankName] = useState('Bangkok Bank (BBL)');
  const [exchangeRate, setExchangeRate] = useState<string>('');
  const [netIncomeThb, setNetIncomeThb] = useState<string>('');
  const [status, setStatus] = useState<string>('auto');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setStockWithdrawDate(initialData.stockWithdrawDate ? initialData.stockWithdrawDate.slice(0, 10) : '');
        setStockName(initialData.stockName || 'Adobe Stock');
        setStockAmountUsd(initialData.stockAmountUsd !== undefined ? String(initialData.stockAmountUsd) : '');
        setPlatformDate(initialData.platformDate ? initialData.platformDate.slice(0, 10) : '');
        setPlatformName(initialData.platformName || 'Payoneer');
        setPlatformAmountUsd(initialData.platformAmountUsd !== undefined && initialData.platformAmountUsd !== null ? String(initialData.platformAmountUsd) : '');
        setBankReceivedDate(initialData.bankReceivedDate ? initialData.bankReceivedDate.slice(0, 10) : '');
        setBankName(initialData.bankName || '');
        setExchangeRate(initialData.exchangeRate !== undefined && initialData.exchangeRate !== null ? String(initialData.exchangeRate) : '');
        setNetIncomeThb(initialData.netIncomeThb !== undefined && initialData.netIncomeThb !== null ? String(initialData.netIncomeThb) : '');
        setStatus(initialData.status || 'auto');
        setNotes(initialData.notes || '');
      } else {
        const today = new Date().toISOString().slice(0, 10);
        setStockWithdrawDate(today);
        setStockName('Adobe Stock');
        setStockAmountUsd('');
        setPlatformDate('');
        setPlatformName('Payoneer');
        setPlatformAmountUsd('');
        setBankReceivedDate('');
        setBankName('Bangkok Bank (BBL)');
        setExchangeRate('');
        setNetIncomeThb('');
        setStatus('auto');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Handle 2-way Rate / THB Calculation
  const handleRateChange = (rateVal: string) => {
    setExchangeRate(rateVal);
    const r = parseFloat(rateVal);
    const baseUsd = parseFloat(platformAmountUsd) || parseFloat(stockAmountUsd);
    if (!isNaN(r) && r > 0 && !isNaN(baseUsd) && baseUsd > 0) {
      setNetIncomeThb((baseUsd * r).toFixed(2));
    }
  };

  const handleThbChange = (thbVal: string) => {
    setNetIncomeThb(thbVal);
    const thb = parseFloat(thbVal);
    const baseUsd = parseFloat(platformAmountUsd) || parseFloat(stockAmountUsd);
    if (!isNaN(thb) && thb > 0 && !isNaN(baseUsd) && baseUsd > 0) {
      setExchangeRate((thb / baseUsd).toFixed(4));
    }
  };

  const handlePlatformUsdChange = (usdVal: string) => {
    setPlatformAmountUsd(usdVal);
    const pUsd = parseFloat(usdVal);
    const r = parseFloat(exchangeRate);
    if (!isNaN(pUsd) && pUsd > 0 && !isNaN(r) && r > 0) {
      setNetIncomeThb((pUsd * r).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const stockUsdNum = parseFloat(stockAmountUsd);
    if (!stockName || !stockWithdrawDate || isNaN(stockUsdNum) || stockUsdNum <= 0) {
      setError('Please provide a valid Stock Name, Withdraw Date, and USD Amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        id: initialData?.id,
        stockWithdrawDate,
        stockName,
        stockAmountUsd: stockUsdNum,
        platformDate: platformDate || null,
        platformName,
        platformAmountUsd: platformAmountUsd ? parseFloat(platformAmountUsd) : null,
        bankReceivedDate: bankReceivedDate || null,
        bankName: bankName ? bankName.trim() : null,
        exchangeRate: exchangeRate ? parseFloat(exchangeRate) : null,
        netIncomeThb: netIncomeThb ? parseFloat(netIncomeThb) : null,
        status: status !== 'auto' ? status : undefined,
        notes: notes.trim() ? notes.trim() : null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stockNum = parseFloat(stockAmountUsd) || 0;
  const platformNum = parseFloat(platformAmountUsd) || 0;
  const feeCalc = platformNum > 0 && stockNum > platformNum ? stockNum - platformNum : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        data-testid="payout-entry-modal"
        className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <DollarSign size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {mode === 'create' ? 'Log New Stock Payout' : 'Edit Payout Transaction'}
              </h2>
              <p className="text-xs text-muted">
                Track fund movement from stock agency to platform wallet and Thai bank.
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
          <div className="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Stage 1: Stock Origin */}
          <div className="bg-background/50 border border-border/80 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">
                1
              </span>
              Stock Agency Payout (USD)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Stock Agency *</label>
                <select
                  data-testid="payout-input-stock-name"
                  value={stockName}
                  onChange={(e) => setStockName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary"
                  required
                >
                  {STOCK_AGENCIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Withdraw Date *</label>
                <input
                  data-testid="payout-input-withdraw-date"
                  type="date"
                  value={stockWithdrawDate}
                  onChange={(e) => setStockWithdrawDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Stock USD Amount *</label>
                <input
                  data-testid="payout-input-stock-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={stockAmountUsd}
                  onChange={(e) => setStockAmountUsd(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground font-mono tabular-nums focus:outline-hidden focus:border-primary"
                  required
                />
              </div>
            </div>
          </div>

          {/* Stage 2: Payment Platform / Wallet */}
          <div className="bg-background/50 border border-border/80 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs">
                  2
                </span>
                Platform Wallet (Payoneer / PayPal)
              </div>
              {feeCalc > 0 && (
                <span className="text-xs font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 font-mono">
                  Fee: -${feeCalc.toFixed(2)} USD
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Platform Wallet</label>
                <select
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary"
                >
                  {PAYMENT_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Received Date</label>
                <input
                  type="date"
                  value={platformDate}
                  onChange={(e) => setPlatformDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Actual USD Received</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={platformAmountUsd}
                  onChange={(e) => handlePlatformUsdChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground font-mono tabular-nums focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Stage 3: Thai Bank & FX Exchange */}
          <div className="bg-background/50 border border-border/80 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs">
                3
              </span>
              Thai Bank Deposit & Exchange (THB)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Bank Name</label>
                <select
                  data-testid="payout-input-bank-name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary"
                >
                  <option value="">-- None / Not Deposited --</option>
                  {THAI_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Bank Received Date</label>
                <input
                  type="date"
                  value={bankReceivedDate}
                  onChange={(e) => setBankReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="payout-exchange-rate" className="block text-xs font-medium text-muted mb-1">Exchange Rate (฿ / $)</label>
                <input
                  id="payout-exchange-rate"
                  type="number"
                  step="0.0001"
                  placeholder="34.50"
                  value={exchangeRate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground font-mono tabular-nums focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="payout-net-income-thb" className="block text-xs font-medium text-muted mb-1">Net Income (THB ฿)</label>
                <input
                  id="payout-net-income-thb"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={netIncomeThb}
                  onChange={(e) => handleThbChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-emerald-500 font-bold font-mono tabular-nums focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Status Override & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Status Override</label>
              <select
                data-testid="payout-input-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary"
              >
                <option value="auto">Auto (Derived from Bank Fields)</option>
                <option value="completed">Completed (Deposited / Cleared)</option>
                <option value="in_platform">Holding (In Platform Wallet)</option>
                <option value="pending">Pending (Awaiting Platform)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Notes / Remarks</label>
              <input
                data-testid="payout-input-notes"
                type="text"
                placeholder="e.g. Rate 35.45 (116,992.80) 1 วัน"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary"
              />
            </div>
          </div>

          {/* Footer Actions */}
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
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  {mode === 'create' ? 'Save Transaction' : 'Update Transaction'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
