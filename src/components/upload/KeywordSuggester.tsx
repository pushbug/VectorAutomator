"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { Sparkles, Search, X, Check, Image as ImageIcon, Flame, DollarSign, Star, CheckSquare, Square, ArrowUpDown, Copy } from "lucide-react";
import {
  aggregateKeywordTokens,
  mergeKeywords,
  parseKeywordsString,
  PortfolioReferenceImage,
  KeywordAnalyticsToken
} from "@/lib/keywordAnalytics";
import { copyToClipboard } from "@/lib/clipboard";

interface KeywordSuggesterProps {
  activeKeywords: string;
  activeAssetId: string | null;
  onApplyKeywords: (mergedKeywords: string) => void;
}

export function KeywordSuggester({
  activeKeywords,
  activeAssetId,
  onApplyKeywords
}: KeywordSuggesterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchField, setSearchField] = useState<"all" | "title" | "keywords" | "code" | "ids">("keywords");
  const [sortBy, setSortBy] = useState<"totalDownloads" | "earnings" | "createdAt">("totalDownloads");
  const [portfolioImages, setPortfolioImages] = useState<PortfolioReferenceImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [selectedTagNames, setSelectedTagNames] = useState<Set<string>>(new Set());
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [, startTransition] = useTransition();

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch portfolio images (Up to 50 items)
  useEffect(() => {
    let isCancelled = false;
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: "50",
          sortBy: sortBy,
          sortOrder: "desc",
          search: debouncedQuery,
          searchField: searchField
        });
        const res = await fetch(`/api/portfolio?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (!isCancelled) {
            setPortfolioImages(json.data || []);
          }
        }
      } catch (err) {
        console.error("Failed to fetch portfolio suggestions:", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchImages();
    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, sortBy, searchField]);

  // Map of currently selected reference images
  const selectedImages = useMemo(() => {
    return portfolioImages.filter(img => selectedImageIds.has(img.id));
  }, [portfolioImages, selectedImageIds]);

  // Aggregated keyword tokens from selected reference images
  const keywordTokens = useMemo(() => {
    return aggregateKeywordTokens(selectedImages, { sortBy: "score" });
  }, [selectedImages]);

  // Active asset keywords parsed set
  const activeKeywordsSet = useMemo(() => {
    return new Set(parseKeywordsString(activeKeywords).map(k => k.toLowerCase()));
  }, [activeKeywords]);

  // Auto-select all new aggregated keyword tags when images selection changes
  useEffect(() => {
    const newTags = new Set<string>();
    keywordTokens.forEach(t => newTags.add(t.keyword));
    setSelectedTagNames(newTags);
  }, [keywordTokens]);

  const toggleImageSelection = (id: string) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllImages = () => {
    if (selectedImageIds.size === portfolioImages.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(portfolioImages.map(img => img.id)));
    }
  };

  const toggleTagSelection = (keyword: string) => {
    setSelectedTagNames(prev => {
      const next = new Set(prev);
      if (next.has(keyword)) next.delete(keyword);
      else next.add(keyword);
      return next;
    });
  };

  const handleSelectAllTags = () => {
    if (selectedTagNames.size === keywordTokens.length) {
      setSelectedTagNames(new Set());
    } else {
      setSelectedTagNames(new Set(keywordTokens.map(t => t.keyword)));
    }
  };

  const handleCopyTags = async () => {
    if (selectedTagNames.size === 0 && keywordTokens.length === 0) return;
    const tagsToCopy = selectedTagNames.size > 0
      ? Array.from(selectedTagNames)
      : keywordTokens.map(t => t.keyword);
    const text = tagsToCopy.join(", ");
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    }
  };

  const handleApply = () => {
    if (!activeAssetId || selectedTagNames.size === 0) return;

    const chosenTags = Array.from(selectedTagNames);
    const result = mergeKeywords(activeKeywords, chosenTags, 100, "append");

    startTransition(() => {
      onApplyKeywords(result.mergedString);
    });

    if (result.isOverStockLimit) {
      setAppliedFeedback(`Applied +${result.addedCount} keywords (${result.count}/50 - remove ${result.count - 50} to save)`);
    } else {
      setAppliedFeedback(`Applied +${result.addedCount} keywords successfully (${result.count}/50)`);
    }

    setTimeout(() => setAppliedFeedback(null), 3500);
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-5 flex flex-col h-full shadow-sm min-h-0">
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground leading-tight">Keyword Suggest</h3>
          </div>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-3 h-10 text-xs shrink-0">
          <ArrowUpDown size={13} className="text-muted shrink-0" />
          <select
            data-testid="keyword-suggest-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sort reference images"
            className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer font-medium"
          >
            <option value="totalDownloads">Top Downloads</option>
            <option value="earnings">Top Earnings ($)</option>
            <option value="createdAt">Newest First</option>
          </select>
        </div>
      </div>

      {/* Search Input with Target Scope Select */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="flex items-center bg-background border border-border rounded-lg px-3 text-xs shrink-0 h-10">
          <select
            data-testid="keyword-suggest-search-field-select"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as any)}
            aria-label="Search field scope"
            className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">All</option>
            <option value="title">Title</option>
            <option value="keywords">Keyword</option>
            <option value="code">Code</option>
            <option value="ids">IDs</option>
          </select>
        </div>

        <div className="relative flex-1 flex items-center">
          <Search size={14} className="absolute left-3 text-muted pointer-events-none" />
          <input
            data-testid="keyword-suggest-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchField === "keywords"
                ? "Search keyword (e.g. infographic, timeline)..."
                : searchField === "title"
                ? "Search image title..."
                : searchField === "code"
                ? "Search vector code (e.g. 2608-01)..."
                : searchField === "ids"
                ? "Search Shutterstock, Adobe, Vecteezy ID..."
                : "Search across all fields..."
            }
            className="w-full bg-background border border-border rounded-lg pl-9 pr-8 h-10 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              data-testid="keyword-suggest-search-clear-btn"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-muted hover:text-foreground p-1 rounded-full hover:bg-muted/10 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Split Section 50/50: Top Image Selector & Bottom Keyword Cloud */}
      <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
        {/* SECTION 1: Reference Images Grid (50% of available height) */}
        <div className="flex-1 flex flex-col min-h-0 border border-border rounded-lg bg-background p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-xs font-medium text-muted">
              Select Reference Images ({selectedImageIds.size}/{portfolioImages.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="keyword-suggest-select-all-images-btn"
                onClick={handleSelectAllImages}
                disabled={portfolioImages.length === 0}
                className="text-[11px] text-primary hover:underline font-medium disabled:opacity-50 cursor-pointer"
              >
                {selectedImageIds.size === portfolioImages.length && portfolioImages.length > 0 ? "Deselect All" : "Select All"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-surface-hover animate-pulse" />
                ))}
              </div>
            ) : portfolioImages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <ImageIcon size={28} className="text-muted/40 mb-1.5" />
                <p className="text-xs text-muted font-medium">No portfolio vectors found matching query</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                {portfolioImages.map((img) => {
                  const isSelected = selectedImageIds.has(img.id);
                  const hasDownloads = (img.totalDownloads || 0) > 0;
                  const hasEarnings = (img.totalEarnings || 0) > 0;
                  const thumbUrl = img.filePath 
                    ? `/api/image?path=${encodeURIComponent(img.filePath)}`
                    : null;

                  return (
                    <div
                      key={img.id}
                      data-testid={`keyword-suggest-image-card-${img.id}`}
                      onClick={() => toggleImageSelection(img.id)}
                      className={`group relative aspect-square rounded-lg border overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                          : "border-border hover:border-primary/50 bg-surface"
                      }`}
                      title={`${img.code ? `[${img.code}] ` : ""}${img.title}\nKeywords: ${img.keywords}`}
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={img.title}
                          className="w-full h-full object-cover p-0.5 transition-transform duration-200 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted/40">
                          <ImageIcon size={20} />
                        </div>
                      )}

                      {/* Top Checkbox Badge */}
                      <div className="absolute top-1.5 left-1.5">
                        <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shadow-xs ${
                          isSelected ? "bg-primary text-primary-foreground font-bold" : "bg-black/50 text-white/80 backdrop-blur-xs"
                        }`}>
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </span>
                      </div>

                      {/* Downloads & Earnings Metric Badge */}
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                        {hasEarnings && (
                          <div className="bg-emerald-600/90 text-white px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5 backdrop-blur-xs shadow-xs">
                            ${(img.totalEarnings || 0).toFixed(2)}
                          </div>
                        )}
                        {hasDownloads && !hasEarnings && (
                          <div className="bg-emerald-600/90 text-white px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-0.5 backdrop-blur-xs shadow-xs">
                            <Flame size={9} />
                            {img.totalDownloads}
                          </div>
                        )}
                      </div>

                      {/* Bottom Code / Label Overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/50 to-transparent p-1.5 pt-3">
                        <p className="text-[10px] text-white font-medium truncate leading-tight">
                          {img.code || img.title}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: Deduplicated Suggested Keywords Pool (50% of available height) */}
        <div className="flex-1 flex flex-col min-h-0 border border-border rounded-lg bg-background p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                Suggested Keywords ({selectedTagNames.size}/{keywordTokens.length})
              </span>
              {selectedImages.length > 0 && (
                <span className="text-[10px] text-muted">from {selectedImages.length} selected vector(s)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {keywordTokens.length > 0 && (
                <button
                  type="button"
                  data-testid="keyword-suggest-header-copy-btn"
                  onClick={handleCopyTags}
                  className="text-[11px] text-muted hover:text-foreground font-medium cursor-pointer flex items-center gap-1 transition-colors"
                  title="Copy suggested keywords to clipboard"
                >
                  {copiedFeedback ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  {copiedFeedback ? "Copied!" : "Copy"}
                </button>
              )}
              {keywordTokens.length > 0 && (
                <button
                  type="button"
                  data-testid="keyword-suggest-select-all-tags-btn"
                  onClick={handleSelectAllTags}
                  className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                >
                  {selectedTagNames.size === keywordTokens.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {selectedImages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Sparkles size={26} className="text-muted/40 mb-2" />
                <p className="text-xs text-muted font-medium">Select reference images above to extract keywords</p>
                <p className="text-[11px] text-muted/70 mt-1">Keywords will be merged, deduplicated, and ranked by performance</p>
              </div>
            ) : keywordTokens.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-4">
                <p className="text-xs text-muted">Selected images contain no keywords</p>
              </div>
            ) : (
              <div className="flex flex-wrap content-start gap-1.5 p-1">
                {keywordTokens.map((token) => {
                  const isChecked = selectedTagNames.has(token.keyword);
                  const isAlreadyInActive = activeKeywordsSet.has(token.keyword);
                  const hasDownloads = token.totalDownloads > 0;
                  const hasEarnings = token.totalEarnings > 0;
                  const isHighFrequency = token.frequency > 1;

                  return (
                    <button
                      key={token.keyword}
                      type="button"
                      data-testid={`keyword-suggest-tag-${token.keyword}`}
                      onClick={() => toggleTagSelection(token.keyword)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer select-none ${
                        isChecked
                          ? hasEarnings || hasDownloads
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                            : isHighFrequency
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20"
                              : "bg-surface border border-border text-foreground hover:bg-surface-hover"
                          : "bg-background text-muted/60 border border-border/40 opacity-60 hover:opacity-100"
                      }`}
                    >
                      {/* Selection Indicator */}
                      {isChecked ? (
                        <CheckSquare size={12} className={hasEarnings || hasDownloads ? "text-emerald-500" : isHighFrequency ? "text-blue-500" : "text-primary"} />
                      ) : (
                        <Square size={12} className="text-muted/40" />
                      )}

                      {/* Keyword text */}
                      <span className="font-medium">{token.keyword}</span>

                      {/* Top 5 Golden Star Indicator */}
                      {token.isTopFive && (
                        <span title="Top 5 Golden Keyword" className="inline-flex items-center">
                          <Star size={10} className="fill-amber-400 text-amber-500" />
                        </span>
                      )}

                      {/* Download / Earnings Metric Badge */}
                      {hasEarnings ? (
                        <span className="text-[10px] px-1 rounded bg-emerald-500/20 font-bold">
                          ${token.totalEarnings.toFixed(2)}
                        </span>
                      ) : hasDownloads ? (
                        <span className="text-[10px] px-1 rounded bg-emerald-500/20 font-bold">
                          +{token.totalDownloads}
                        </span>
                      ) : isHighFrequency ? (
                        <span className="text-[10px] px-1 rounded bg-blue-500/20 font-semibold">
                          x{token.frequency}
                        </span>
                      ) : null}

                      {/* Already in active asset indicator */}
                      {isAlreadyInActive && (
                        <span className="text-[9px] text-muted italic ml-0.5" title="Already added in current asset">
                          (in asset)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="mt-3 flex flex-col gap-2 shrink-0">
        {appliedFeedback && (
          <div className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-center font-medium">
            {appliedFeedback}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-testid="keyword-suggest-copy-tags-btn"
            onClick={handleCopyTags}
            disabled={selectedTagNames.size === 0 && keywordTokens.length === 0}
            className="bg-surface-hover hover:bg-border border border-border text-foreground text-sm font-medium h-10 px-4 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            title="Copy selected keywords to clipboard"
          >
            {copiedFeedback ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
            <span>{copiedFeedback ? "Copied!" : `Copy (${selectedTagNames.size || keywordTokens.length})`}</span>
          </button>

          <button
            type="button"
            data-testid="keyword-suggest-apply-btn"
            onClick={handleApply}
            disabled={!activeAssetId || selectedTagNames.size === 0}
            className="flex-1 bg-primary hover:bg-blue-700 text-primary-foreground text-sm font-semibold h-10 px-4 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Sparkles size={15} />
            <span>
              {!activeAssetId
                ? "Select asset from queue"
                : `Apply Keywords (${selectedTagNames.size}) to Asset`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
