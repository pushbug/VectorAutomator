import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE, PATCH } from '@/app/api/sales/batch/route';
import { NextRequest } from 'next/server';

const {
  mockStatsFindMany,
  mockStatsDeleteMany,
  mockStatsFindUnique,
  mockStatsFindFirst,
  mockStatsUpdate,
  mockStatsDelete,
  mockImageUpdate,
  mockTransaction,
} = vi.hoisted(() => ({
  mockStatsFindMany: vi.fn(),
  mockStatsDeleteMany: vi.fn(),
  mockStatsFindUnique: vi.fn(),
  mockStatsFindFirst: vi.fn(),
  mockStatsUpdate: vi.fn(),
  mockStatsDelete: vi.fn(),
  mockImageUpdate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@/generated/prisma/client', () => {
  return {
    PrismaClient: class {
      platformStats = {
        findMany: mockStatsFindMany,
        deleteMany: mockStatsDeleteMany,
        findUnique: mockStatsFindUnique,
        findFirst: mockStatsFindFirst,
        update: mockStatsUpdate,
        delete: mockStatsDelete,
      };
      image = {
        update: mockImageUpdate,
      };
      $transaction = mockTransaction;
    },
  };
});

describe('Sales Batch API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (cb: any) => {
      return cb({
        platformStats: {
          findMany: mockStatsFindMany,
          deleteMany: mockStatsDeleteMany,
          findUnique: mockStatsFindUnique,
          findFirst: mockStatsFindFirst,
          update: mockStatsUpdate,
          delete: mockStatsDelete,
        },
        image: {
          update: mockImageUpdate,
        },
      });
    });
  });

  describe('DELETE (UT-API-SALES-BATCH-01)', () => {
    it('UT-API-SALES-BATCH-01: bulk deletes platformStats records and re-syncs parent image rollups safely', async () => {
      mockStatsFindMany.mockResolvedValueOnce([
        { id: 's1', imageId: 'img1' },
        { id: 's2', imageId: 'img1' },
        { id: 's3', imageId: null }, // Unlinked artwork
      ]);
      mockStatsDeleteMany.mockResolvedValueOnce({ count: 3 });

      // Inside rollup sync for img1
      mockStatsFindMany.mockResolvedValueOnce([
        { platform: 'Adobe Stock', downloads: 5 },
      ]);
      mockImageUpdate.mockResolvedValueOnce({ id: 'img1' });

      const request = new NextRequest('http://localhost:3000/api/sales/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['s1', 's2', 's3'] }),
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(3);
      expect(data.affectedImageCount).toBe(1); // Only img1, skipping null
      expect(mockStatsDeleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['s1', 's2', 's3'] } },
      });
      expect(mockImageUpdate).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when ids array is missing or empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/sales/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [] }),
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
    });
  });

  describe('PATCH (UT-API-SALES-BATCH-DATE-01)', () => {
    it('UT-API-SALES-BATCH-DATE-01: bulk updates dates with collision-safe merging and rollup sync', async () => {
      const sourceStats = [
        {
          id: 's1',
          imageId: 'img1',
          platform: 'Adobe Stock',
          downloads: 1,
          earnings: 3.2,
          date: new Date('2026-08-20T00:00:00.000Z'),
        },
        {
          id: 's2',
          imageId: 'img1',
          platform: 'Adobe Stock',
          downloads: 2,
          earnings: 2.11,
          date: new Date('2026-08-20T00:00:00.000Z'),
        },
      ];

      mockStatsFindMany.mockResolvedValueOnce(sourceStats);

      // Collision check for s1: no collision
      mockStatsFindUnique.mockResolvedValueOnce(null);
      mockStatsUpdate.mockResolvedValueOnce({ id: 's1' });

      // Collision check for s2: collision exists on target date (e.g. s3)
      mockStatsFindUnique.mockResolvedValueOnce({
        id: 's3',
        imageId: 'img1',
        platform: 'Adobe Stock',
        downloads: 5,
        earnings: 10.0,
      });
      mockStatsUpdate.mockResolvedValueOnce({ id: 's3' });
      mockStatsDelete.mockResolvedValueOnce({ id: 's2' });

      // Rollup sync findMany for img1
      mockStatsFindMany.mockResolvedValueOnce([
        { platform: 'Adobe Stock', downloads: 8 },
      ]);
      mockImageUpdate.mockResolvedValueOnce({ id: 'img1' });

      const request = new NextRequest('http://localhost:3000/api/sales/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: ['s1', 's2'],
          date: '2026-08-10',
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(2);
      expect(data.targetDate).toBe('2026-08-10T00:00:00.000Z');

      // Verify collision-safe accumulation into s3
      expect(mockStatsUpdate).toHaveBeenCalledWith({
        where: { id: 's3' },
        data: {
          downloads: 7, // 5 + 2
          earnings: 12.11, // 10.0 + 2.11
        },
      });
      expect(mockStatsDelete).toHaveBeenCalledWith({
        where: { id: 's2' },
      });
      expect(mockImageUpdate).toHaveBeenCalledTimes(1);
    });

    it('returns 400 for invalid date format or empty ids', async () => {
      const request = new NextRequest('http://localhost:3000/api/sales/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: ['s1'],
          date: 'invalid-date',
        }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(400);
    });
  });
});
