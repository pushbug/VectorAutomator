"use client";

import { useState } from "react";
import { useAssetProcessor } from "@/hooks/useAssetProcessor";
import { Dropzone } from "@/components/upload/Dropzone";
import { AssetQueue } from "@/components/upload/AssetQueue";
import { MetadataEditor } from "@/components/upload/MetadataEditor";
import { FolderPlus } from "lucide-react";

export default function UploadPage() {
  const {
    assetList,
    activeAsset,
    activeAssetId,
    setActiveAssetId,
    processDroppedFiles,
    removeAsset,
    updateActiveAsset,
    embedExifForAsset,
    toggleSelectForImport,
    selectAllForImport,
    importSelectedToPortfolio
  } = useAssetProcessor();

  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedCount = assetList.filter(a => a.selectedForImport).length;

  const handleBatchImport = async () => {
    if (selectedCount === 0 || isImporting) return;
    setIsImporting(true);
    setImportMessage(null);

    try {
      const res = await importSelectedToPortfolio();
      if (res.successCount > 0 && res.failedCount === 0) {
        setImportMessage({ type: 'success', text: `Imported ${res.successCount} asset(s) to Portfolio successfully!` });
      } else if (res.successCount > 0 && res.failedCount > 0) {
        setImportMessage({ type: 'error', text: `Imported ${res.successCount}, failed ${res.failedCount}. Check error tags in queue.` });
      } else if (res.failedCount > 0) {
        setImportMessage({ type: 'error', text: `Failed to import: ${res.errors[0] || 'Check queue errors'}` });
      }
    } catch (err: any) {
      setImportMessage({ type: 'error', text: err.message || 'Import failed' });
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportMessage(null), 5000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 h-auto lg:h-[calc(100vh-4rem)] flex flex-col">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Process & Upload</h1>
        </div>
        <div className="flex items-center gap-3">
          {importMessage && (
            <span className={`text-xs px-3 py-1.5 rounded-lg border ${
              importMessage.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                : 'bg-destructive/10 text-destructive border-destructive/20'
            }`}>
              {importMessage.text}
            </span>
          )}
          <button
            type="button"
            data-testid="batch-import-portfolio-btn"
            onClick={handleBatchImport}
            disabled={selectedCount === 0 || isImporting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FolderPlus size={16} />
            {isImporting ? "Importing to Portfolio..." : `Import to Portfolio (${selectedCount})`}
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:min-h-0">
        {/* Left Column: Asset List */}
        <div className="lg:col-span-5 flex flex-col space-y-4 lg:min-h-0">
          <Dropzone onProcessFiles={processDroppedFiles} />
          <AssetQueue
            assetList={assetList}
            activeAssetId={activeAssetId}
            onSetActiveAssetId={setActiveAssetId}
            onRemoveAsset={removeAsset}
            onToggleSelectForImport={toggleSelectForImport}
            onSelectAllForImport={selectAllForImport}
          />
        </div>

        {/* Right Column: Active Metadata Editor */}
        <div className="lg:col-span-7 bg-surface rounded-xl border border-border p-6 flex flex-col h-full shadow-sm relative overflow-hidden lg:min-h-0">
          <MetadataEditor
            activeAsset={activeAsset}
            onUpdateActiveAsset={updateActiveAsset}
            onEmbedExifForAsset={embedExifForAsset}
          />
        </div>
      </div>
    </div>
  );
}

