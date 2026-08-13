import { renderHook, act } from '@testing-library/react';
import { useAssetProcessor } from '@/hooks/useAssetProcessor';
import { AssetProvider } from '@/context/AssetContext';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useAssetProcessor', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        blob: () => Promise.resolve(new Blob(['mock-blob'], { type: 'image/jpeg' }))
      })
    ));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('processes dropped files correctly', async () => {
    const { result } = renderHook(() => useAssetProcessor(), { wrapper: AssetProvider });

    const file1 = new File([''], 'test1.eps', { type: 'application/postscript' });
    const file2 = new File([''], 'test1.jpg', { type: 'image/jpeg' });

    act(() => {
      result.current.processDroppedFiles([file1, file2]);
    });

    expect(result.current.assetList.length).toBe(1);
    expect(result.current.assetList[0].baseName).toBe('test1');
    expect(result.current.assetList[0].epsFile).toBe(file1);
    expect(result.current.assetList[0].jpgFile).toBe(file2);
    expect(result.current.activeAssetId).toBe('test1');
  });

  it('removes asset correctly', () => {
    const { result } = renderHook(() => useAssetProcessor(), { wrapper: AssetProvider });

    const file1 = new File([''], 'test1.jpg', { type: 'image/jpeg' });
    act(() => {
      result.current.processDroppedFiles([file1]);
    });
    expect(result.current.assetList.length).toBe(1);

    act(() => {
      // Mock event
      result.current.removeAsset('test1', { stopPropagation: vi.fn() } as any);
    });

    expect(result.current.assetList.length).toBe(0);
    expect(result.current.activeAssetId).toBeNull();
  });

  it('updates status to modified when editing a done asset', () => {
    const { result } = renderHook(() => useAssetProcessor(), { wrapper: AssetProvider });

    const file1 = new File([''], 'test1.jpg', { type: 'image/jpeg' });
    act(() => {
      result.current.processDroppedFiles([file1]);
    });
    
    act(() => {
      result.current.setActiveAssetId('test1');
    });

    // Manually force status to 'done' (simulating successful save)
    act(() => {
      result.current.updateActiveAsset({ status: 'done', title: 'old title' });
    });
    expect(result.current.assetList[0].status).toBe('done');

    // Update title -> should change to modified
    act(() => {
      result.current.updateActiveAsset({ title: 'new title' });
    });

    expect(result.current.assetList[0].status).toBe('modified');
    expect(result.current.assetList[0].title).toBe('new title');
  });
});
