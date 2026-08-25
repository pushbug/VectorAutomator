import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconcileImageSales, syncImageRollup, reconcileAllUnlinkedSales } from '@/lib/salesReconciler';

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
    expect(mockImageUpdate).toHaveBeenCalled();
  });

  it('UT-SALES-ROLLUP-01: syncImageRollup calculates and updates totals by platform', async () => {
    const mockFindMany = vi.fn().mockResolvedValue([
      { platform: 'Shutterstock', downloads: 8 },
      { platform: 'Adobe Stock', downloads: 12 },
      { platform: 'Vecteezy', downloads: 5 },
    ]);
    const mockImageUpdate = vi.fn().mockResolvedValue({ id: 'img-1' });

    const mockPrisma = {
      platformStats: { findMany: mockFindMany },
      image: { update: mockImageUpdate },
    };

    await syncImageRollup(mockPrisma, 'img-1');

    expect(mockFindMany).toHaveBeenCalledWith({ where: { imageId: 'img-1' } });
    expect(mockImageUpdate).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: {
        totalDownloads: 25,
        ssDownloads: 8,
        asDownloads: 12,
      },
    });
  });

  it('UT-SALES-RECONCILE-03: reconcileAllUnlinkedSales scans unlinked records and binds to matching artworks', async () => {
    const unlinkedRecords = [
      {
        id: 'stat-unlinked-1',
        imageId: null,
        platform: 'Adobe Stock',
        platformAssetId: '583485973',
        earnings: 1.1,
        downloads: 1,
        date: new Date('2026-08-01T00:00:00.000Z'),
      },
    ];

    const matchingImages = [
      {
        id: 'img-matched-1',
        asId: '583485973',
        ssId: null,
        vzId: null,
      },
    ];

    const mockStatsFindMany = vi.fn().mockImplementation((query) => {
      if (query.where?.imageId === null && query.where?.platformAssetId?.not === null) {
        return Promise.resolve(unlinkedRecords);
      }
      if (query.where?.imageId === null && query.where?.platformAssetId === '583485973') {
        return Promise.resolve(unlinkedRecords);
      }
      if (query.where?.imageId === 'img-matched-1') {
        return Promise.resolve([
          {
            id: 'stat-unlinked-1',
            imageId: 'img-matched-1',
            platform: 'Adobe Stock',
            earnings: 1.1,
            downloads: 1,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const mockImageFindMany = vi.fn().mockResolvedValue(matchingImages);
    const mockFindFirst = vi.fn().mockResolvedValue(null);
    const mockUpdate = vi.fn().mockResolvedValue({});
    const mockImageUpdate = vi.fn().mockResolvedValue({});

    const mockPrisma = {
      platformStats: {
        findMany: mockStatsFindMany,
        findFirst: mockFindFirst,
        update: mockUpdate,
        delete: vi.fn(),
      },
      image: {
        findMany: mockImageFindMany,
        update: mockImageUpdate,
      },
    };

    const result = await reconcileAllUnlinkedSales(mockPrisma);
    expect(result.reconciledCount).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'stat-unlinked-1' },
      data: { imageId: 'img-matched-1' },
    });
    expect(mockImageUpdate).toHaveBeenCalledWith({
      where: { id: 'img-matched-1' },
      data: {
        totalDownloads: 1,
        ssDownloads: 0,
        asDownloads: 1,
      },
    });
  });
});
