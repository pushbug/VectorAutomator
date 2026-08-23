"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loadAllStagingAssets } from "@/lib/stagingQueueStorage";

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
  selectedForImport?: boolean;
}

interface AssetContextType {
  assets: Record<string, Asset>;
  setAssets: React.Dispatch<React.SetStateAction<Record<string, Asset>>>;
  activeAssetId: string | null;
  setActiveAssetId: React.Dispatch<React.SetStateAction<string | null>>;
  isHydrated: boolean;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export function AssetProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Record<string, Asset>>({});
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Client-side hydration from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;

    loadAllStagingAssets()
      .then((loadedAssets) => {
        if (!isMounted) return;

        if (loadedAssets.length > 0) {
          const map: Record<string, Asset> = {};
          loadedAssets.forEach((a) => {
            map[a.id] = a;
          });

          setAssets(map);
          setActiveAssetId((prev) => prev || loadedAssets[0].id);
        }
        setIsHydrated(true);
      })
      .catch((err) => {
        console.error("Failed to rehydrate staging queue:", err);
        if (isMounted) setIsHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AssetContext.Provider value={{ assets, setAssets, activeAssetId, setActiveAssetId, isHydrated }}>
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
