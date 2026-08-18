import { Asset } from "@/context/AssetContext";
import { useState, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { X, Copy, Check } from "lucide-react";

interface MetadataEditorProps {
  activeAsset: Asset | null;
  onUpdateActiveAsset: (updates: Partial<Asset>) => void;
  onEmbedExifForAsset: (id: string) => void;
}

export function MetadataEditor({
  activeAsset,
  onUpdateActiveAsset,
  onEmbedExifForAsset
}: MetadataEditorProps) {
  const [keywordInput, setKeywordInput] = useState("");
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedKeywords, setCopiedKeywords] = useState(false);
  const [attemptedSave, setAttemptedSave] = useState(false);

  useEffect(() => {
    setAttemptedSave(false);
  }, [activeAsset?.id]);

  const copyToClipboard = (text: string, type: 'title' | 'keywords') => {
    navigator.clipboard.writeText(text);
    if (type === 'title') {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } else {
      setCopiedKeywords(true);
      setTimeout(() => setCopiedKeywords(false), 2000);
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

  const keywordsList = activeAsset.keywords 
    ? activeAsset.keywords.split(",")
        .map(k => k.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    : [];

  const handleAddKeyword = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newKeyword = keywordInput.trim();
      if (newKeyword && keywordsList.length < 100 && !keywordsList.map(k => k.toLowerCase()).includes(newKeyword.toLowerCase())) {
        const newKeywords = [...keywordsList, newKeyword]
          .join(", ");
        onUpdateActiveAsset({ keywords: newKeywords });
      }
      setKeywordInput("");
    } else if (e.key === "Backspace" && keywordInput === "" && keywordsList.length > 0) {
      const newKeywords = keywordsList.slice(0, -1).join(", ");
      onUpdateActiveAsset({ keywords: newKeywords });
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    const newKeywords = keywordsList.filter(k => k.toLowerCase() !== keywordToRemove.toLowerCase()).join(", ");
    onUpdateActiveAsset({ keywords: newKeywords });
  };

  const handlePasteKeywords = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    const newKeywordsArray = paste.split(",").map(k => k.trim()).filter(Boolean);
    const existingLower = new Set(keywordsList.map(k => k.toLowerCase()));
    const uniqueNewKeywords = newKeywordsArray.filter(k => !existingLower.has(k.toLowerCase()));
    
    if (uniqueNewKeywords.length > 0) {
      const combined = [...keywordsList, ...uniqueNewKeywords]
        .slice(0, 100)
        .join(", ");
      onUpdateActiveAsset({ keywords: combined });
    }
  };

  const isOverLimit = keywordsList.length > 50;

  return (
    <>
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Metadata Editor</h3>
          <p className="text-sm text-muted">Editing: {activeAsset.baseName}</p>
        </div>
      </div>

      <div className="space-y-5 flex-1 flex flex-col min-h-0">
        <div className="shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-muted">
                Title (Max 200 chars)
              </label>
              <button 
                onClick={() => copyToClipboard(activeAsset.title, 'title')}
                className="text-muted hover:text-foreground transition-colors p-1"
                title="Copy title"
              >
                {copiedTitle ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
            <span className="text-xs text-muted flex items-center">
              {activeAsset.title.length > 0 && (
                <>
                  <button 
                    type="button"
                    onClick={() => onUpdateActiveAsset({ title: "" })}
                    className="hover:text-foreground transition-colors"
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
            rows={3}
            className={`w-full bg-background rounded-lg p-3 text-sm text-foreground focus:outline-none transition-all resize-none border ${
              isTitleMissing
                ? 'border-destructive ring-1 ring-destructive/30 bg-destructive/5'
                : 'border-border focus:ring-2 focus:ring-primary/50 focus:border-primary'
            }`}
            placeholder="E.g., Modern 4 Options Business Card Infographic Template..."
          />
        </div>
        
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-muted">
                Keywords (Up to 50 words)
              </label>
              <button 
                onClick={() => copyToClipboard(keywordsList.join(", "), 'keywords')}
                className="text-muted hover:text-foreground transition-colors p-1"
                title="Copy keywords"
              >
                {copiedKeywords ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
            <span className={`text-xs flex items-center ${isOverLimit ? 'text-destructive font-semibold' : 'text-muted'}`}>
              {keywordsList.length > 0 && (
                <>
                  <button 
                    type="button"
                    onClick={() => onUpdateActiveAsset({ keywords: "" })}
                    className="hover:text-foreground transition-colors"
                  >
                    clear
                  </button>
                  <span className="mx-1">|</span>
                </>
              )}
              {keywordsList.length}/50
            </span>
          </div>

          {isOverLimit && (
            <div 
              data-testid="metadata-keyword-limit-warning"
              className="mb-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2.5 py-1.5 font-medium shrink-0"
            >
              ⚠️ Exceeds 50 keywords limit (Remove {keywordsList.length - 50} words to enable saving)
            </div>
          )}

          <div 
            className={`w-full flex-1 bg-background rounded-lg p-2 flex flex-col min-h-40 transition-all overflow-hidden cursor-text border ${
              isOverLimit 
                ? 'border-destructive ring-1 ring-destructive/30 bg-destructive/5' 
                : 'border-border focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary'
            }`}
            onClick={() => document.getElementById('keyword-input')?.focus()}
          >
            <div className="flex-1 overflow-y-auto flex flex-wrap content-start gap-2 p-1">
              {keywordsList.map((keyword, index) => (
                <span 
                  key={`${keyword}-${index}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border text-sm text-foreground group"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveKeyword(keyword);
                    }}
                    className="text-muted hover:text-destructive focus:outline-none transition-colors"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
              <input
                id="keyword-input"
                data-testid="metadata-keywords-input"
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleAddKeyword}
                onPaste={handlePasteKeywords}
                placeholder={keywordsList.length === 0 ? "Add keywords (comma or enter to separate)..." : ""}
                className="flex-1 min-w-35 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-foreground py-1.5 px-1"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2.5 shrink-0">
        <button 
          onClick={handleSave}
          disabled={activeAsset.status === "embedding" || activeAsset.status === "converting_preview" || isOverLimit || keywordsList.length === 0}
          data-testid="save-metadata-btn"
          className="w-full bg-primary hover:bg-blue-700 text-primary-foreground py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {activeAsset.status === "embedding"
            ? "Saving and Embedding..."
            : isOverLimit
            ? `Exceeds 50 Keywords (Remove ${keywordsList.length - 50} to Save)`
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
