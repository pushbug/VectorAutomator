import { Asset } from "@/context/AssetContext";
import { useState, useEffect, useMemo, KeyboardEvent, ClipboardEvent } from "react";
import { X, Copy, Check, Download, DollarSign, ArrowDownAZ, Star } from "lucide-react";
import { copyToClipboard as copyToClipboardUtil } from "@/lib/clipboard";
import { formatCurrency, formatNumber } from "@/lib/formatters";

export interface KeywordMetricInfo {
  totalDownloads: number;
  totalEarnings: number;
  isTopFive?: boolean;
}

interface MetadataEditorProps {
  activeAsset: Asset | null;
  onUpdateActiveAsset: (updates: Partial<Asset>) => void;
  onEmbedExifForAsset: (id: string) => void;
  keywordMetricsMap?: Record<string, KeywordMetricInfo>;
}

export function MetadataEditor({
  activeAsset,
  onUpdateActiveAsset,
  onEmbedExifForAsset,
  keywordMetricsMap
}: MetadataEditorProps) {
  const [keywordInput, setKeywordInput] = useState("");
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedKeywords, setCopiedKeywords] = useState(false);
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [sortBy, setSortBy] = useState<"original" | "alphabetical" | "downloads" | "earnings">("downloads");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [internalMetrics, setInternalMetrics] = useState<Record<string, KeywordMetricInfo>>({});

  useEffect(() => {
    setAttemptedSave(false);
  }, [activeAsset?.id]);

  // Combine parent metrics map with internally resolved global metrics map
  const activeMetricsMap = useMemo(() => {
    return { ...internalMetrics, ...(keywordMetricsMap || {}) };
  }, [internalMetrics, keywordMetricsMap]);

  // Preserve raw keywords in their stored sequence (Unconditional hook call)
  const rawKeywordsList = useMemo(() => {
    if (!activeAsset?.keywords) return [];
    return activeAsset.keywords
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);
  }, [activeAsset?.keywords]);

  // Automatically fetch and resolve true global portfolio metrics for any typed/pasted keywords
  useEffect(() => {
    let isCancelled = false;
    const missingWords = rawKeywordsList.filter(k => !activeMetricsMap[k.toLowerCase()]);

    if (Object.keys(activeMetricsMap).length === 0 || missingWords.length > 0) {
      const url = missingWords.length > 0 && Object.keys(activeMetricsMap).length > 0
        ? `/api/keywords?words=${encodeURIComponent(missingWords.join(','))}`
        : `/api/keywords?mode=lookup`;

      fetch(url)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (!isCancelled && data?.dictionary) {
            setInternalMetrics(prev => ({ ...prev, ...data.dictionary }));
          }
        })
        .catch(() => {});
    }

    return () => {
      isCancelled = true;
    };
  }, [rawKeywordsList, activeMetricsMap]);

  const handleToggleSort = (mode: "original" | "alphabetical" | "downloads" | "earnings") => {
    if (mode === "original") {
      setSortBy("original");
      setSortOrder("asc");
      return;
    }
    if (sortBy === mode) {
      // Toggle ascending / descending
      setSortOrder(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortBy(mode);
      setSortOrder(mode === "alphabetical" ? "asc" : "desc");
    }
  };

  // Dynamically sorted keywords for display & copy (Unconditional hook call)
  const sortedKeywordsList = useMemo(() => {
    const list = [...rawKeywordsList];
    if (sortBy === "alphabetical") {
      list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      if (sortOrder === "desc") list.reverse();
      return list;
    }
    if (sortBy === "downloads") {
      list.sort((a, b) => {
        const dlA = activeMetricsMap[a.toLowerCase()]?.totalDownloads || 0;
        const dlB = activeMetricsMap[b.toLowerCase()]?.totalDownloads || 0;
        if (dlB !== dlA) return sortOrder === "desc" ? dlB - dlA : dlA - dlB;
        const earnA = activeMetricsMap[a.toLowerCase()]?.totalEarnings || 0;
        const earnB = activeMetricsMap[b.toLowerCase()]?.totalEarnings || 0;
        if (earnB !== earnA) return sortOrder === "desc" ? earnB - earnA : earnA - earnB;
        return a.localeCompare(b);
      });
      return list;
    }
    if (sortBy === "earnings") {
      list.sort((a, b) => {
        const earnA = activeMetricsMap[a.toLowerCase()]?.totalEarnings || 0;
        const earnB = activeMetricsMap[b.toLowerCase()]?.totalEarnings || 0;
        if (earnB !== earnA) return sortOrder === "desc" ? earnB - earnA : earnA - earnB;
        const dlA = activeMetricsMap[a.toLowerCase()]?.totalDownloads || 0;
        const dlB = activeMetricsMap[b.toLowerCase()]?.totalDownloads || 0;
        if (dlB !== dlA) return sortOrder === "desc" ? dlB - dlA : dlA - dlB;
        return a.localeCompare(b);
      });
      return list;
    }
    return list;
  }, [rawKeywordsList, sortBy, sortOrder, activeMetricsMap]);

  const copyToClipboard = async (text: string, type: 'title' | 'keywords') => {
    await copyToClipboardUtil(text);
    if (type === 'title') {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } else {
      setCopiedKeywords(true);
      setTimeout(() => setCopiedKeywords(false), 2000);
    }
  };

  const handleSave = () => {
    if (!activeAsset) return;
    if (!activeAsset.title.trim()) {
      setAttemptedSave(true);
      document.getElementById('metadata-title-input')?.focus();
      return;
    }
    setAttemptedSave(false);
    onEmbedExifForAsset(activeAsset.id);
  };

  const handleAddKeyword = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!activeAsset) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newKeyword = keywordInput.trim();
      if (newKeyword && rawKeywordsList.length < 100 && !rawKeywordsList.map(k => k.toLowerCase()).includes(newKeyword.toLowerCase())) {
        const newKeywords = [...rawKeywordsList, newKeyword]
          .join(", ");
        onUpdateActiveAsset({ keywords: newKeywords });
      }
      setKeywordInput("");
    } else if (e.key === "Backspace" && keywordInput === "" && rawKeywordsList.length > 0) {
      const newKeywords = rawKeywordsList.slice(0, -1).join(", ");
      onUpdateActiveAsset({ keywords: newKeywords });
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    if (!activeAsset) return;
    const newKeywords = rawKeywordsList.filter(k => k.toLowerCase() !== keywordToRemove.toLowerCase()).join(", ");
    onUpdateActiveAsset({ keywords: newKeywords });
  };

  const handlePasteKeywords = (e: ClipboardEvent<HTMLInputElement>) => {
    if (!activeAsset) return;
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    const newKeywordsArray = paste.split(",").map(k => k.trim()).filter(Boolean);
    const existingLower = new Set(rawKeywordsList.map(k => k.toLowerCase()));
    const uniqueNewKeywords = newKeywordsArray.filter(k => !existingLower.has(k.toLowerCase()));
    
    if (uniqueNewKeywords.length > 0) {
      const combined = [...rawKeywordsList, ...uniqueNewKeywords]
        .slice(0, 100)
        .join(", ");
      onUpdateActiveAsset({ keywords: combined });
    }
  };

  if (!activeAsset) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
        <p className="text-muted text-sm">Select an asset from the queue to edit metadata</p>
      </div>
    );
  }

  const isTitleMissing = attemptedSave && !activeAsset.title.trim();
  const isOverLimit = rawKeywordsList.length > 50;

  return (
    <>
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Metadata Editor</h3>
          <p className="text-xs text-muted">Editing: {activeAsset.baseName}</p>
        </div>
      </div>

      <div className="space-y-4 flex-1 flex flex-col min-h-0">
        <div className="shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs font-semibold text-muted">
                Title (Max 200 chars)
              </label>
              <button 
                type="button"
                onClick={() => copyToClipboard(activeAsset.title, 'title')}
                className="text-muted hover:text-foreground transition-colors p-0.5 cursor-pointer"
                title="Copy title"
              >
                {copiedTitle ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>
            <span className="text-xs text-muted flex items-center">
              {activeAsset.title.length > 0 && (
                <>
                  <button 
                    type="button"
                    onClick={() => onUpdateActiveAsset({ title: "" })}
                    className="hover:text-foreground transition-colors cursor-pointer"
                  >
                    clear
                  </button>
                  <span className="mx-1">|</span>
                </>
              )}
              {activeAsset.title.length}/200
            </span>
          </div>
          <textarea
            id="metadata-title-input"
            data-testid="metadata-title-input"
            value={activeAsset.title}
            onChange={(e) => {
              onUpdateActiveAsset({ title: e.target.value });
              if (e.target.value.trim()) {
                setAttemptedSave(false);
              }
            }}
            maxLength={200}
            rows={2}
            className={`w-full bg-background rounded-lg p-2.5 text-xs text-foreground focus:outline-none transition-all resize-none border ${
              isTitleMissing
                ? 'border-destructive ring-1 ring-destructive/30 bg-destructive/5'
                : 'border-border focus:ring-1 focus:ring-primary/50 focus:border-primary'
            }`}
            placeholder="E.g., Modern 4 Options Business Card Infographic Template..."
          />
        </div>
        
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header Line 1: Title & Copy */}
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs font-semibold text-muted">
                Keywords (Up to 50 words)
              </label>
              <button 
                type="button"
                onClick={() => copyToClipboard(sortedKeywordsList.join(", "), 'keywords')}
                className="text-muted hover:text-foreground transition-colors p-0.5 cursor-pointer"
                title="Copy keywords (comma-separated)"
              >
                {copiedKeywords ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* Header Line 2: Sort & View Controls (Left) and Clear | Count (Right) */}
          <div className="flex items-center justify-between gap-1.5 mb-2 shrink-0">
            <div className="flex items-center gap-1.5">
              {/* Sort Mode Segmented Toggle */}
              {sortedKeywordsList.length > 0 && (
                <div className="flex items-center p-0.5 bg-background border border-border rounded-md text-xs">
                  <button
                    type="button"
                    data-testid="metadata-keywords-sort-orig-btn"
                    onClick={() => handleToggleSort("original")}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      sortBy === "original" ? "bg-surface text-foreground shadow-xs font-semibold" : "text-muted hover:text-foreground"
                    }`}
                    title="Sort: Original entry order"
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    data-testid="metadata-keywords-sort-dl-btn"
                    onClick={() => handleToggleSort("downloads")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      sortBy === "downloads" ? "bg-surface text-foreground shadow-xs font-semibold" : "text-muted hover:text-foreground"
                    }`}
                    title={
                      sortBy === "downloads"
                        ? `Downloads: ${sortOrder === "desc" ? "High to Low (Click for Low to High)" : "Low to High (Click for High to Low)"}`
                        : "Sort: Total Downloads"
                    }
                  >
                    <Download size={10} className={sortBy === "downloads" ? "text-primary" : "text-muted"} />
                    <span>Downloads</span>
                    {sortBy === "downloads" && (
                      <span className="text-[9px] font-bold text-primary">{sortOrder === "desc" ? "↓" : "↑"}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    data-testid="metadata-keywords-sort-rev-btn"
                    onClick={() => handleToggleSort("earnings")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      sortBy === "earnings" ? "bg-surface text-foreground shadow-xs font-semibold" : "text-muted hover:text-foreground"
                    }`}
                    title={
                      sortBy === "earnings"
                        ? `Earnings: ${sortOrder === "desc" ? "High to Low (Click for Low to High)" : "Low to High (Click for High to Low)"}`
                        : "Sort: Total Earnings ($)"
                    }
                  >
                    <DollarSign size={10} className={sortBy === "earnings" ? "text-primary" : "text-muted"} />
                    <span>Earnings</span>
                    {sortBy === "earnings" && (
                      <span className="text-[9px] font-bold text-primary">{sortOrder === "desc" ? "↓" : "↑"}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    data-testid="metadata-keywords-sort-alpha-btn"
                    onClick={() => handleToggleSort("alphabetical")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      sortBy === "alphabetical" ? "bg-surface text-foreground shadow-xs font-semibold" : "text-muted hover:text-foreground"
                    }`}
                    title={
                      sortBy === "alphabetical"
                        ? `Alphabetical: ${sortOrder === "asc" ? "A to Z (Click for Z to A)" : "Z to A (Click for A to Z)"}`
                        : "Sort: Alphabetical (A to Z)"
                    }
                  >
                    <ArrowDownAZ size={10} className={sortBy === "alphabetical" ? "text-primary" : "text-muted"} />
                    <span>{sortBy === "alphabetical" && sortOrder === "desc" ? "Z-A" : "A-Z"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right-aligned Counter & Clear */}
            <div className="flex items-center">
              <span className={`text-xs flex items-center ${isOverLimit ? 'text-destructive font-semibold' : 'text-muted'}`}>
                {sortedKeywordsList.length > 0 && (
                  <>
                    <button 
                      type="button"
                      onClick={() => onUpdateActiveAsset({ keywords: "" })}
                      className="hover:text-foreground transition-colors cursor-pointer"
                      title="Clear all keywords"
                    >
                      clear
                    </button>
                    <span className="mx-1">|</span>
                  </>
                )}
                {rawKeywordsList.length}/50
              </span>
            </div>
          </div>

          {isOverLimit && (
            <div 
              data-testid="metadata-keyword-limit-warning"
              className="mb-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2 py-1 font-medium shrink-0"
            >
              ⚠️ Exceeds 50 keywords limit (Remove {sortedKeywordsList.length - 50} words to enable saving)
            </div>
          )}

          <div 
            className={`w-full flex-1 bg-background rounded-lg p-2 flex flex-col min-h-40 transition-all overflow-hidden border ${
              isOverLimit 
                ? 'border-destructive ring-1 ring-destructive/30 bg-destructive/5' 
                : 'border-border focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary'
            }`}
          >
            {/* Numbered Row List View */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 p-1">
              {sortedKeywordsList.map((keyword, index) => {
                const metrics = activeMetricsMap[keyword.toLowerCase()];
                const hasDl = (metrics?.totalDownloads || 0) > 0;
                const hasEarn = (metrics?.totalEarnings || 0) > 0;

                return (
                  <div
                    key={`${keyword}-${index}`}
                    data-testid={`metadata-keyword-row-${keyword}`}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-border/80 transition-colors text-xs text-foreground group select-none shadow-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-muted/70 w-6 shrink-0 tabular-nums font-semibold">
                        #{index + 1}
                      </span>
                      <span className="font-medium truncate">{keyword}</span>
                      {metrics?.isTopFive && (
                        <Star size={10} className="fill-amber-400 text-amber-500 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(hasDl || hasEarn) && (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium tabular-nums">
                          {hasDl && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-background rounded border border-border text-muted">
                              <Download size={9} className="shrink-0 text-muted/70" />
                              {formatNumber(metrics?.totalDownloads)}
                            </span>
                          )}
                          {hasEarn && (
                            <span className="px-1.5 py-0.5 bg-background rounded border border-border text-muted">
                              {formatCurrency(metrics?.totalEarnings)}
                            </span>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        data-testid={`metadata-keyword-remove-btn-${keyword}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveKeyword(keyword);
                        }}
                        className="text-muted hover:text-destructive focus:outline-none transition-colors p-1 rounded hover:bg-destructive/10 cursor-pointer"
                        title={`Remove ${keyword}`}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center gap-2 mt-1 pt-1 border-t border-border/40">
                <input
                  id="keyword-input"
                  data-testid="metadata-keywords-input"
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleAddKeyword}
                  onPaste={handlePasteKeywords}
                  placeholder={sortedKeywordsList.length === 0 ? "Add keywords (comma or enter to separate)..." : "+ Type or paste more keywords (Enter or comma)..."}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2.5 shrink-0">
        <button 
          onClick={handleSave}
          disabled={activeAsset.status === "embedding" || activeAsset.status === "converting_preview" || isOverLimit || rawKeywordsList.length === 0}
          data-testid="save-metadata-btn"
          className="w-full bg-primary hover:bg-blue-700 text-primary-foreground py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {activeAsset.status === "embedding"
            ? "Saving and Embedding..."
            : isOverLimit
            ? `Exceeds 50 Keywords (Remove ${rawKeywordsList.length - 50} to Save)`
            : "Save Metadata"}
        </button>
        
        <div className="flex gap-2.5">
          {(() => {
            const epsPath = activeAsset.downloadPaths?.find(p => p.toLowerCase().endsWith('.eps'));
            if (epsPath) {
              return (
                 <a href={`/api/file/download?path=${encodeURIComponent(epsPath)}`} download data-testid="download-eps-btn" className="flex-1 bg-surface-hover hover:bg-border text-foreground py-2.5 px-4 rounded-lg text-sm font-medium transition-colors shadow-xs border border-border flex items-center justify-center gap-2 text-center">
                   Download EPS
                 </a>
              );
            }
            return (
               <button disabled data-testid="download-eps-btn" className="flex-1 bg-surface-hover/50 text-muted py-2.5 px-4 rounded-lg text-sm font-medium border border-border/50 flex items-center justify-center gap-2 cursor-not-allowed">
                 Download EPS
               </button>
            );
          })()}
          
          {(() => {
            const jpgPath = activeAsset.downloadPaths?.find(p => p.toLowerCase().endsWith('.jpg') || p.toLowerCase().endsWith('.jpeg'));
            if (jpgPath) {
              return (
                 <a href={`/api/file/download?path=${encodeURIComponent(jpgPath)}`} download data-testid="download-jpg-btn" className="flex-1 bg-surface-hover hover:bg-border text-foreground py-2.5 px-4 rounded-lg text-sm font-medium transition-colors shadow-xs border border-border flex items-center justify-center gap-2 text-center">
                   Download JPG
                 </a>
              );
            }
            return (
               <button disabled data-testid="download-jpg-btn" className="flex-1 bg-surface-hover/50 text-muted py-2.5 px-4 rounded-lg text-sm font-medium border border-border/50 flex items-center justify-center gap-2 cursor-not-allowed">
                 Download JPG
               </button>
            );
          })()}
        </div>
      </div>
    </>
  );
}
