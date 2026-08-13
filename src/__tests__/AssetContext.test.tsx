import { renderHook, act } from '@testing-library/react';
import { AssetProvider, useAssets } from '@/context/AssetContext';
import { describe, it, expect } from 'vitest';

describe('AssetContext', () => {
  it('provides default state', () => {
    const { result } = renderHook(() => useAssets(), { wrapper: AssetProvider });
    expect(result.current.assets).toEqual({});
    expect(result.current.activeAssetId).toBeNull();
  });

  it('allows updating assets and active asset', () => {
    const { result } = renderHook(() => useAssets(), { wrapper: AssetProvider });

    act(() => {
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
