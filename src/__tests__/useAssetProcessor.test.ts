import { renderHook, act } from '@testing-library/react';
import { useAssetProcessor } from '@/hooks/useAssetProcessor';
import { AssetProvider } from '@/context/AssetContext';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as storage from '@/lib/stagingQueueStorage';

describe('useAssetProcessor', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        blob: () => Promise.resolve(new Blob(['mock-blob'], { type: 'image/jpeg' }))
      })
    ));
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-preview');
    global.URL.revokeObjectURL = vi.fn();
    vi.spyOn(storage, 'loadAllStagingAssets').mockResolvedValue([]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('processes dropped files correctly', async () => {
    let result: any;
    await act(async () => {
      const hook = renderHook(() => useAssetProcessor(), { wrapper: AssetProvider });
      result = hook.result;
    });

    const file1 = new File([''], 'test1.eps', { type: 'application/postscript' });
    const file2 = new File([''], 'test1.jpg', { type: 'image/jpeg' });

    await act(async () => {
      result.current.processDroppedFiles([file1, file2]);
    });

    expect(result.current.assetList.length).toBe(1);
    expect(result.current.assetList[0].baseName).toBe('test1');
    expect(result.current.assetList[0].title).toBe('test1');
    expect(result.current.assetList[0].epsFile).toBe(file1);
    expect(result.current.assetList[0].jpgFile).toBe(file2);
    expect(result.current.activeAssetId).toBe('test1');
  });

  it('removes asset correctly and revokes object preview URL', async () => {
    let result: any;
    await act(async () => {
      const hook = renderHook(() => useAssetProcessor(), { wrapper: AssetProvider });
      result = hook.result;
    });

    const file1 = new File([''], 'test1.jpg', { type: 'image/jpeg' });
    await act(async () => {
      result.current.processDroppedFiles([file1]);
    });
    expect(result.current.assetList.length).toBe(1);

    await act(async () => {
      // Mock event
      result.current.removeAsset('test1', { stopPropagation: vi.fn() } as any);
    });

    expect(result.current.assetList.length).toBe(0);
    expect(result.current.activeAssetId).toBeNull();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('updates status to modified when editing a done asset', async () => {
    let result: any;
    await act(async () => {
      const hook = renderHook(() => useAssetProcessor(), { wrapper: AssetProvider });
      result = hook.result;
    });

    const file1 = new File([''], 'test1.jpg', { type: 'image/jpeg' });
    await act(async () => {
      result.current.processDroppedFiles([file1]);
    });
    
    await act(async () => {
      result.current.setActiveAssetId('test1');
    });

    // Manually force status to 'done' (simulating successful save)
    await act(async () => {
      result.current.updateActiveAsset({ status: 'done', title: 'old title' });
    });
    expect(result.current.assetList[0].status).toBe('done');

    // Update title -> should change to modified
    await act(async () => {
      result.current.updateActiveAsset({ title: 'new title' });
    });

    expect(result.current.assetList[0].status).toBe('modified');
    expect(result.current.assetList[0].title).toBe('new title');
  });

  it('UT-IMPORT-QUEUE-01: toggles selection and imports selected assets with queue clearing', async () => {
    let result: any;
    await act(async () => {
      const hook = renderHook(() => useAssetProcessor(), { wrapper: AssetProvider });
      result = hook.result;
    });

    const file1 = new File(['dummy-1'], 'item1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['dummy-2'], 'item2.jpg', { type: 'image/jpeg' });

    await act(async () => {
      result.current.processDroppedFiles([file1, file2]);
    });

    expect(result.current.assetList.length).toBe(2);

    // Toggle item1 selection
    await act(async () => {
      result.current.toggleSelectForImport('item1');
    });
    expect(result.current.assets['item1'].selectedForImport).toBe(true);
    expect(result.current.assets['item2'].selectedForImport).toBeFalsy();

    // Select all
    await act(async () => {
      result.current.selectAllForImport(true);
    });
    expect(result.current.assets['item1'].selectedForImport).toBe(true);
    expect(result.current.assets['item2'].selectedForImport).toBe(true);

    // Give both valid metadata
    await act(async () => {
      result.current.setActiveAssetId('item1');
    });
    await act(async () => {
      result.current.updateActiveAsset({ title: 'Item 1 Title', keywords: 'vector, icon' });
    });

    await act(async () => {
      result.current.setActiveAssetId('item2');
    });
    await act(async () => {
      result.current.updateActiveAsset({ title: 'Item 2 Title', keywords: 'banner, design' });
    });

    // Mock successful upload response
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'img-123', code: '2608-1' }),
      })
    ));

    let importRes: any;
    await act(async () => {
      importRes = await result.current.importSelectedToPortfolio();
    });

    expect(importRes.successCount).toBe(2);
    expect(importRes.failedCount).toBe(0);
    // Queue should be cleared
    expect(result.current.assetList.length).toBe(0);
    expect(result.current.activeAssetId).toBeNull();
  });

  it('UT-IMPORT-QUEUE-01: retains assets in queue with error status when metadata is missing or upload fails', async () => {
    let result: any;
    await act(async () => {
      const hook = renderHook(() => useAssetProcessor(), { wrapper: AssetProvider });
      result = hook.result;
    });

    const file1 = new File(['dummy-1'], 'missing_meta.jpg', { type: 'image/jpeg' });

    await act(async () => {
      result.current.processDroppedFiles([file1]);
    });

    await act(async () => {
      result.current.toggleSelectForImport('missing_meta');
    });

    // Attempt import with empty title and keywords
    let importRes: any;
    await act(async () => {
      importRes = await result.current.importSelectedToPortfolio();
    });

    expect(importRes.successCount).toBe(0);
    expect(importRes.failedCount).toBe(1);
    expect(result.current.assetList.length).toBe(1);
    expect(result.current.assets['missing_meta'].status).toBe('error');
    expect(result.current.assets['missing_meta'].errorMsg).toBe('Title and Keywords are required');
  });

  it('UT-STAGING-QUEUE-PERSIST-01: auto-rehydrates existing queue assets from IndexedDB on initial mount', async () => {
    vi.spyOn(storage, 'loadAllStagingAssets').mockResolvedValueOnce([
      {
        id: 'persisted-vector',
        baseName: 'persisted-vector',
        title: 'Restored Title from Storage',
        keywords: 'restored, vector, tag',
        status: 'idle',
        previewUrl: 'blob:http://localhost/mock-preview'
      }
    ]);

    let result: any;
    await act(async () => {
      const hook = renderHook(() => useAssetProcessor(), { wrapper: AssetProvider });
      result = hook.result;
    });

    expect(result.current.isHydrated).toBe(true);
    expect(result.current.assetList.length).toBe(1);
    expect(result.current.assets['persisted-vector']?.title).toBe('Restored Title from Storage');
    expect(result.current.activeAssetId).toBe('persisted-vector');
  });
});
