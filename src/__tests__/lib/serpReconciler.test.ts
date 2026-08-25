import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoReconcileSerpItems, reconcileImageSerp } from '@/lib/serpReconciler';

describe('SERP Reconciler Suite (UT-SERP-RECONCILE-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reconcileImageSerp: updates serpItem records matching assetId with isMine and matchedImageId', async () => {
    const mockUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
    const mockPrisma = {
      serpItem: {
        updateMany: mockUpdateMany,
      },
    };

    const result = await reconcileImageSerp(mockPrisma, {
      id: 'img-101',
      asId: '123456',
      ssId: '789012',
    });

    expect(result.updatedCount).toBe(2);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { assetId: { in: ['123456', '789012'] } },
      data: { isMine: true, matchedImageId: 'img-101' },
    });
  });

  it('reconcileImageSerp: returns 0 if no platform IDs provided', async () => {
    const mockUpdateMany = vi.fn();
    const mockPrisma = {
      serpItem: {
        updateMany: mockUpdateMany,
      },
    };

    const result = await reconcileImageSerp(mockPrisma, {
      id: 'img-102',
      asId: null,
      ssId: null,
      vzId: undefined,
    });

    expect(result.updatedCount).toBe(0);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('autoReconcileSerpItems: executes raw SQL when supported and handles safe fallback', async () => {
    const mockExecuteRawUnsafe = vi.fn().mockResolvedValue(5);
    const mockPrisma = {
      $executeRawUnsafe: mockExecuteRawUnsafe,
    };

    const result = await autoReconcileSerpItems(mockPrisma);
    expect(result.reconciledCount).toBe(5);
    expect(mockExecuteRawUnsafe).toHaveBeenCalled();
  });

  it('autoReconcileSerpItems: safely handles missing $executeRawUnsafe in mock/test environment', async () => {
    const mockPrisma = {};
    const result = await autoReconcileSerpItems(mockPrisma);
    expect(result.reconciledCount).toBe(0);
  });
});
