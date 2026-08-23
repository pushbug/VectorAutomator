import { renderHook, act } from '@testing-library/react';
import { AssetProvider, useAssets } from '@/context/AssetContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as storage from '@/lib/stagingQueueStorage';

describe('AssetContext', () => {
  beforeEach(() => {
    vi.spyOn(storage, 'loadAllStagingAssets').mockResolvedValue([]);
  });

  it('provides default state', async () => {
    let result: any;
    await act(async () => {
      const hook = renderHook(() => useAssets(), { wrapper: AssetProvider });
      result = hook.result;
    });

    expect(result.current.assets).toEqual({});
    expect(result.current.activeAssetId).toBeNull();
    expect(result.current.isHydrated).toBe(true);
  });

  it('allows updating assets and active asset', async () => {
    let result: any;
    await act(async () => {
      const hook = renderHook(() => useAssets(), { wrapper: AssetProvider });
      result = hook.result;
    });

    await act(async () => {
      result.current.setAssets({
        'test-id': {
          id: 'test-id',
          baseName: 'test',
          title: '',
          keywords: '',
          status: 'idle',
        }
      });
      result.current.setActiveAssetId('test-id');
    });

    expect(result.current.assets['test-id']).toBeDefined();
    expect(result.current.activeAssetId).toBe('test-id');
  });
});
