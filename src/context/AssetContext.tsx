"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface Asset {
  id: string;
  baseName: string;
  epsFile?: File;
  jpgFile?: File;
  title: string;
  keywords: string;
  status: "idle" | "converting_preview" | "generating" | "embedding" | "uploading" | "done" | "error" | "modified";
  errorMsg?: string;
  downloadPaths?: string[];
  previewUrl?: string;
}

interface AssetContextType {
  assets: Record<string, Asset>;
  setAssets: React.Dispatch<React.SetStateAction<Record<string, Asset>>>;
  activeAssetId: string | null;
  setActiveAssetId: React.Dispatch<React.SetStateAction<string | null>>;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export function AssetProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Record<string, Asset>>({});
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);

  return (
    <AssetContext.Provider value={{ assets, setAssets, activeAssetId, setActiveAssetId }}>
      {children}
    </AssetContext.Provider>
  );
}

export function useAssets() {
  const context = useContext(AssetContext);
  if (context === undefined) {
    throw new Error("useAssets must be used within an AssetProvider");
  }
  return context;
}
