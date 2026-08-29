'use client';
import React, { useState, useMemo } from 'react';
import { X, UploadCloud, CheckCircle2, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';

interface ImportByIdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
  collectionName?: string;
  onImportSuccess: (result: {
    matchedCount: number;
    addedCount: number;
    alreadyInCollectionCount: number;
    notFoundCount: number;
  }) => void;
}

export function ImportByIdsModal({
  isOpen,
  onClose,
  collectionId,
  collectionName,
  onImportSuccess,
}: ImportByIdsModalProps) {
  const [rawText, setRawText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Universal delimiter parser: splits by commas, newlines, tabs, spaces, semicolons
  const parsedTokens = useMemo(() => {
    if (!rawText.trim()) return [];
    const tokens = rawText
      .split(/[,\s\n\r\t;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    return Array.from(new Set(tokens));
  }, [rawText]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedTokens.length === 0) {
      setErrorMsg('Please enter or paste at least one Asset ID or Image Code.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: parsedTokens }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to import artworks into collection');
      }

      onImportSuccess(json);
      setRawText('');
      onClose();
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMsg(err.message || 'An error occurred during import');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setRawText('');
    setErrorMsg(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
      data-testid="collection-import-ids-modal"
    >
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-hover/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <UploadCloud size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Import Artworks by IDs</h2>
              <p className="text-xs text-muted">
                Add matching images to{' '}
                <span className="font-semibold text-foreground">{collectionName || 'Collection'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="collection-import-ids-close-btn"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {errorMsg && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Paste Asset IDs or Codes
              </label>
              {parsedTokens.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <CheckCircle2 size={12} />
                  {parsedTokens.length} unique {parsedTokens.length === 1 ? 'item' : 'items'} detected
                </span>
              )}
            </div>

            <textarea
              data-testid="collection-import-ids-textarea"
              rows={6}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Paste Adobe Asset IDs (e.g. 972184113, 972184114)&#10;or Image Codes (e.g. 2308-81, 2302-09)&#10;separated by commas, newlines, or spaces..."
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-background border border-border rounded-lg text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-32"
              autoFocus
            />
          </div>

          <div className="p-3 text-xs border border-border rounded-lg bg-surface-hover/50 text-muted space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles size={14} className="text-amber-500 shrink-0" />
              <span>Universal Delimiter & Identifier Support:</span>
            </div>
            <p className="leading-relaxed text-muted">
              Accepts <strong className="text-foreground">Adobe Asset IDs</strong>,{' '}
              <strong className="text-foreground">Internal Image Codes</strong>, or{' '}
              <strong className="text-foreground">Shutterstock IDs</strong>. Automatically cleans and parses comma-separated lists, newline lists from extension, or Excel columns.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={!rawText || isSubmitting}
              className="px-3.5 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              Clear Text
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="collection-import-ids-submit-btn"
                disabled={parsedTokens.length === 0 || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={14} />
                    <span>Import {parsedTokens.length > 0 ? `${parsedTokens.length} Artworks` : 'Artworks'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
