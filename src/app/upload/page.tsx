"use client";

import { useAssetProcessor } from "@/hooks/useAssetProcessor";
import { Dropzone } from "@/components/upload/Dropzone";
import { AssetQueue } from "@/components/upload/AssetQueue";
import { MetadataEditor } from "@/components/upload/MetadataEditor";


export default function UploadPage() {
  const {
    assetList,
    activeAsset,
    activeAssetId,
    setActiveAssetId,
    processDroppedFiles,
    removeAsset,
    updateActiveAsset,
    embedExifForAsset
  } = useAssetProcessor();

  return (
    <div className="max-w-7xl mx-auto space-y-6 h-auto lg:h-[calc(100vh-4rem)] flex flex-col">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Process & Upload</h1>
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
