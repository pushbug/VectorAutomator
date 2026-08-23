import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveStagingAsset,
  updateStagingMetadata,
  loadAllStagingAssets,
  deleteStagingAsset,
  deleteMultipleStagingAssets,
  clearStagingDB,
  isIndexedDBAvailable
} from "@/lib/stagingQueueStorage";
import { Asset } from "@/context/AssetContext";

// Simple in-memory mock for IndexedDB
class MockIDBDatabase {
  records = new Map<string, any>();
  objectStoreNames = {
    contains: (name: string) => name === "staging_assets"
  };

  transaction(storeName: string, mode: "readonly" | "readwrite") {
    const store = {
      put: (record: any) => {
        this.records.set(record.id, { ...record });
        const req: any = { onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      },
      get: (id: string) => {
        const record = this.records.get(id);
        const req: any = { onsuccess: null, onerror: null, result: record ? { ...record } : undefined };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      },
      getAll: () => {
        const list = Array.from(this.records.values());
        const req: any = { onsuccess: null, onerror: null, result: list };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      },
      delete: (id: string) => {
        this.records.delete(id);
        const req: any = { onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      },
      clear: () => {
        this.records.clear();
        const req: any = { onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      }
    };

    const tx: any = {
      objectStore: () => store,
      oncomplete: null,
      onerror: null
    };

    setTimeout(() => tx.oncomplete?.(), 0);
    return tx;
  }
}

describe("stagingQueueStorage (UT-STAGING-QUEUE-PERSIST-01)", () => {
  let mockDb: MockIDBDatabase;

  beforeEach(() => {
    mockDb = new MockIDBDatabase();
    
    // Mock window.indexedDB
    const mockIndexedDB = {
      open: vi.fn().mockImplementation(() => {
        const req: any = {
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: mockDb
        };
        setTimeout(() => {
          req.onupgradeneeded?.({ target: req });
          req.onsuccess?.({ target: req });
        }, 0);
        return req;
      })
    };

    vi.stubGlobal("indexedDB", mockIndexedDB);
    if (typeof window !== "undefined") {
      window.indexedDB = mockIndexedDB as any;
    }

    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-preview");
  });

  it("checks availability correctly", () => {
    expect(isIndexedDBAvailable()).toBe(true);
  });

  it("saves a full staging asset with File/Blob and loads it back", async () => {
    const dummyJpg = new File(["dummy jpg content"], "vector-01.jpg", { type: "image/jpeg" });
    const dummyEps = new File(["dummy eps content"], "vector-01.eps", { type: "application/postscript" });

    const asset: Asset = {
      id: "vector-01",
      baseName: "vector-01",
      jpgFile: dummyJpg,
      epsFile: dummyEps,
      title: "Modern Vector Illustration",
      keywords: "vector, illustration, design",
      status: "idle",
      selectedForImport: true
    };

    await saveStagingAsset(asset);

    const loaded = await loadAllStagingAssets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("vector-01");
    expect(loaded[0].title).toBe("Modern Vector Illustration");
    expect(loaded[0].keywords).toBe("vector, illustration, design");
    expect(loaded[0].jpgFile).toBeDefined();
    expect(loaded[0].epsFile).toBeDefined();
    expect(loaded[0].previewUrl).toBe("blob:http://localhost/mock-preview");
  });

  it("selectively updates metadata without corrupting binary files", async () => {
    const dummyJpg = new File(["dummy jpg content"], "vector-02.jpg", { type: "image/jpeg" });

    const asset: Asset = {
      id: "vector-02",
      baseName: "vector-02",
      jpgFile: dummyJpg,
      title: "Old Title",
      keywords: "old, keywords",
      status: "idle"
    };

    await saveStagingAsset(asset);

    // Update metadata only
    await updateStagingMetadata("vector-02", {
      title: "Updated Clean Title",
      keywords: "updated, clean, keywords",
      status: "modified"
    });

    const loaded = await loadAllStagingAssets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe("Updated Clean Title");
    expect(loaded[0].keywords).toBe("updated, clean, keywords");
    expect(loaded[0].status).toBe("modified");
    expect(loaded[0].jpgFile).toBeDefined();
  });

  it("recovers interrupted transient statuses back to idle upon reload", async () => {
    const asset: Asset = {
      id: "vector-03",
      baseName: "vector-03",
      title: "Interrupted Process",
      keywords: "process",
      status: "converting_preview"
    };

    await saveStagingAsset(asset);

    const loaded = await loadAllStagingAssets();
    expect(loaded[0].status).toBe("idle");
  });

  it("deletes single and multiple staging assets and clears DB", async () => {
    await saveStagingAsset({ id: "v-1", baseName: "v-1", title: "T1", keywords: "K1", status: "idle" });
    await saveStagingAsset({ id: "v-2", baseName: "v-2", title: "T2", keywords: "K2", status: "idle" });
    await saveStagingAsset({ id: "v-3", baseName: "v-3", title: "T3", keywords: "K3", status: "idle" });

    let loaded = await loadAllStagingAssets();
    expect(loaded).toHaveLength(3);

    // Delete single
    await deleteStagingAsset("v-1");
    loaded = await loadAllStagingAssets();
    expect(loaded).toHaveLength(2);
    expect(loaded.find(a => a.id === "v-1")).toBeUndefined();

    // Delete multiple
    await deleteMultipleStagingAssets(["v-2"]);
    loaded = await loadAllStagingAssets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe("v-3");

    // Clear all
    await clearStagingDB();
    loaded = await loadAllStagingAssets();
    expect(loaded).toHaveLength(0);
  });
});
