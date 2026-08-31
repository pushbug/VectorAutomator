'use client';

import React, { useState, useMemo } from 'react';
import { X, Sparkles, AlertCircle, ArrowLeft, Loader2, Check, Search, Calendar, Image as ImageIcon } from 'lucide-react';
import { SingleDatePicker } from '@/components/portfolio/SingleDatePicker';
import { parseSerpClipboardText, ParsedSerpBatch } from '@/lib/serpPasteParser';
import { getImageUrl } from '@/lib/formatters';

interface MatchedArtwork {
  rank: number;
  assetId: string;
  title: string;
  thumbnailUrl?: string | null;
  matchedImageId?: string | null;
  imageCode?: string | null;
  imageTitle?: string | null;
  imageFilePath?: string | null;
}

interface SmartSerpPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SmartSerpPasteModal({ isOpen, onClose, onSuccess }: SmartSerpPasteModalProps) {
  const [platform, setPlatform] = useState('Adobe Stock');
  const [rawText, setRawText] = useState('');
  const [statementDate, setStatementDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [keywordInput, setKeywordInput] = useState('');
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [matchedItems, setMatchedItems] = useState<MatchedArtwork[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live client-side parse on paste
  const quickStats = useMemo(() => {
    if (!rawText.trim()) return { count: 0, keyword: '' };
    try {
      const parsed: ParsedSerpBatch = parseSerpClipboardText(rawText, keywordInput || 'untitled');
      return {
        count: parsed.items.length,
        keyword: parsed.keyword !== 'untitled' ? parsed.keyword : '',
      };
    } catch {
      return { count: 0, keyword: '' };
    }
  }, [rawText, keywordInput]);

  // Update keyword field if auto-detected and user hasn't typed one
  const handleTextChange = (text: string) => {
    setRawText(text);
    if (!keywordInput.trim()) {
      try {
        const parsed = parseSerpClipboardText(text);
        if (parsed.keyword && parsed.keyword !== 'untitled') {
          setKeywordInput(parsed.keyword);
        }
      } catch {
        // ignore
      }
    }
  };

  if (!isOpen) return null;

  const handlePreview = async () => {
    if (!rawText.trim()) {
      setErrorMsg('Please paste search result ranking data.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const effectiveKeyword = keywordInput.trim() || quickStats.keyword || 'untitled';

      // Call API to parse and cross-reference with portfolio
      const res = await fetch('/api/serp/paste-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: effectiveKeyword,
          platform,
          searchedAt: statementDate,
          text: rawText,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to parse and cross-reference SERP data');
      }

      const data = await res.json();
      setTotalCount(data.totalItems || 0);
      setMatchedItems(data.myItems || []);
      setStep('preview');
    } catch (err: any) {
      console.error('Error previewing SERP paste:', err);
      setErrorMsg(err.message || 'Error processing SERP paste data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setRawText('');
    setKeywordInput('');
    setMatchedItems([]);
    setTotalCount(0);
    setErrorMsg(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCommit = () => {
    handleReset();
    onSuccess();
    onClose();
  };

  return (
    <div
      data-testid="serp-smart-paste-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Smart Rank Importer</h2>
              <p className="text-xs text-muted">
                Paste raw ranking table data to track search ranks and correlate with sales
              </p>
            </div>
          </div>
          <button
            data-testid="serp-smart-paste-close-btn"
            onClick={handleClose}
            className="p-2 rounded-xl text-muted hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'input' ? (
            <>
              {/* Config Row: Date & Keyword & Platform */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Picker */}
                <div>
                  <label className="text-xs font-semibold text-muted mb-1.5 flex items-center gap-1.5">
                    <Calendar size={14} className="text-primary" />
                    Snapshot Date
                  </label>
                  <SingleDatePicker
                    value={statementDate}
                    onChange={setStatementDate}
                    testId="serp-smart-paste-date-picker"
                  />
                </div>

                {/* Target Keyword */}
                <div>
                  <label className="text-xs font-semibold text-muted mb-1.5 flex items-center gap-1.5">
                    <Search size={14} className="text-primary" />
                    Keyword
                  </label>
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="e.g. infographic"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-hover/60 border border-border focus:border-primary focus:outline-none text-sm transition-all"
                  />
                </div>

                {/* Platform */}
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">
                    Stock Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-hover/60 border border-border focus:border-primary focus:outline-none text-sm transition-all"
                  >
                    <option value="Adobe Stock">Adobe Stock</option>
                    <option value="Shutterstock">Shutterstock</option>
                    <option value="Vecteezy">Vecteezy</option>
                  </select>
                </div>
              </div>

              {/* Paste Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-muted">
                    Paste Clipboard Data (TSV, CSV, or Extension Export)
                  </label>
                  {quickStats.count > 0 && (
                    <span className="text-xs text-primary font-medium bg-primary/10 px-2.5 py-0.5 rounded-full">
                      ✓ {quickStats.count} items parsed {quickStats.keyword ? `('${quickStats.keyword}')` : ''}
                    </span>
                  )}
                </div>
                <textarea
                  data-testid="serp-smart-paste-textarea"
                  value={rawText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Keyword\tPage\tRank\tAsset ID\tAuthor\tTitle\ninfographic\t1\t1\t1930409866\tWD 99\tBusiness infographic template...\ninfographic\t1\t2\t502717541\tkanpisut\tPresentation business infographic...`}
                  rows={9}
                  className="w-full p-3.5 rounded-xl bg-surface-hover/40 border border-border focus:border-primary focus:outline-none font-mono text-xs text-foreground placeholder:text-muted/60 transition-all resize-none"
                />
              </div>

              {/* Info banner */}
              <div className="p-3.5 bg-surface-hover/50 rounded-xl border border-border/60 text-xs text-muted flex items-start gap-2.5">
                <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                <p>
                  Copy search ranking results from the <strong>Stock SERP Copier Chrome Extension</strong> or your spreadsheet and paste above. The system will automatically match your <code className="text-primary">Asset ID</code> with existing portfolio images.
                </p>
              </div>
            </>
          ) : (
            /* Step 2: Preview Results */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Snapshot Sync Complete
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Logged <span className="font-semibold text-foreground">{totalCount} items</span> for keyword <span className="text-primary font-bold">'{keywordInput || quickStats.keyword}'</span> on <span className="font-medium">{statementDate}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-primary">
                    {matchedItems.length}
                  </span>
                  <p className="text-[10px] text-muted uppercase font-semibold tracking-wider">
                    Portfolio Matches
                  </p>
                </div>
              </div>

              {/* Matched artworks list */}
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5">
                  Your Ranked Artworks in this Snapshot:
                </h4>
                {matchedItems.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {matchedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-surface-hover/60 border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center overflow-hidden shrink-0">
                            {item.imageFilePath || item.thumbnailUrl ? (
                              <img
                                src={item.imageFilePath ? getImageUrl(item.imageFilePath) : item.thumbnailUrl!}
                                alt={item.imageTitle || item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon size={18} className="text-muted" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {item.imageCode && (
                                <span className="text-xs font-bold font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                                  {item.imageCode}
                                </span>
                              )}
                              <span className="text-xs font-semibold text-foreground truncate max-w-70" title={item.imageTitle || item.title}>
                                {item.imageTitle || item.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted font-mono mt-0.5">
                              Asset ID: {item.assetId}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            item.rank <= 3
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : item.rank <= 10
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}>
                            Rank #{item.rank}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 bg-surface-hover/30 rounded-xl border border-dashed border-border text-xs text-muted">
                    No portfolio artworks found in this 100-item snapshot. (All 100 competitor items were recorded for market tracking).
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-hover/20">
          {step === 'preview' ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
              >
                <ArrowLeft size={16} />
                Paste Another
              </button>
              <button
                type="button"
                data-testid="serp-smart-paste-submit-btn"
                onClick={handleCommit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                <Check size={16} />
                Done & View Dashboard
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={isLoading || !rawText.trim()}
                data-testid="serp-smart-paste-submit-btn"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Matching Portfolio...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Sync SERP Snapshot
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
