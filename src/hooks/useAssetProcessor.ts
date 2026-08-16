import { useAssets, Asset } from "@/context/AssetContext";

export function useAssetProcessor() {
  const { assets, setAssets, activeAssetId, setActiveAssetId } = useAssets();
  const assetList = Object.values(assets);
  const activeAsset = activeAssetId ? assets[activeAssetId] : null;

  const processDroppedFiles = (files: File[]) => {
    const validFiles = files.filter(f => f.name.toLowerCase().endsWith(".jpg") || f.name.toLowerCase().endsWith(".eps"));
    
    setAssets(prev => {
      const newAssets = { ...prev };
      
      validFiles.forEach(file => {
        const match = file.name.match(/^(.*)\.(eps|jpg|jpeg)$/i);
        if (!match) return;
        
        const baseName = match[1];
        const ext = match[2].toLowerCase();
        
        if (!newAssets[baseName]) {
          newAssets[baseName] = {
            id: baseName,
            baseName,
            title: "",
            keywords: "",
            status: "idle"
          };
        }
        
        if (ext === "eps") newAssets[baseName].epsFile = file;
        else {
          newAssets[baseName].jpgFile = file;
          if (!newAssets[baseName].previewUrl) {
            newAssets[baseName].previewUrl = URL.createObjectURL(file);
          }
        }
      });
      
      if (!activeAssetId && Object.keys(newAssets).length > 0) {
        setActiveAssetId(Object.keys(newAssets)[0]);
      }
      
      const assetsToConvert: { id: string, file: File }[] = [];
      Object.values(newAssets).forEach(asset => {
        if (asset.epsFile && !asset.jpgFile && asset.status === "idle") {
          asset.status = "converting_preview";
          assetsToConvert.push({ id: asset.id, file: asset.epsFile });
        }
      });
      
      if (assetsToConvert.length > 0) {
        setTimeout(() => {
          assetsToConvert.forEach(({ id, file }) => convertEpsToJpg(id, file));
        }, 0);
      }
      
      return newAssets;
    });
  };

  const convertEpsToJpg = async (id: string, epsFile: File) => {
    try {
      const formData = new FormData();
      formData.append("eps", epsFile);
      
      const res = await fetch("/api/file/convert", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to convert EPS");
      }
      
      const blob = await res.blob();
      const jpgFile = new File([blob], epsFile.name.replace(/\.eps$/i, ".jpg"), { type: "image/jpeg" });
      const previewUrl = URL.createObjectURL(blob);
      
      setAssets(prev => {
        if (!prev[id]) return prev;
        return {
          ...prev,
          [id]: {
            ...prev[id],
            jpgFile,
            previewUrl,
            status: "idle"
          }
        };
      });
    } catch (err: any) {
      console.error(err);
      setAssets(prev => ({ ...prev, [id]: { ...prev[id], status: "error", errorMsg: err.message } }));
    }
  };

  const removeAsset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssets(prev => {
      const newAssets = { ...prev };
      delete newAssets[id];
      
      if (activeAssetId === id) {
        const remainingKeys = Object.keys(newAssets);
        setActiveAssetId(remainingKeys.length > 0 ? remainingKeys[0] : null);
      }
      
      return newAssets;
    });
  };

  const updateActiveAsset = (updates: Partial<Asset>) => {
    if (!activeAssetId) return;
    setAssets(prev => {
      const currentAsset = prev[activeAssetId];
      const newStatus = (currentAsset.status === "done" && (updates.title !== undefined || updates.keywords !== undefined)) 
        ? "modified" 
        : (updates.status || currentAsset.status);
      
      return {
        ...prev,
        [activeAssetId]: { ...currentAsset, ...updates, status: newStatus }
      };
    });
  };

  const generateMetadataForAsset = async (id: string) => {
    const asset = assets[id];
    const imageFile = asset.jpgFile || asset.epsFile;
    if (!imageFile) return;

    setAssets(prev => ({ ...prev, [id]: { ...prev[id], status: "generating" } }));
    
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      
      const res = await fetch("/api/ai/metadata", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate metadata");
      
      setAssets(prev => {
        if (!prev[id]) return prev;
        return {
          ...prev,
          [id]: {
            ...prev[id],
            title: data.title || "",
            keywords: data.keywords || "",
            status: "idle"
          }
        };
      });
    } catch (err: any) {
      console.error(err);
      setAssets(prev => ({ ...prev, [id]: { ...prev[id], status: "error", errorMsg: err.message } }));
    }
  };

  const batchGenerateMetadata = async () => {
    const idleAssets = assetList.filter(a => !a.title && !a.keywords && a.status === "idle");
    for (const asset of idleAssets) {
      await generateMetadataForAsset(asset.id);
    }
  };

  const embedExifForAsset = async (id: string) => {
    const asset = assets[id];
    if (!asset.title || !asset.keywords) return;
    
    setAssets(prev => ({ ...prev, [id]: { ...prev[id], status: "embedding" } }));
    
    try {
      const formData = new FormData();
      if (asset.epsFile) formData.append("eps", asset.epsFile);
      if (asset.jpgFile) formData.append("jpg", asset.jpgFile);
      formData.append("title", asset.title);
      formData.append("keywords", asset.keywords);
      
      const res = await fetch("/api/file/exif", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to embed EXIF");
      
      setAssets(prev => {
        if (!prev[id]) return prev;
        return { 
          ...prev, 
          [id]: { 
            ...prev[id], 
            status: "done",
            downloadPaths: data.archivedFiles || [] 
          } 
        };
      });
    } catch (err: any) {
      console.error(err);
      setAssets(prev => ({ ...prev, [id]: { ...prev[id], status: "error", errorMsg: err.message } }));
    }
  };

  const batchEmbedExif = async () => {
    const readyAssets = assetList.filter(a => a.title && a.keywords && (a.status === "idle" || a.status === "modified"));
    for (const asset of readyAssets) {
      await embedExifForAsset(asset.id);
    }
  };

  const toggleSelectForImport = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAssets(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], selectedForImport: !prev[id].selectedForImport }
      };
    });
  };

  const selectAllForImport = (selected: boolean) => {
    setAssets(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id] = { ...updated[id], selectedForImport: selected };
      });
      return updated;
    });
  };

  const importSelectedToPortfolio = async (): Promise<{ successCount: number; failedCount: number; errors: string[] }> => {
    const selectedAssets = assetList.filter(a => a.selectedForImport);
    if (selectedAssets.length === 0) return { successCount: 0, failedCount: 0, errors: [] };

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const idsToRemove: string[] = [];

    setAssets(prev => {
      const updated = { ...prev };
      selectedAssets.forEach(a => {
        if (updated[a.id]) {
          updated[a.id] = { ...updated[a.id], status: "uploading", errorMsg: undefined };
        }
      });
      return updated;
    });

    for (const asset of selectedAssets) {
      if (!asset.jpgFile) {
        failedCount++;
        errors.push(`${asset.baseName}: JPG file missing`);
        setAssets(prev => prev[asset.id] ? { ...prev, [asset.id]: { ...prev[asset.id], status: "error", errorMsg: "JPG file missing" } } : prev);
        continue;
      }

      if (!asset.title?.trim() || !asset.keywords?.trim()) {
        failedCount++;
        errors.push(`${asset.baseName}: Title and Keywords are required`);
        setAssets(prev => prev[asset.id] ? { ...prev, [asset.id]: { ...prev[asset.id], status: "error", errorMsg: "Title and Keywords are required" } } : prev);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", asset.jpgFile);
        formData.append("title", asset.title.trim());
        formData.append("keywords", asset.keywords.trim());
        formData.append("uploadDate", new Date().toISOString().split("T")[0]);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to import image");
        }

        successCount++;
        idsToRemove.push(asset.id);
      } catch (err: any) {
        failedCount++;
        errors.push(`${asset.baseName}: ${err.message || "Failed to import"}`);
        setAssets(prev => prev[asset.id] ? { ...prev, [asset.id]: { ...prev[asset.id], status: "error", errorMsg: err.message } } : prev);
      }
    }

    if (idsToRemove.length > 0) {
      setAssets(prev => {
        const updated = { ...prev };
        idsToRemove.forEach(id => {
          delete updated[id];
        });
        return updated;
      });

      if (activeAssetId && idsToRemove.includes(activeAssetId)) {
        const remaining = assetList.filter(a => !idsToRemove.includes(a.id));
        setActiveAssetId(remaining.length > 0 ? remaining[0].id : null);
      }
    }

    return { successCount, failedCount, errors };
  };

  return {
    assets,
    assetList,
    activeAsset,
    activeAssetId,
    setActiveAssetId,
    processDroppedFiles,
    removeAsset,
    updateActiveAsset,
    generateMetadataForAsset,
    batchGenerateMetadata,
    embedExifForAsset,
    batchEmbedExif,
    toggleSelectForImport,
    selectAllForImport,
    importSelectedToPortfolio
  };
}
