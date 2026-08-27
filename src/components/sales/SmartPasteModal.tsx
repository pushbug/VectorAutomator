'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Sparkles, AlertCircle, ArrowLeft, Loader2, Check, Trash2 } from 'lucide-react';
import { SingleDatePicker } from '../portfolio/SingleDatePicker';
import { parseStockPaste, extractStatementDate } from '@/lib/stockPasteParser';
import { SUPPORTED_PLATFORMS, PlatformType } from '@/lib/platforms';
import { formatCurrency, getImageUrl } from '@/lib/formatters';






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
  uploadDateStr?: string;
  uploadDateDisplay?: string;
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


export function SmartPasteModal({ isOpen, onClose, onSuccess }: SmartPasteModalProps) {
  const [platform, setPlatform] = useState<PlatformType>('Adobe Stock');
  const [rawText, setRawText] = useState('');
  const [statementDate, setStatementDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [autoDetectedDate, setAutoDetectedDate] = useState<string | null>(null);
  const [existingSalesWarning, setExistingSalesWarning] = useState<{
    count: number;
    totalEarnings: number;
    dateStr: string;
  } | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const quickStats = React.useMemo(() => {
    if (!rawText.trim()) return { count: 0, total: 0 };
    const parsed = parseStockPaste(rawText);
    return {
      count: parsed.length,
      total: parsed.reduce((sum, r) => sum + r.earnings, 0),
    };
  }, [rawText]);

  React.useEffect(() => {
    if (rawText) {
      const detected = extractStatementDate(rawText);
      if (detected) {
        setStatementDate(detected);
        setAutoDetectedDate(detected);
      }
    }
  }, [rawText]);

  const handleRawTextChange = (text: string) => {
    setRawText(text);
    const detected = extractStatementDate(text);
    if (detected) {
      setStatementDate(detected);
      setAutoDetectedDate(detected);
    } else {
      setAutoDetectedDate(null);
    }
  };

  if (!isOpen) return null;


  const handleParse = async () => {
    if (!rawText.trim()) {
      setErrorMsg('Please paste some text from your contributor table.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    const detected = extractStatementDate(rawText);
    const effectiveStatementDate = detected || statementDate;
    if (detected && detected !== statementDate) {
      setStatementDate(detected);
      setAutoDetectedDate(detected);
    }

    try {
      const res = await fetch('/api/sales/paste-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          platform,
          rawText,
          statementDate: effectiveStatementDate,
          useStatementDate: true,
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

      if (data.detectedStatementDate) {
        setStatementDate(data.detectedStatementDate);
        setAutoDetectedDate(data.detectedStatementDate);
      }

      setRows(data.rows);
      if (data.existingSalesWarning) {
        setExistingSalesWarning(data.existingSalesWarning);
      } else {
        setExistingSalesWarning(null);
      }
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
    // Collect all rows, preserving null imageId for unmatched staging
    const syncItems = rows.map((r) => ({
      imageId: r.matchedImage?.id || null,
      assetId: r.assetId,
      dateStr: r.dateStr,
      earnings: r.earnings,
      downloads: r.downloads,
    }));

    if (syncItems.length === 0) {
      setErrorMsg('No items available for synchronization.');
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
  const unlinkedCount = rows.length - matchedCount;
  const totalParsedEarnings = rows.reduce((sum, r) => sum + r.earnings, 0);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div
      data-testid="smart-paste-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}

        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Smart Paste Stock Statement</h2>
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
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 relative z-20 min-h-115">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'input' ? (
            <div className="flex flex-col gap-4 flex-1 min-h-0">
              {/* Controls Toolbar: Statement Date Picker (Left) & Platform Selector (Right) */}
              <div className="p-3 bg-background border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-30 overflow-visible shrink-0">
                <div className="w-full sm:w-60 relative z-30 flex flex-col gap-1" data-testid="smart-paste-date-input">
                  <SingleDatePicker
                    value={statementDate}
                    onChange={(d) => {
                      setStatementDate(d);
                      setAutoDetectedDate(null);
                    }}
                    testId="smart-paste-date-input"
                  />
                  {autoDetectedDate && (
                    <div className="flex items-center gap-1 text-[11px] text-primary font-medium pl-1">
                      <Sparkles size={12} className="shrink-0" />
                      <span>Auto-detected from clipboard</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {SUPPORTED_PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      data-testid={`smart-paste-platform-${p.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setPlatform(p)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        platform === p
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-surface text-muted border-border hover:text-foreground hover:bg-muted/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea with Realtime Live Stats filling full available vertical space */}
              <div className="flex flex-col gap-1.5 relative z-10 flex-1 min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <label htmlFor="smart-paste-textarea" className="block text-xs font-semibold text-muted uppercase tracking-wider">
                      Paste Clipboard Text
                    </label>
                    {rawText.trim() && (
                      <button
                        type="button"
                        data-testid="smart-paste-clear-btn"
                        onClick={() => {
                          setRawText('');
                          setRows([]);
                          setErrorMsg(null);
                          setAutoDetectedDate(null);
                          setExistingSalesWarning(null);
                        }}
                        className="text-[11px] text-muted hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Trash2 size={12} />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                  {quickStats.count > 0 && (
                    <div data-testid="smart-paste-live-stats" className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-muted">
                        Detected: <strong className="text-foreground font-bold">{quickStats.count} items</strong>
                      </span>
                      <span className="text-muted">
                        Estimated: <strong className="text-foreground font-bold">${quickStats.total.toFixed(2)}</strong>
                      </span>
                    </div>
                  )}
                </div>
                <textarea
                  id="smart-paste-textarea"
                  data-testid="smart-paste-textarea"
                  value={rawText}
                  onChange={(e) => handleRawTextChange(e.target.value)}
                  onPaste={(e) => {
                    const pasted = e.clipboardData?.getData('text');
                    // If pasting a full statement export, replace textarea cleanly instead of appending at cursor
                    if (pasted && /(?:#\s*)?(?:statement\s+date|date|period):/i.test(pasted)) {
                      e.preventDefault();
                      handleRawTextChange(pasted);
                    }
                  }}
                  placeholder="Highlight table rows from Adobe Stock / Shutterstock and paste here..."
                  className="w-full flex-1 min-h-60 p-3.5 font-mono text-xs bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/30 leading-relaxed resize-none"
                />
              </div>

            </div>
          ) : (
            /* Step 2: Live Match Preview Table */
            <div className="flex flex-col gap-3">
              {/* Summary Header with Date & Total Revenue */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface border border-border rounded-xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
                  <span>Parsed Items: <strong className="text-foreground">{rows.length}</strong></span>
                  <span>(Matched: <strong className="text-blue-500">{matchedCount}</strong>, Unlinked: <strong className="text-muted">{unlinkedCount}</strong>)</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-muted">Date:</span>
                    <strong data-testid="smart-paste-summary-date" className="text-foreground font-bold">{formatDisplayDate(statementDate)}</strong>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-muted">Total Revenue:</span>
                    <strong data-testid="smart-paste-summary-revenue" className="text-foreground font-bold text-sm">
                      {formatCurrency(totalParsedEarnings)}
                    </strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-muted">Platform:</span>
                    <strong className="text-foreground font-medium">{platform}</strong>
                  </div>
                </div>
              </div>

              {existingSalesWarning && (
                <div
                  data-testid="smart-paste-duplicate-warning"
                  className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                  <div className="flex-1 leading-relaxed">
                    <span className="font-bold">Existing Records Detected: </span>
                    Sales for <strong>{platform}</strong> on <strong>{existingSalesWarning.dateStr}</strong> were already imported previously ({existingSalesWarning.count} items, ${existingSalesWarning.totalEarnings.toFixed(2)}). Submitting will update existing records for this date.
                  </div>
                </div>
              )}

              <div className="border border-border rounded-xl overflow-hidden bg-background max-h-[62vh] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface border-b border-border sticky top-0 z-10">
                    <tr>
                      <th className="p-3 font-semibold text-muted w-44">Stock Data</th>
                      <th className="p-3 font-semibold text-muted w-44">Status</th>
                      <th className="p-3 font-semibold text-muted">Matched Portfolio Image</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, idx) => (
                      <tr key={`${row.assetId}-${idx}`} className="hover:bg-surface/50 transition-colors">
                        {/* Stock Data Column */}
                        <td className="p-3 font-mono">
                          <div className="font-bold text-foreground">#{row.assetId}</div>
                          <div className="text-[11px] text-muted">
                            {row.dateDisplay}
                            {row.uploadDateDisplay && row.uploadDateDisplay !== row.dateDisplay && (
                              <span className="ml-1 text-[10px] text-muted/70">(Up: {row.uploadDateDisplay})</span>
                            )}
                          </div>
                          <div className="text-foreground font-bold mt-0.5">${row.earnings.toFixed(2)}</div>
                        </td>

                        {/* Status Column */}
                        <td className="p-3">
                          {row.matchType === 'exact_id' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium text-[11px]">
                              <Check size={12} /> Matched by ID
                            </span>
                          )}
                          {row.matchType === 'exact_date' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium text-[11px]">
                              <Check size={12} /> Matched Date
                            </span>
                          )}
                          {row.matchType === 'multi_exact_date' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium text-[11px]">
                              Multi-Match
                            </span>
                          )}
                          {row.matchType === 'proximity' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium text-[11px]">
                              Suggested (±7d)
                            </span>
                          )}
                          {row.matchType === 'unmatched' && (
                            <span
                              data-testid="smart-paste-unlinked-badge"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-500/10 text-muted border border-border font-medium text-[11px]"
                            >
                              Unlinked (Staged)
                            </span>
                          )}
                        </td>

                        {/* Matched Image Selection Column */}

                        <td className="p-3">
                          {row.matchedImage ? (
                            <div className="flex items-center gap-2.5">
                              <div className="relative w-10 h-10 rounded-lg bg-surface border border-border overflow-hidden shrink-0 flex items-center justify-center">
                                <Image
                                  src={getImageUrl(row.matchedImage.filePath)}
                                  alt={row.matchedImage.title}
                                  fill
                                  sizes="40px"
                                  className="object-contain p-0.5"
                                  unoptimized
                                />

                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-mono font-bold text-foreground truncate">{row.matchedImage.code || `#${row.matchedImage.id.slice(0, 8)}`}</div>
                                <div className="text-[11px] text-muted truncate max-w-md">{row.matchedImage.title}</div>
                              </div>
                            </div>
                          ) : row.candidates.length > 0 ? (
                            <select
                              value=""
                              onChange={(e) => handleCandidateSelect(idx, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-hidden"
                            >
                              <option value="">Select matching artwork...</option>
                              {row.candidates.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.code ? `${c.code}: ` : ''}{c.title.slice(0, 60)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-muted/70 italic">Will save as unlinked sales record</span>
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
        <div className="px-6 py-4 border-t border-border bg-surface flex items-center justify-between relative z-10">
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
                disabled={isSubmitting || rows.length === 0}
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
                    <span>Confirm &amp; Sync {rows.length} Items ({matchedCount} linked, {unlinkedCount} unlinked)</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center justify-end gap-2.5 w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-background border border-border rounded-lg text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
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
                    <span>
                      {quickStats.count > 0
                        ? `Parse & Match ${quickStats.count} Items ($${quickStats.total.toFixed(2)})`
                        : 'Parse & Match Data'}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
