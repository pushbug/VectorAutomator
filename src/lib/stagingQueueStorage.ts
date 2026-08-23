import { Asset } from "@/context/AssetContext";

const DB_NAME = "VectorAutomatorDB";
const DB_VERSION = 1;
const STORE_NAME = "staging_assets";

export interface StagingAssetRecord {
  id: string;
  baseName: string;
  epsFile?: File | Blob;
  jpgFile?: File | Blob;
  title: string;
  keywords: string;
  status: Asset["status"];
  errorMsg?: string;
  downloadPaths?: string[];
  selectedForImport?: boolean;
  updatedAt: number;
}

/**
 * Checks whether IndexedDB is available in the current runtime environment (SSR safe).
 */
export function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

/**
 * Opens or upgrades the IndexedDB database for staging assets.
 */
export function openStagingDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error("IndexedDB open error:", request.error);
        resolve(null);
      };
    } catch (err) {
      console.error("Failed to initialize IndexedDB:", err);
      resolve(null);
    }
  });
}

/**
 * Saves or overwrites a full asset record (including binary Blobs/Files) into IndexedDB.
 */
export async function saveStagingAsset(asset: Asset): Promise<void> {
  const db = await openStagingDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const record: StagingAssetRecord = {
        id: asset.id,
        baseName: asset.baseName,
        epsFile: asset.epsFile,
        jpgFile: asset.jpgFile,
        title: asset.title || "",
        keywords: asset.keywords || "",
        status: asset.status,
        errorMsg: asset.errorMsg,
        downloadPaths: asset.downloadPaths,
        selectedForImport: asset.selectedForImport ?? false,
        updatedAt: Date.now(),
      };

      const putRequest = store.put(record);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = (err) => {
        console.error("Failed to save asset to IndexedDB:", err);
        resolve();
      };
    } catch (err) {
      console.error("IndexedDB save transaction error:", err);
      resolve();
    }
  });
}

/**
 * Selectively updates metadata (title, keywords, status, flags) without re-serializing binary Blobs.
 * Highly optimized for keystroke typing in MetadataEditor.
 */
export async function updateStagingMetadata(
  id: string,
  updates: Partial<Pick<Asset, "title" | "keywords" | "status" | "errorMsg" | "downloadPaths" | "selectedForImport">>
): Promise<void> {
  const db = await openStagingDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const record = getRequest.result as StagingAssetRecord | undefined;
        if (!record) {
          resolve();
          return;
        }

        if (updates.title !== undefined) record.title = updates.title;
        if (updates.keywords !== undefined) record.keywords = updates.keywords;
        if (updates.status !== undefined) record.status = updates.status;
        if (updates.errorMsg !== undefined) record.errorMsg = updates.errorMsg;
        if (updates.downloadPaths !== undefined) record.downloadPaths = updates.downloadPaths;
        if (updates.selectedForImport !== undefined) record.selectedForImport = updates.selectedForImport;
        record.updatedAt = Date.now();

        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => resolve();
      };

      getRequest.onerror = () => resolve();
    } catch (err) {
      console.error("IndexedDB update metadata transaction error:", err);
      resolve();
    }
  });
}

/**
 * Loads all staging assets from IndexedDB, recovers interrupted states, and recreates blob preview URLs.
 */
export async function loadAllStagingAssets(): Promise<Asset[]> {
  const db = await openStagingDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result as StagingAssetRecord[]) || [];
        const assets: Asset[] = records.map((rec) => {
          // Re-create object URL from stored Blob/File for browser rendering
          let previewUrl: string | undefined = undefined;
          if (rec.jpgFile && typeof window !== "undefined" && window.URL) {
            try {
              previewUrl = URL.createObjectURL(rec.jpgFile);
            } catch (e) {
              console.warn("Failed to create ObjectURL for restored jpgFile:", e);
            }
          }

          // Recover interrupted async states back to idle
          const status =
            rec.status === "converting_preview" || rec.status === "embedding" || rec.status === "uploading"
              ? "idle"
              : rec.status;

          return {
            id: rec.id,
            baseName: rec.baseName,
            epsFile: rec.epsFile instanceof File ? rec.epsFile : rec.epsFile ? new File([rec.epsFile], `${rec.baseName}.eps`, { type: "application/postscript" }) : undefined,
            jpgFile: rec.jpgFile instanceof File ? rec.jpgFile : rec.jpgFile ? new File([rec.jpgFile], `${rec.baseName}.jpg`, { type: "image/jpeg" }) : undefined,
            title: rec.title,
            keywords: rec.keywords,
            status,
            errorMsg: rec.errorMsg,
            downloadPaths: rec.downloadPaths,
            previewUrl,
            selectedForImport: rec.selectedForImport,
          };
        });

        resolve(assets);
      };

      request.onerror = () => {
        console.error("Failed to load staging assets from IndexedDB:", request.error);
        resolve([]);
      };
    } catch (err) {
      console.error("IndexedDB load transaction error:", err);
      resolve([]);
    }
  });
}

/**
 * Deletes a single staging asset record from IndexedDB.
 */
export async function deleteStagingAsset(id: string): Promise<void> {
  const db = await openStagingDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Deletes multiple staging asset records from IndexedDB in a single transaction.
 */
export async function deleteMultipleStagingAssets(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openStagingDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      ids.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Clears all staging assets from the IndexedDB store.
 */
export async function clearStagingDB(): Promise<void> {
  const db = await openStagingDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
