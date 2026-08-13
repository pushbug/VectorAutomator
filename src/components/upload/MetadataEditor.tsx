import { Asset } from "@/context/AssetContext";
import { useState, KeyboardEvent, ClipboardEvent } from "react";
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
      if (newKeyword && !keywordsList.includes(newKeyword)) {
        const newKeywords = [...keywordsList, newKeyword]
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
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
    const newKeywords = keywordsList.filter(k => k !== keywordToRemove).join(", ");
    onUpdateActiveAsset({ keywords: newKeywords });
  };

  const handlePasteKeywords = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    const newKeywordsArray = paste.split(",").map(k => k.trim()).filter(Boolean);
    const uniqueNewKeywords = newKeywordsArray.filter(k => !keywordsList.includes(k));
    
    if (uniqueNewKeywords.length > 0) {
      const newKeywords = [...keywordsList, ...uniqueNewKeywords]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
        .join(", ");
      onUpdateActiveAsset({ keywords: newKeywords });
    }
  };

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
            rows={2}
            value={activeAsset.title}
            data-testid="metadata-title-input"
            onChange={(e) => onUpdateActiveAsset({ title: e.target.value })}
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
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
            <span className="text-xs text-muted flex items-center">
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
          <div 
            className="w-full flex-1 bg-background border border-border rounded-lg p-2 flex flex-col min-h-40 focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all overflow-hidden cursor-text"
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

      <div className="mt-8 pt-6 border-t border-border flex flex-col gap-3 shrink-0">
        <button 
          onClick={() => onEmbedExifForAsset(activeAsset.id)}
          disabled={activeAsset.status === "embedding" || activeAsset.status === "converting_preview"}
          data-testid="save-metadata-btn"
          className="w-full bg-primary hover:bg-blue-700 text-primary-foreground px-4 py-3 rounded-lg font-medium transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {activeAsset.status === "embedding" ? "Saving and Embedding..." : "Save Metadata"}
        </button>
        
        <div className="flex gap-3">
          {(() => {
            const epsPath = activeAsset.downloadPaths?.find(p => p.toLowerCase().endsWith('.eps'));
            if (epsPath) {
              return (
                 <a href={`/api/file/download?path=${encodeURIComponent(epsPath)}`} download data-testid="download-eps-btn" className="flex-1 bg-surface-hover hover:bg-border text-foreground px-4 py-3 rounded-lg font-medium transition-colors shadow-sm border border-border flex items-center justify-center gap-2 text-center">
                   Download EPS
                 </a>
              );
            }
            return (
               <button disabled data-testid="download-eps-btn" className="flex-1 bg-surface-hover/50 text-muted px-4 py-3 rounded-lg font-medium border border-border/50 flex items-center justify-center gap-2 cursor-not-allowed">
                 Download EPS
               </button>
            );
          })()}
          
          {(() => {
            const jpgPath = activeAsset.downloadPaths?.find(p => p.toLowerCase().endsWith('.jpg') || p.toLowerCase().endsWith('.jpeg'));
            if (jpgPath) {
              return (
                 <a href={`/api/file/download?path=${encodeURIComponent(jpgPath)}`} download data-testid="download-jpg-btn" className="flex-1 bg-surface-hover hover:bg-border text-foreground px-4 py-3 rounded-lg font-medium transition-colors shadow-sm border border-border flex items-center justify-center gap-2 text-center">
                   Download JPG
                 </a>
              );
            }
            return (
               <button disabled data-testid="download-jpg-btn" className="flex-1 bg-surface-hover/50 text-muted px-4 py-3 rounded-lg font-medium border border-border/50 flex items-center justify-center gap-2 cursor-not-allowed">
                 Download JPG
               </button>
            );
          })()}
        </div>
      </div>
    </>
  );
}
