'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Layers,
  ArrowRight,
  ExternalLink,
  Image as ImageIcon,
  Check,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { SingleDatePicker } from './SingleDatePicker';
import { getTodayDateString, getImageUrl } from '@/lib/formatters';


interface SmartIdPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface MatchedImageCandidate {
  id: string;
  code: string;
  title: string;
  filePath: string;
  asId: string | null;
  asDownloads: number;
  similarity?: number;
}

export interface PreviewRow {
  asId: string;
  adobeTitle: string;
  downloads: number;
  thumbnailUrl: string;
  status: 'exact' | 'fuzzy' | 'ambiguous' | 'unmatched';
  confidence: number;
  isAlreadySynced?: boolean;
  isOverwrite: boolean;
  existingAsId: string | null;
  matchedImage: MatchedImageCandidate | null;
  candidates: MatchedImageCandidate[];
}

interface CandidateCardItemProps {
  candidate: MatchedImageCandidate;
  onSelect: () => void;
  variant?: 'indigo' | 'amber';
}

const CandidateCardItem: React.FC<CandidateCardItemProps> = ({
  candidate,
  onSelect,
  variant = 'indigo',
}) => {
  const isAmber = variant === 'amber';
  return (
    <div
      data-testid="select-search-candidate-btn"
      onClick={onSelect}
      className={`p-1.5 flex items-center justify-between gap-2 bg-background border rounded-lg cursor-pointer transition-all min-w-0 ${
        isAmber
          ? 'border-border hover:border-amber-500/50 hover:bg-amber-500/5'
          : 'border-border/80 hover:bg-indigo-500/10 hover:border-indigo-500/40 group'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="w-8 h-8 rounded bg-surface border border-border overflow-hidden shrink-0">
          <img
            src={getImageUrl(candidate.filePath)}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as any).style.display = 'none';
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-mono text-3xs px-1 py-0.2 bg-surface border border-border rounded font-bold text-foreground">
            {candidate.code}
          </span>
          <p className="text-2xs text-foreground font-medium truncate">
            {candidate.title}
          </p>
        </div>
      </div>
      <button
        type="button"
        className={`px-2 py-0.5 text-white text-3xs font-semibold rounded shrink-0 cursor-pointer ${
          isAmber
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-indigo-600 hover:bg-indigo-700 shadow-2xs'
        }`}
      >
        Select
      </button>
    </div>
  );
};

export const SmartIdPasteModal: React.FC<SmartIdPasteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview Grid State
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [selectedAsIds, setSelectedAsIds] = useState<Set<string>>(new Set());
  const [committedIds, setCommittedIds] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState<'all' | 'exact' | 'synced' | 'review' | 'unmatched'>('all');
  const [tableSearch, setTableSearch] = useState('');

  // Inline Manual Search & Link State
  const [linkingAsId, setLinkingAsId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [dbSearchResults, setDbSearchResults] = useState<MatchedImageCandidate[]>([]);

  const handleReset = () => {
    setStep('input');
    setInputText('');
    setError(null);
    setRows([]);
    setSelectedAsIds(new Set());
    setCommittedIds(new Set());
    setLinkingAsId(null);
    setSearchQuery('');
    setDbSearchResults([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Step 1: Trigger Live Analysis & Dry-Run Preview
  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError('Please paste TSV data or HTML content from Adobe Stock Contributor');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/portfolio/paste-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze Adobe Contributor data');
      }

      const receivedRows: PreviewRow[] = data.rows || [];
      setRows(receivedRows);

      // Auto-select exact matches that are NOT already synced by default
      const exactSet = new Set<string>();
      receivedRows.forEach((r) => {
        if (r.status === 'exact' && r.matchedImage && !r.isAlreadySynced) {
          exactSet.add(r.asId);
        }
      });
      setSelectedAsIds(exactSet);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle selection for a single row
  const toggleRowSelect = (asId: string) => {
    setSelectedAsIds((prev) => {
      const next = new Set(prev);
      if (next.has(asId)) next.delete(asId);
      else next.add(asId);
      return next;
    });
  };

  // Bulk Selection Helpers
  const selectAll = () => {
    const all = new Set<string>();
    rows.forEach((r) => {
      if (r.matchedImage && !r.isAlreadySynced && !committedIds.has(r.asId)) {
        all.add(r.asId);
      }
    });
    setSelectedAsIds(all);
  };

  const selectExactOnly = () => {
    const exact = new Set<string>();
    rows.forEach((r) => {
      if (
        r.status === 'exact' &&
        r.matchedImage &&
        !r.isAlreadySynced &&
        !committedIds.has(r.asId)
      ) {
        exact.add(r.asId);
      }
    });
    setSelectedAsIds(exact);
  };

  const deselectAll = () => {
    setSelectedAsIds(new Set());
  };

  // Perform Live DB Search for Manual Linking
  const executeDbSearch = async (term: string) => {
    if (!term.trim()) {
      setDbSearchResults([]);
      return;
    }
    setIsSearchingDb(true);
    try {
      const res = await fetch(`/api/portfolio?search=${encodeURIComponent(term)}&limit=6`);
      if (res.ok) {
        const json = await res.json();
        setDbSearchResults(
          (json.data || []).map((img: any) => ({
            id: img.id,
            code: img.code || 'NO-CODE',
            title: img.title,
            filePath: img.filePath,
            asId: img.asId,
            asDownloads: img.asDownloads || 0,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to search database artworks:', err);
    } finally {
      setIsSearchingDb(false);
    }
  };

  // Bind a specific DB image to a row
  const handleAssignCandidate = (asId: string, image: MatchedImageCandidate) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.asId === asId) {
          return {
            ...r,
            status: 'exact',
            confidence: 1.0,
            matchedImage: image,
          };
        }
        return r;
      })
    );

    // Auto-check this row now that it's matched
    setSelectedAsIds((prev) => new Set([...prev, asId]));
    setLinkingAsId(null);
    setSearchQuery('');
    setDbSearchResults([]);
  };

  // Unmatch / Detach candidate from row
  const handleUnmatch = (asId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.asId === asId) {
          return {
            ...r,
            status: 'unmatched',
            confidence: 0,
            matchedImage: null,
            candidates: [],
          };
        }
        return r;
      })
    );
    setSelectedAsIds((prev) => {
      const next = new Set(prev);
      next.delete(asId);
      return next;
    });
  };

  // Commit Single Row (1-by-1 commit)
  const handleCommitSingle = async (row: PreviewRow) => {
    if (!row.matchedImage) return;

    try {
      const res = await fetch('/api/portfolio/paste-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          items: [
            {
              imageId: row.matchedImage.id,
              asId: row.asId,
            },
          ],
        }),
      });

      if (res.ok) {
        setCommittedIds((prev) => new Set([...prev, row.asId]));
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to commit row:', err);
    }
  };

  // Quick Import Dialog State
  const [quickImportRow, setQuickImportRow] = useState<PreviewRow | null>(null);
  const [quickImportDate, setQuickImportDate] = useState<string>(getTodayDateString);
  const [quickImportTitle, setQuickImportTitle] = useState<string>('');
  const [quickImportKeywords, setQuickImportKeywords] = useState<string>('');
  const [quickImportCategory, setQuickImportCategory] = useState<string>('');
  const [quickImportCode, setQuickImportCode] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);
  const [isSubmittingQuickImport, setIsSubmittingQuickImport] = useState<boolean>(false);
  const [quickImportError, setQuickImportError] = useState<string | null>(null);

  // Fetch next running code for selected date
  const fetchNextCodeForDate = useCallback(async (targetDate: string) => {
    setIsGeneratingCode(true);
    try {
      const res = await fetch(`/api/upload?date=${targetDate}`);
      const data = await res.json();
      if (data.nextCode) {
        setQuickImportCode(data.nextCode);
      }
    } catch (err) {
      console.error('Failed to fetch next code for date:', err);
    } finally {
      setIsGeneratingCode(false);
    }
  }, []);

  // Open Quick Import Dialog for an unmatched row
  const handleOpenQuickImport = (row: PreviewRow) => {
    const today = getTodayDateString();
    setQuickImportRow(row);
    setQuickImportTitle(row.adobeTitle);
    setQuickImportKeywords('');
    setQuickImportCategory('');
    setQuickImportDate(today);
    setQuickImportCode('');
    setQuickImportError(null);
    fetchNextCodeForDate(today);
  };

  // Handle Date Change in Quick Import Dialog
  const handleQuickImportDateChange = (newDate: string) => {
    setQuickImportDate(newDate);
    fetchNextCodeForDate(newDate);
  };

  // Submit Quick Import
  const handleConfirmQuickImport = async () => {
    if (!quickImportRow) return;
    if (!quickImportTitle.trim()) {
      setQuickImportError('Please enter an artwork title');
      return;
    }

    setIsSubmittingQuickImport(true);
    setQuickImportError(null);

    try {
      const res = await fetch('/api/portfolio/paste-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          items: [
            {
              action: 'create_placeholder',
              title: quickImportTitle.trim(),
              asId: quickImportRow.asId,
              date: quickImportDate,
              code: quickImportCode.trim() || undefined,
              keywords: quickImportKeywords.trim(),
              category: quickImportCategory.trim() || undefined,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create artwork in portfolio');
      }

      const createdItem = data.createdItems?.[0] || {
        id: data.createdId || `img-${Date.now()}`,
        code: quickImportCode.trim() || 'NO-CODE',
        title: quickImportTitle.trim(),
        filePath: '',
        asId: quickImportRow.asId,
        asDownloads: 0,
      };

      setRows((prev) =>
        prev.map((r) => {
          if (r.asId === quickImportRow.asId) {
            return {
              ...r,
              status: 'exact',
              confidence: 1.0,
              isAlreadySynced: true,
              matchedImage: {
                id: createdItem.id,
                code: createdItem.code || quickImportCode.trim() || 'NO-CODE',
                title: createdItem.title || quickImportTitle.trim(),
                filePath: createdItem.filePath || '',
                asId: quickImportRow.asId,
                asDownloads: 0,
              },
              candidates: [],
            };
          }
          return r;
        })
      );

      setCommittedIds((prev) => new Set([...prev, quickImportRow.asId]));
      setSelectedAsIds((prev) => {
        const next = new Set(prev);
        next.delete(quickImportRow.asId);
        return next;
      });
      setQuickImportRow(null);
      onSuccess();
    } catch (err: any) {
      setQuickImportError(err.message || 'Failed to create artwork');
    } finally {
      setIsSubmittingQuickImport(false);
    }
  };

  // Bulk Commit for all checked rows
  const handleBulkCommit = async () => {
    const itemsToCommit = rows
      .filter((r) => selectedAsIds.has(r.asId) && r.matchedImage && !committedIds.has(r.asId))
      .map((r) => ({
        imageId: r.matchedImage!.id,
        asId: r.asId,
      }));

    if (itemsToCommit.length === 0) return;

    setIsCommitting(true);
    try {
      const res = await fetch('/api/portfolio/paste-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          items: itemsToCommit,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to commit updates');
      }

      // Mark all as committed
      setCommittedIds((prev) => {
        const next = new Set(prev);
        itemsToCommit.forEach((i) => next.add(i.asId));
        return next;
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to commit updates');
    } finally {
      setIsCommitting(false);
    }
  };

  // Dynamic metrics with discrete Already Synced vs New Exact:
  const newExactCount = rows.filter(
    (r) => r.status === 'exact' && !r.isAlreadySynced && !committedIds.has(r.asId)
  ).length;
  const alreadySyncedCount = rows.filter(
    (r) => r.isAlreadySynced || committedIds.has(r.asId)
  ).length;
  const reviewCount = rows.filter(
    (r) => (r.status === 'fuzzy' || r.status === 'ambiguous') && !r.isAlreadySynced && !committedIds.has(r.asId)
  ).length;
  const unmatchedCount = rows.filter(
    (r) => r.status === 'unmatched' && !r.isAlreadySynced && !committedIds.has(r.asId) && !r.matchedImage
  ).length;
  const uncommittedSelectedCount = rows.filter(
    (r) => selectedAsIds.has(r.asId) && r.matchedImage && !r.isAlreadySynced && !committedIds.has(r.asId)
  ).length;

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const isCommitted = committedIds.has(r.asId);
      const isAlreadySynced = Boolean(r.isAlreadySynced);
      const isDone = isCommitted || isAlreadySynced;

      if (filterTab === 'exact' && (r.status !== 'exact' || isDone)) return false;
      if (filterTab === 'synced' && !isDone) return false;
      if (filterTab === 'review' && ((r.status !== 'fuzzy' && r.status !== 'ambiguous') || isDone)) return false;
      if (filterTab === 'unmatched' && (r.status !== 'unmatched' || isDone || r.matchedImage)) return false;

      if (tableSearch.trim()) {
        const query = tableSearch.toLowerCase();
        const matchesAdobe = r.adobeTitle.toLowerCase().includes(query) || r.asId.includes(query);
        const matchesDb = r.matchedImage
          ? r.matchedImage.title.toLowerCase().includes(query) || r.matchedImage.code.toLowerCase().includes(query)
          : false;
        return matchesAdobe || matchesDb;
      }
      return true;
    });
  }, [rows, filterTab, tableSearch, committedIds]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="smart-id-sync-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-background border border-border w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col h-[92vh] max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Smart Adobe Contributor ID Matcher
              </h2>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-sync-modal-btn"
            onClick={handleClose}
            className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-surface transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 flex flex-col min-h-0">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl shrink-0">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'input' ? (
            /* STEP 1: INPUT VIEW */
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="font-medium flex items-center gap-1.5 text-foreground">
                  <FileSpreadsheet size={14} className="text-primary" />
                  Paste TSV or HTML from Extension
                </span>
                <span className="text-muted/80">Format: Asset ID &bull; Title &bull; Downloads &bull; Thumbnail</span>
              </div>

              <textarea
                data-testid="sync-paste-textarea"
                rows={12}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Click 'Copy Table (TSV)' in the Adobe Contributor extension or paste raw HTML here..."
                className="w-full p-4 bg-surface/50 border border-border rounded-xl text-xs font-mono text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y flex-1"
              />

              <div className="p-3.5 bg-surface/30 border border-border/60 rounded-xl text-xs text-muted space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-primary" />
                  How Staged Verification Works:
                </p>
                <p>1. Copy your portfolio table from the extension on Adobe Contributor.</p>
                <p>2. Paste here and click <strong>Analyze &amp; Preview Artworks</strong> (no changes written to DB yet).</p>
                <p>3. Compare thumbnails &amp; titles side-by-side, tick/untick artworks, and click <strong>Apply Checked</strong>.</p>
              </div>
            </div>
          ) : (
            /* STEP 2: STAGED VISUAL COMPARISON GRID */
            <div className="space-y-4 flex-1 flex flex-col min-h-0" data-testid="sync-preview-grid">
              {/* Staged Preview Alert Banner */}
              {uncommittedSelectedCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs rounded-xl shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="shrink-0 text-blue-500 animate-pulse" />
                    <span>
                      <strong>Staged Preview (Not Yet Saved):</strong> {uncommittedSelectedCount} artworks matched. Click <strong className="underline font-semibold">"Apply {uncommittedSelectedCount} Checked Artworks"</strong> below to persist to database.
                    </span>
                  </div>
                </div>
              )}

              {/* Summary Badges & KPI Row (6-Column Responsive Grid) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0">
                {/* Total Ingested */}
                <div className="bg-surface border border-border rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-primary/30 transition-all gap-1.5 min-w-0">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-0.5 truncate">
                      Total Ingested
                    </p>
                    <h3 className="text-lg font-bold font-mono tabular-nums text-foreground truncate">
                      {rows.length}
                    </h3>
                  </div>
                  <div className="p-2 rounded-lg border text-muted bg-surface-hover border-border shrink-0">
                    <FileSpreadsheet size={16} />
                  </div>
                </div>

                {/* New Exact */}
                <div className="bg-surface border border-border rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-emerald-500/40 transition-all gap-1.5 min-w-0">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-0.5 truncate">
                      New Exact
                    </p>
                    <h3 className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
                      {newExactCount}
                    </h3>
                  </div>
                  <div className="p-2 rounded-lg border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                </div>

                {/* Already Synced */}
                <div className="bg-surface border border-border rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-teal-500/40 transition-all gap-1.5 min-w-0">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-0.5 truncate">
                      Already Synced
                    </p>
                    <h3 className="text-lg font-bold font-mono tabular-nums text-teal-600 dark:text-teal-400 truncate">
                      {alreadySyncedCount}
                    </h3>
                  </div>
                  <div className="p-2 rounded-lg border text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20 shrink-0">
                    <Check size={16} strokeWidth={2.5} />
                  </div>
                </div>

                {/* Needs Review */}
                <div className="bg-surface border border-border rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-amber-500/40 transition-all gap-1.5 min-w-0">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-0.5 truncate">
                      Needs Review
                    </p>
                    <h3 className="text-lg font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 truncate">
                      {reviewCount}
                    </h3>
                  </div>
                  <div className="p-2 rounded-lg border text-amber-500 bg-amber-500/10 border-amber-500/20 shrink-0">
                    <AlertTriangle size={16} />
                  </div>
                </div>

                {/* Unmatched */}
                <div className="bg-surface border border-border rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-rose-500/40 transition-all gap-1.5 min-w-0">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-0.5 truncate">
                      Unmatched
                    </p>
                    <h3 className="text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 truncate">
                      {unmatchedCount}
                    </h3>
                  </div>
                  <div className="p-2 rounded-lg border text-rose-500 bg-rose-500/10 border-rose-500/20 shrink-0">
                    <AlertCircle size={16} />
                  </div>
                </div>

                {/* Checked for Sync */}
                <div className="bg-surface border border-border rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-blue-500/40 transition-all gap-1.5 min-w-0">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-0.5 truncate">
                      Checked For Sync
                    </p>
                    <h3 className="text-lg font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400 truncate">
                      {uncommittedSelectedCount}
                    </h3>
                  </div>
                  <div className="p-2 rounded-lg border text-blue-500 bg-blue-500/10 border-blue-500/20 shrink-0">
                    <CheckSquare size={16} />
                  </div>
                </div>
              </div>

              {/* Toolbar: Filter Tabs & Select Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-xl text-xs flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      filterTab === 'all'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    All ({rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('exact')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      filterTab === 'exact'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    New Exact ({newExactCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('synced')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      filterTab === 'synced'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Already Synced ({alreadySyncedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('review')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      filterTab === 'review'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Needs Review ({reviewCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('unmatched')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      filterTab === 'unmatched'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Unmatched ({unmatchedCount})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-muted" />
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Filter preview..."
                      className="pl-7 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary w-36 sm:w-44"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="px-2.5 py-1.5 bg-surface hover:bg-surface-hover border border-border text-xs text-foreground font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={selectExactOnly}
                    className="px-2.5 py-1.5 bg-surface hover:bg-surface-hover border border-border text-xs text-foreground font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Exact Only
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="px-2.5 py-1.5 bg-surface hover:bg-surface-hover border border-border text-xs text-muted hover:text-foreground rounded-lg transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Visual Side-by-Side Comparison Table (Expanded Height) */}
              <div className="border border-border rounded-xl overflow-hidden bg-surface/30 flex-1 min-h-105 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <thead className="sticky top-0 bg-surface/95 backdrop-blur-xs border-b border-border z-10">
                    <tr className="text-muted font-semibold">
                      <th className="p-3 w-10 text-center">
                        <span className="sr-only">Select Row</span>
                      </th>
                      <th className="p-3 w-[43%]">Local Database Artwork</th>
                      <th className="p-3 w-[39%]">Adobe Contributor Live</th>
                      <th className="p-3 w-[18%] text-right">Match &amp; Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted">
                          No artworks matching this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const isSelected = selectedAsIds.has(row.asId);
                        const isCommitted = committedIds.has(row.asId);
                        const isAlreadySynced = Boolean(row.isAlreadySynced);
                        const isDone = isCommitted || isAlreadySynced;
                        const isLinkingThis = linkingAsId === row.asId;

                        return (
                          <tr
                            key={row.asId}
                            className={`hover:bg-surface/60 transition-colors ${
                              isDone ? '' : isSelected ? 'bg-indigo-500/5' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-3 text-center align-top w-10">
                              <button
                                type="button"
                                disabled={!row.matchedImage || isDone}
                                onClick={() => toggleRowSelect(row.asId)}
                                className="cursor-pointer disabled:opacity-80"
                              >
                                {isDone ? (
                                  <div className="w-4 h-4 rounded bg-teal-600 text-white flex items-center justify-center shadow-2xs">
                                    <Check size={11} strokeWidth={3} />
                                  </div>
                                ) : isSelected ? (
                                  <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                  <Square size={16} className="text-muted" />
                                )}
                              </button>
                            </td>

                            {/* Local Database Artwork (Left Side) */}
                            <td className="p-3 align-top min-w-0">
                              {isLinkingThis ? (
                                /* IN-PLACE SEARCH PANEL IN LEFT COLUMN */
                                <div className="p-2.5 bg-surface border border-indigo-500/50 rounded-xl space-y-2 shadow-sm animate-in fade-in duration-150 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-2xs font-bold text-foreground flex items-center gap-1">
                                      <Search size={12} className="text-indigo-600 dark:text-indigo-400" />
                                      Search Local DB:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setLinkingAsId(null)}
                                      className="p-0.5 text-muted hover:text-foreground rounded cursor-pointer"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>

                                  <div className="relative">
                                    <Search size={12} className="absolute left-2 top-2 text-muted" />
                                    <input
                                      type="text"
                                      value={searchQuery}
                                      onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        executeDbSearch(e.target.value);
                                      }}
                                      placeholder="Code (2408-01) or title..."
                                      className="w-full pl-6 pr-2 py-1 text-2xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-foreground"
                                      autoFocus
                                    />
                                  </div>

                                  <div className="max-h-40 overflow-y-auto space-y-1 pr-0.5">
                                    {isSearchingDb ? (
                                      <p className="text-2xs text-muted p-2 text-center">Searching database...</p>
                                    ) : dbSearchResults.length === 0 ? (
                                      <p className="text-2xs text-muted p-2 text-center">No matching artworks found.</p>
                                    ) : (
                                      dbSearchResults.map((cand) => (
                                        <CandidateCardItem
                                          key={cand.id}
                                          candidate={cand}
                                          onSelect={() => handleAssignCandidate(row.asId, cand)}
                                          variant="indigo"
                                        />
                                      ))
                                    )}
                                  </div>
                                </div>
                              ) : row.status === 'ambiguous' && row.candidates.length > 0 ? (
                                /* MULTIPLE CANDIDATES COMPACT CHIPS */
                                <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1 text-2xs font-semibold text-amber-700 dark:text-amber-400 truncate">
                                      <Layers size={11} className="shrink-0" />
                                      <span>Select Matching Candidate:</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLinkingAsId(row.asId);
                                        setSearchQuery(row.adobeTitle.slice(0, 30));
                                        executeDbSearch(row.adobeTitle.slice(0, 30));
                                      }}
                                      className="text-3xs text-muted hover:text-foreground underline cursor-pointer shrink-0"
                                    >
                                      Search Other
                                    </button>
                                  </div>
                                  <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                                    {row.candidates.map((cand) => (
                                      <CandidateCardItem
                                        key={cand.id}
                                        candidate={cand}
                                        onSelect={() => handleAssignCandidate(row.asId, cand)}
                                        variant="amber"
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : row.matchedImage ? (
                                /* MATCHED IMAGE CARD */
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="w-11 h-11 rounded-lg bg-surface border border-border overflow-hidden shrink-0 relative">
                                    {row.matchedImage.filePath ? (
                                      <img
                                        src={getImageUrl(row.matchedImage.filePath)}
                                        alt={row.matchedImage.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as any).style.display = 'none';
                                        }}
                                      />
                                    ) : row.thumbnailUrl ? (
                                      <img
                                        src={row.thumbnailUrl}
                                        alt={row.matchedImage.title}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          (e.target as any).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-muted">
                                        <ImageIcon size={14} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-2xs px-1.5 py-0.5 bg-surface border border-border rounded font-bold text-foreground">
                                        {row.matchedImage.code}
                                      </span>
                                      {row.isOverwrite && (
                                        <span className="text-3xs px-1 py-0.2 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded font-medium">
                                          Overwrite ID: {row.existingAsId}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-medium text-foreground line-clamp-2 leading-tight text-xs">
                                      {row.matchedImage.title}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                /* UNMATCHED STATE */
                                <div className="p-2.5 bg-rose-500/5 border border-rose-500/15 rounded-xl flex items-center justify-between gap-2 min-w-0">
                                  <div className="min-w-0">
                                    <p className="text-rose-700 dark:text-rose-400 font-semibold text-2xs">
                                      No direct match in DB
                                    </p>
                                    <p className="text-3xs text-muted truncate">
                                      Link existing or import as new
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      data-testid="pick-artwork-btn"
                                      onClick={() => {
                                        setLinkingAsId(row.asId);
                                        setSearchQuery(row.adobeTitle.slice(0, 30));
                                        executeDbSearch(row.adobeTitle.slice(0, 30));
                                      }}
                                      className="px-2 py-1 bg-surface hover:bg-surface-hover border border-border text-2xs font-semibold text-foreground rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                      <Search size={11} />
                                      <span>Pick</span>
                                    </button>
                                    <button
                                      type="button"
                                      data-testid="create-placeholder-btn"
                                      onClick={() => handleOpenQuickImport(row)}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                      <Sparkles size={11} />
                                      <span>+ Import as New</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Adobe Contributor Data (Right Side) */}
                            <td className="p-3 align-top min-w-0">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="w-11 h-11 rounded-lg bg-surface border border-border overflow-hidden shrink-0 relative">
                                  {row.thumbnailUrl ? (
                                    <img
                                      src={row.thumbnailUrl}
                                      alt={row.adobeTitle}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as any).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted">
                                      <ImageIcon size={14} />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono text-2xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded font-bold text-slate-800 dark:text-slate-200">
                                      AS ID: {row.asId}
                                    </span>
                                  </div>
                                  <p className="text-muted line-clamp-2 leading-tight text-xs">
                                    {row.adobeTitle}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Match Status & Row Actions */}
                            <td className="p-3 align-top text-right space-y-1.5 min-w-0">
                              <div>
                                {isDone ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-700 dark:bg-teal-700 text-white font-bold rounded-md text-3xs shadow-2xs">
                                    <CheckCircle2 size={10} strokeWidth={2.5} className="text-white" />
                                    Already Synced
                                  </span>
                                ) : row.status === 'exact' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 dark:bg-emerald-600 text-white font-bold rounded-md text-3xs shadow-2xs">
                                    <CheckCircle2 size={10} strokeWidth={2.5} className="text-white" />
                                    Exact (100%)
                                  </span>
                                ) : row.status === 'fuzzy' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-600 dark:bg-amber-600 text-white font-bold rounded-md text-3xs shadow-2xs">
                                    <AlertTriangle size={10} strokeWidth={2.5} className="text-white" />
                                    Similar ({Math.round(row.confidence * 100)}%)
                                  </span>
                                ) : row.status === 'ambiguous' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-600 dark:bg-orange-600 text-white font-bold rounded-md text-3xs shadow-2xs">
                                    <Layers size={10} strokeWidth={2.5} className="text-white" />
                                    Multiple Found
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-600 dark:bg-rose-600 text-white font-bold rounded-md text-3xs shadow-2xs">
                                    <AlertCircle size={10} strokeWidth={2.5} className="text-white" />
                                    Unmatched
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                {isDone ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isLinkingThis) {
                                        setLinkingAsId(null);
                                      } else {
                                        setLinkingAsId(row.asId);
                                        setSearchQuery(row.adobeTitle.slice(0, 30));
                                        executeDbSearch(row.adobeTitle.slice(0, 30));
                                      }
                                    }}
                                    className="px-2.5 py-0.5 bg-surface hover:bg-surface-hover border border-border hover:border-border-hover text-3xs font-medium text-muted hover:text-foreground rounded transition-colors cursor-pointer"
                                  >
                                    {isLinkingThis ? 'Close' : 'Change'}
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isLinkingThis) {
                                          setLinkingAsId(null);
                                        } else {
                                          setLinkingAsId(row.asId);
                                          setSearchQuery(row.adobeTitle.slice(0, 30));
                                          executeDbSearch(row.adobeTitle.slice(0, 30));
                                        }
                                      }}
                                      className="px-2 py-0.5 bg-surface hover:bg-surface-hover border border-border text-3xs font-medium text-foreground rounded transition-colors cursor-pointer"
                                    >
                                      {isLinkingThis ? 'Close' : row.matchedImage ? 'Change' : 'Pick'}
                                    </button>

                                    {row.matchedImage && (
                                      <>
                                        <button
                                          type="button"
                                          data-testid="unmatch-row-btn"
                                          onClick={() => handleUnmatch(row.asId)}
                                          className="px-2 py-0.5 bg-surface hover:bg-rose-500/10 border border-border hover:border-rose-500/30 text-3xs font-medium text-muted hover:text-rose-600 rounded transition-colors cursor-pointer"
                                        >
                                          Unmatch
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleCommitSingle(row)}
                                          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-3xs font-bold rounded shadow-2xs transition-colors cursor-pointer"
                                        >
                                          Commit
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-surface/50 shrink-0">
          {step === 'input' ? (
            <>
              <button
                type="button"
                data-testid="cancel-sync-btn"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground rounded-lg hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="submit-sync-btn"
                onClick={handleAnalyze}
                disabled={isLoading || !inputText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Analyzing &amp; Matching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Analyze &amp; Preview Artworks</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground rounded-lg hover:bg-surface transition-colors cursor-pointer"
              >
                &larr; Back to Paste
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground rounded-lg hover:bg-surface transition-colors cursor-pointer"
                >
                  Done
                </button>
                <button
                  type="button"
                  data-testid="apply-bulk-sync-btn"
                  onClick={handleBulkCommit}
                  disabled={isCommitting || uncommittedSelectedCount === 0}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-40"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Applying Updates...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Apply {uncommittedSelectedCount} Checked Artworks</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Import Dialog Modal */}
      {quickImportRow && (
        <div
          data-testid="quick-import-dialog"
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >

          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-visible relative flex flex-col animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface/40 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Import as New Artwork</h3>
                </div>
              </div>
              <button
                type="button"
                data-testid="cancel-quick-import-btn"
                onClick={() => setQuickImportRow(null)}
                className="p-1 text-muted hover:text-foreground rounded-lg hover:bg-surface transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-5 space-y-4 relative z-20 overflow-visible">
              {quickImportError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{quickImportError}</span>
                </div>
              )}

              {/* Thumbnail & AS ID Info */}
              <div className="p-3 bg-surface/60 border border-border rounded-xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-surface border border-border overflow-hidden shrink-0">
                  {quickImportRow.thumbnailUrl ? (
                    <img
                      src={quickImportRow.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as any).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <ImageIcon size={16} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-mono text-3xs font-bold text-muted uppercase">Adobe Stock Asset</span>
                    <span className="font-mono text-3xs px-1.5 py-0.5 bg-background border border-border rounded font-bold text-foreground">
                      AS ID: {quickImportRow.asId}
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate">{quickImportRow.adobeTitle}</p>
                </div>
              </div>

              {/* Upload Date & Generated Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
                <div className="relative z-30">
                  <label className="block text-2xs font-semibold text-foreground mb-1.5">
                    Upload Date
                  </label>
                  <SingleDatePicker
                    value={quickImportDate}
                    onChange={handleQuickImportDateChange}
                    testId="quick-import-date-picker"
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-foreground mb-1.5">
                    Image Code (YYMM-Seq)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      data-testid="quick-import-code-input"
                      value={quickImportCode}
                      onChange={(e) => setQuickImportCode(e.target.value)}
                      placeholder={isGeneratingCode ? 'Calculating...' : 'e.g. 2305-01'}
                      className="w-full h-9 px-3 bg-surface border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {isGeneratingCode && (
                      <div className="absolute right-2.5 top-2.5 text-muted animate-spin">
                        <RefreshCw size={14} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-2xs font-semibold text-foreground mb-1.5">
                  Title *
                </label>
                <textarea
                  data-testid="quick-import-title-input"
                  rows={2}
                  value={quickImportTitle}
                  onChange={(e) => setQuickImportTitle(e.target.value)}
                  placeholder="e.g. Minimalist Circular Flowchart Infographic"
                  className="w-full p-2.5 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-2xs font-semibold text-foreground mb-1.5">
                  Keywords
                </label>
                <textarea
                  data-testid="quick-import-keywords-input"
                  rows={2}
                  value={quickImportKeywords}
                  onChange={(e) => setQuickImportKeywords(e.target.value)}
                  placeholder="abstract, business, flowchart, infographic, vector..."
                  className="w-full p-2.5 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-2xs font-semibold text-foreground mb-1.5">
                  Category (Optional)
                </label>
                <input
                  type="text"
                  data-testid="quick-import-category-input"
                  value={quickImportCategory}
                  onChange={(e) => setQuickImportCategory(e.target.value)}
                  placeholder="e.g. Business, Infographics, Icons, Backgrounds..."
                  className="w-full h-9 px-3 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border bg-surface/40 shrink-0 rounded-b-2xl relative z-10">
              <button
                type="button"
                onClick={() => setQuickImportRow(null)}
                disabled={isSubmittingQuickImport}
                className="px-3.5 py-1.5 text-xs font-medium text-muted hover:text-foreground rounded-lg hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-quick-import-btn"
                onClick={handleConfirmQuickImport}
                disabled={isSubmittingQuickImport || !quickImportTitle.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingQuickImport ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>Confirm &amp; Import</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
