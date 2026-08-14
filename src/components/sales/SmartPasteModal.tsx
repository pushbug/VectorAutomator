'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Sparkles, CheckCircle2, AlertCircle, ArrowLeft, Loader2, Check } from 'lucide-react';

interface MatchedImage {
  id: string;
  code: string | null;
  title: string;
  filePath: string;
  createdAt: string;
}

interface PreviewRow {
  assetId: string;
  type?: string;
  dateStr: string;
  dateDisplay: string;
  earnings: number;
  downloads?: number;
  matchType: 'exact_id' | 'exact_date' | 'multi_exact_date' | 'proximity' | 'unmatched';
  matchedImage: MatchedImage | null;
  candidates: MatchedImage[];
}

interface SmartPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SUPPORTED_PLATFORMS = ['Adobe Stock', 'Shutterstock', 'Vecteezy'] as const;
type PlatformType = (typeof SUPPORTED_PLATFORMS)[number];

export function SmartPasteModal({ isOpen, onClose, onSuccess }: SmartPasteModalProps) {
  const [platform, setPlatform] = useState<PlatformType>('Adobe Stock');
  const [rawText, setRawText] = useState('');
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = async () => {
    if (!rawText.trim()) {
      setErrorMsg('Please paste some text from your contributor table.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/sales/paste-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          platform,
          rawText,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to parse pasted data');
      }

      const data = await res.json();
      if (!data.rows || data.rows.length === 0) {
        setErrorMsg('No valid rows (ID, Date, Earnings) could be identified in the pasted text.');
        return;
      }

      setRows(data.rows);
      setStep('preview');
    } catch (err: any) {
      console.error('Error previewing paste:', err);
      setErrorMsg(err.message || 'Error parsing paste data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCandidateSelect = (rowIndex: number, imageId: string) => {
    setRows((prev) => {
      const copy = [...prev];
      const targetRow = { ...copy[rowIndex] };
      const selected = targetRow.candidates.find((c) => c.id === imageId) || null;
      targetRow.matchedImage = selected;
      copy[rowIndex] = targetRow;
      return copy;
    });
  };

  const handleCommit = async () => {
    // Filter items with matchedImage
    const syncItems = rows
      .filter((r) => r.matchedImage)
      .map((r) => ({
        imageId: r.matchedImage!.id,
        assetId: r.assetId,
        dateStr: r.dateStr,
        earnings: r.earnings,
        downloads: r.downloads,
      }));

    if (syncItems.length === 0) {
      setErrorMsg('No matched images selected for synchronization.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/sales/paste-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          platform,
          items: syncItems,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to sync stock data');
      }

      onSuccess();
      onClose();
      // Reset state
      setStep('input');
      setRawText('');
      setRows([]);
    } catch (err: any) {
      console.error('Error committing sync:', err);
      setErrorMsg(err.message || 'Failed to sync data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchedCount = rows.filter((r) => r.matchedImage).length;

  return (
    <div
      data-testid="smart-paste-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Smart Paste Stock Statement</h2>
              <p className="text-xs text-muted">Highlight &amp; copy rows from your stock contributor dashboard and paste below</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="smart-paste-close-btn"
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/10 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'input' ? (
            <div className="flex flex-col gap-4">
              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Target Stock Platform
                </label>
                <div className="flex gap-2">
                  {SUPPORTED_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        platform === p
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-background text-muted border-border hover:text-foreground hover:bg-muted/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="smart-paste-textarea" className="block text-xs font-semibold text-muted uppercase tracking-wider">
                  Paste Clipboard Text
                </label>
                <textarea
                  id="smart-paste-textarea"
                  data-testid="smart-paste-textarea"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={8}
                  placeholder={`Highlight table rows from Adobe Stock / Shutterstock and paste here...\n\nExample:\n1929092005\tVectors\t2/27/2026\t$207.04\n1056563551\tVectors\t10/31/2024\t$93.77\n569029521\tVectors\t2/7/2023\t$63.01`}
                  className="w-full p-3 font-mono text-xs bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/30 leading-relaxed resize-y"
                />
              </div>

              <div className="p-3 bg-muted/10 rounded-xl border border-border/60 text-xs text-muted flex items-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero-Risk &amp; 100% Safe:</strong> Processing runs entirely on your local machine. The system extracts Asset IDs, upload dates, and earnings to match your portfolio artworks without external bot requests.
                </span>
              </div>
            </div>
          ) : (
            /* Step 2: Live Match Preview Table */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Parsed Items: <strong className="text-foreground">{rows.length}</strong> (Matched: <strong className="text-emerald-500">{matchedCount}</strong>)
                </span>
                <span className="text-xs text-muted">Platform: <strong className="text-foreground">{platform}</strong></span>
              </div>

              <div className="border border-border rounded-xl overflow-hidden bg-background max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface border-b border-border sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 font-semibold text-muted">Stock Data</th>
                      <th className="p-2.5 font-semibold text-muted">Status</th>
                      <th className="p-2.5 font-semibold text-muted">Matched Portfolio Image</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, idx) => (
                      <tr key={`${row.assetId}-${idx}`} className="hover:bg-surface/50 transition-colors">
                        {/* Stock Data Column */}
                        <td className="p-2.5 font-mono">
                          <div className="font-bold text-foreground">#{row.assetId}</div>
                          <div className="text-[11px] text-muted">{row.dateDisplay}</div>
                          <div className="text-emerald-500 font-bold mt-0.5">${row.earnings.toFixed(2)}</div>
                        </td>

                        {/* Status Column */}
                        <td className="p-2.5">
                          {row.matchType === 'exact_id' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium text-[11px]">
                              <Check size={12} /> Matched by ID
                            </span>
                          )}
                          {row.matchType === 'exact_date' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 font-medium text-[11px]">
                              <Check size={12} /> Matched Date
                            </span>
                          )}
                          {row.matchType === 'multi_exact_date' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium text-[11px]">
                              Multi-Match
                            </span>
                          )}
                          {row.matchType === 'proximity' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium text-[11px]">
                              Suggested (±7d)
                            </span>
                          )}
                          {row.matchType === 'unmatched' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-medium text-[11px]">
                              Unmatched
                            </span>
                          )}
                        </td>

                        {/* Matched Image Selection Column */}
                        <td className="p-2.5">
                          {row.matchedImage ? (
                            <div className="flex items-center gap-2">
                              <div className="relative w-9 h-9 rounded-lg bg-surface border border-border overflow-hidden shrink-0 flex items-center justify-center">
                                <Image
                                  src={`/api/image?path=${encodeURIComponent(row.matchedImage.filePath)}`}
                                  alt={row.matchedImage.title}
                                  fill
                                  sizes="36px"
                                  className="object-contain p-0.5"
                                  unoptimized
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-mono font-bold text-foreground truncate">{row.matchedImage.code || `#${row.matchedImage.id.slice(0, 8)}`}</div>
                                <div className="text-[11px] text-muted truncate max-w-xs">{row.matchedImage.title}</div>
                              </div>
                            </div>
                          ) : row.candidates.length > 0 ? (
                            <select
                              value=""
                              onChange={(e) => handleCandidateSelect(idx, e.target.value)}
                              className="w-full px-2 py-1 bg-surface border border-border rounded text-xs text-foreground focus:outline-hidden"
                            >
                              <option value="">Select matching artwork...</option>
                              {row.candidates.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.code ? `${c.code}: ` : ''}{c.title.slice(0, 40)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-muted italic">No artwork found around this date</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-surface flex items-center justify-between">
          {step === 'preview' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={isSubmitting}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted/10 transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back to Edit</span>
              </button>

              <button
                type="button"
                data-testid="smart-paste-submit-btn"
                onClick={handleCommit}
                disabled={isSubmitting || matchedCount === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Confirm &amp; Sync {matchedCount} Items</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                data-testid="smart-paste-parse-btn"
                onClick={handleParse}
                disabled={isLoading || !rawText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Parsing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Parse &amp; Match Data</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
