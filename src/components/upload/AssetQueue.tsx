import { X, Image as ImageIcon, CheckCircle2, AlertCircle, CheckSquare, Square } from "lucide-react";
import { Asset } from "@/context/AssetContext";

interface AssetQueueProps {
  assetList: Asset[];
  activeAssetId: string | null;
  onSetActiveAssetId: (id: string | null) => void;
  onRemoveAsset: (id: string, e: React.MouseEvent) => void;
  onToggleSelectForImport: (id: string, e?: React.MouseEvent) => void;
  onSelectAllForImport: (selected: boolean) => void;
}

export function AssetQueue({
  assetList,
  activeAssetId,
  onSetActiveAssetId,
  onRemoveAsset,
  onToggleSelectForImport,
  onSelectAllForImport
}: AssetQueueProps) {
  const allSelected = assetList.length > 0 && assetList.every(a => a.selectedForImport);
  const selectedCount = assetList.filter(a => a.selectedForImport).length;

  return (
    <div className="flex-1 bg-surface rounded-xl border border-border overflow-hidden flex flex-col min-h-0">
      <div className="p-3 border-b border-border bg-surface-hover flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">Asset Queue ({assetList.length})</h4>
          {selectedCount > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
              {selectedCount} selected
            </span>
          )}
        </div>
        {assetList.length > 0 && (
          <button
            type="button"
            data-testid="asset-select-all-btn"
            onClick={() => onSelectAllForImport(!allSelected)}
            className="text-xs text-muted hover:text-foreground font-medium transition-colors cursor-pointer"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {assetList.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted text-sm italic py-10">
            No assets loaded. Drop files above.
          </div>
        ) : (
          assetList.map((asset) => {
            const isSelected = !!asset.selectedForImport;
            const isCurrentActive = activeAssetId === asset.id;

            return (
              <div
                key={asset.id}
                data-testid={`asset-queue-item-${asset.id}`}
                onClick={() => onSetActiveAssetId(asset.id)}
                className={`relative flex flex-col rounded-xl border cursor-pointer transition-all overflow-hidden ${
                  isCurrentActive 
                    ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary/40" 
                    : isSelected
                    ? "bg-surface border-primary/60 shadow-sm"
                    : "bg-background border-border hover:border-primary/50"
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => onRemoveAsset(asset.id, e)}
                  className="absolute top-2 right-2 bg-black/40 hover:bg-destructive text-white p-1.5 rounded-full shrink-0 z-10 transition-colors cursor-pointer"
                  title="Remove asset"
                >
                  <X size={14} />
                </button>
                
                <div className="w-full bg-surface-hover relative border-b border-border flex items-center justify-center min-h-30">
                  {asset.previewUrl ? (
                    <img src={asset.previewUrl} alt={asset.baseName} className="w-full h-auto object-contain" />
                  ) : asset.status === "converting_preview" ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="flex h-6 w-6 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-6 w-6 bg-primary"></span></span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted">
                      <ImageIcon size={32} />
                    </div>
                  )}
                </div>
                
                <div className="p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        data-testid={`asset-select-checkbox-${asset.id}`}
                        onClick={(e) => onToggleSelectForImport(asset.id, e)}
                        className={`shrink-0 p-0.5 rounded transition-colors cursor-pointer ${
                          isSelected ? "text-primary hover:text-primary/80" : "text-muted hover:text-foreground"
                        }`}
                        title={isSelected ? "Uncheck for Portfolio" : "Check to Import to Portfolio"}
                      >
                        {isSelected ? <CheckSquare size={18} className="text-primary" /> : <Square size={18} />}
                      </button>
                      <span className="text-sm font-medium text-foreground truncate">
                        {asset.baseName}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      {asset.status === "done" && <span title="Saved"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></span>}
                      {asset.status === "modified" && <span title="Unsaved changes"><CheckCircle2 className="w-5 h-5 text-orange-500" /></span>}
                      {asset.status === "error" && <span title={asset.errorMsg || "Error"}><AlertCircle className="w-5 h-5 text-destructive" /></span>}
                      {(asset.status === "generating" || asset.status === "embedding" || asset.status === "uploading") && (
                        <span className="flex h-4 w-4 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span></span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted pl-6">
                    <span>
                      {(() => {
                        const totalSize = (asset.epsFile?.size || 0) + (asset.jpgFile?.size || 0);
                        if (totalSize === 0) return 'Unknown size';
                        const k = 1024;
                        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                        const i = Math.floor(Math.log(totalSize) / Math.log(k));
                        return `${parseFloat((totalSize / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
                      })()}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] text-primary font-medium">Ready for Import</span>
                    )}
                  </div>
                  
                  {asset.errorMsg && asset.status === "error" && (
                    <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded p-1.5 mt-1">
                      {asset.errorMsg}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
