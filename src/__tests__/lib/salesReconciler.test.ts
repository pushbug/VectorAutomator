import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconcileImageSales } from '@/lib/salesReconciler';

describe('Sales Reconciler Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-SALES-RECONCILE-01: reconciles unlinked PlatformStats directly when no collision exists', async () => {
    const mockFindMany = vi.fn().mockImplementation((query) => {
      if (query.where?.imageId === null && query.where?.platformAssetId === '1929092005') {
        return Promise.resolve([
          {
            id: 'stat-unlinked-1',
            imageId: null,
            platform: 'Adobe Stock',
            platformAssetId: '1929092005',
            earnings: 50.0,
            downloads: 10,
            date: new Date('2026-08-20T00:00:00.000Z'),
          },
        ]);
      }
      if (query.where?.imageId === 'img-1') {
        return Promise.resolve([
          {
            id: 'stat-unlinked-1',
            imageId: 'img-1',
            platform: 'Adobe Stock',
            earnings: 50.0,
            downloads: 10,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const mockFindFirst = vi.fn().mockResolvedValue(null);
    const mockUpdate = vi.fn().mockResolvedValue({});
    const mockDelete = vi.fn().mockResolvedValue({});
    const mockImageUpdate = vi.fn().mockResolvedValue({});

    const mockPrisma = {
      platformStats: {
        findMany: mockFindMany,
        findFirst: mockFindFirst,
        update: mockUpdate,
        delete: mockDelete,
      },
      image: {
        update: mockImageUpdate,
      },
    };

    const result = await reconcileImageSales(mockPrisma, {
      id: 'img-1',
      asId: '1929092005',
    });

    expect(result.reconciledCount).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'stat-unlinked-1' },
      data: { imageId: 'img-1' },
    });
    expect(mockImageUpdate).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: {
        totalDownloads: 10,
        ssDownloads: 0,
        asDownloads: 10,
      },
    });
  });

  it('UT-SALES-RECONCILE-02: performs collision-safe merging when target image already has record on same date', async () => {
    const existingDate = new Date('2026-08-20T00:00:00.000Z');

    const mockFindMany = vi.fn().mockImplementation((query) => {
      if (query.where?.imageId === null && query.where?.platformAssetId === '1929092005') {
        return Promise.resolve([
          {
            id: 'stat-unlinked-dup',
            imageId: null,
            platform: 'Adobe Stock',
            platformAssetId: '1929092005',
            earnings: 30.0,
            downloads: 5,
            date: existingDate,
          },
        ]);
      }
      if (query.where?.imageId === 'img-1') {
        return Promise.resolve([
          {
            id: 'stat-existing-1',
            imageId: 'img-1',
            platform: 'Adobe Stock',
            earnings: 50.0,
            downloads: 10,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const mockFindFirst = vi.fn().mockResolvedValue({
      id: 'stat-existing-1',
      imageId: 'img-1',
      platform: 'Adobe Stock',
      earnings: 20.0,
      downloads: 5,
      date: existingDate,
    });

    const mockUpdate = vi.fn().mockResolvedValue({});
    const mockDelete = vi.fn().mockResolvedValue({});
    const mockImageUpdate = vi.fn().mockResolvedValue({});

    const mockPrisma = {
      platformStats: {
        findMany: mockFindMany,
        findFirst: mockFindFirst,
        update: mockUpdate,
        delete: mockDelete,
      },
      image: {
        update: mockImageUpdate,
      },
    };

    const result = await reconcileImageSales(mockPrisma, {
      id: 'img-1',
      asId: '1929092005',
    });

    expect(result.reconciledCount).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'stat-existing-1' },
      data: {
        earnings: 50.0,
        downloads: 10,
      },
    });
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: 'stat-unlinked-dup' },
    });
    expect(mockImageUpdate).toHaveBeenCalled();
  });
});
