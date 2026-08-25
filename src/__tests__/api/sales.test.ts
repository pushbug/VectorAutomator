import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, DELETE } from '@/app/api/sales/route';
import { NextRequest } from 'next/server';

const {
  mockStatsFindMany,
  mockStatsCount,
  mockStatsFindUnique,
  mockStatsCreate,
  mockStatsUpdate,
  mockStatsDelete,
  mockImageFindMany,
  mockImageFindUnique,
  mockImageUpdate,
} = vi.hoisted(() => ({
  mockStatsFindMany: vi.fn(),
  mockStatsCount: vi.fn(),
  mockStatsFindUnique: vi.fn(),
  mockStatsCreate: vi.fn(),
  mockStatsUpdate: vi.fn(),
  mockStatsDelete: vi.fn(),
  mockImageFindMany: vi.fn(),
  mockImageFindUnique: vi.fn(),
  mockImageUpdate: vi.fn(),
}));

vi.mock('@/generated/prisma/client', () => {
  return {
    PrismaClient: class {
      platformStats = {
        findMany: mockStatsFindMany,
        count: mockStatsCount,
        findUnique: mockStatsFindUnique,
        create: mockStatsCreate,
        update: mockStatsUpdate,
        delete: mockStatsDelete,
      };
      image = {
        findMany: mockImageFindMany,
        findUnique: mockImageFindUnique,
        update: mockImageUpdate,
      };
    },
  };
});

describe('Sales API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImageFindMany.mockResolvedValue([]);
  });

  describe('GET', () => {
    it('fetches paginated sales list and computes summary metrics', async () => {
      const mockSales = [
        {
          id: 's1',
          imageId: 'img1',
          platform: 'Adobe Stock',
          downloads: 10,
          earnings: 25.5,
          date: new Date('2026-08-14T00:00:00.000Z'),
          image: { id: 'img1', code: '2608-1', title: 'Infographic A', filePath: '/path/a.jpg' },
        },
        {
          id: 's2',
          imageId: 'img2',
          platform: 'Shutterstock',
          downloads: 5,
          earnings: 5.0,
          date: new Date('2026-08-14T00:00:00.000Z'),
          image: { id: 'img2', code: '2608-2', title: 'Banner B', filePath: '/path/b.jpg' },
        },
      ];

      mockStatsFindMany.mockImplementation((query) => {
        if (query?.where?.imageId === null && query?.where?.platformAssetId?.not === null) {
          return Promise.resolve([]);
        }
        if (query?.select) {
          return Promise.resolve([
            { platform: 'Adobe Stock', downloads: 10, earnings: 25.5 },
            { platform: 'Shutterstock', downloads: 5, earnings: 5.0 },
          ]);
        }
        return Promise.resolve(mockSales);
      });
      mockStatsCount.mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/sales?page=1&limit=50');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.total).toBe(2);
      expect(data.data.length).toBe(2);
      expect(data.summary.totalEarnings).toBe(30.5);
      expect(data.summary.totalDownloads).toBe(15);
      expect(data.summary.topPlatform).toBe('Adobe Stock');
    });

    it('filters sales by platform=unlinked (imageId=null)', async () => {
      mockStatsFindMany.mockImplementation((query) => {
        return Promise.resolve([]);
      });
      mockStatsCount.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/sales?platform=unlinked');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockStatsFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            imageId: null,
          }),
        })
      );
    });
  });


  describe('POST', () => {
    it('creates new sale and recalculates image rollups', async () => {
      mockImageFindUnique.mockResolvedValue({ id: 'img1', title: 'Test Image' });
      mockStatsFindUnique.mockResolvedValue(null); // No collision on that date

      const newStat = {
        id: 'stat1',
        imageId: 'img1',
        platform: 'Shutterstock',
        downloads: 4,
        earnings: 2.5,
        date: new Date('2026-08-14T00:00:00.000Z'),
      };
      mockStatsCreate.mockResolvedValue(newStat);

      // Rollup sync findMany
      mockStatsFindMany.mockResolvedValue([
        { platform: 'Shutterstock', downloads: 4 },
        { platform: 'Adobe Stock', downloads: 2 },
      ]);
      mockImageUpdate.mockResolvedValue({ id: 'img1', totalDownloads: 6, ssDownloads: 4, asDownloads: 2 });

      const request = new NextRequest('http://localhost:3000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: 'img1',
          platform: 'Shutterstock',
          downloads: 4,
          earnings: 2.5,
          date: '2026-08-14',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockStatsCreate).toHaveBeenCalled();
      expect(mockImageUpdate).toHaveBeenCalledWith({
        where: { id: 'img1' },
        data: {
          totalDownloads: 6,
          ssDownloads: 4,
          asDownloads: 2,
        },
      });
    });

    it('upserts and accumulates downloads and earnings on date collision', async () => {
      mockImageFindUnique.mockResolvedValue({ id: 'img1', title: 'Test Image' });
      mockStatsFindUnique.mockResolvedValue({
        id: 'stat1',
        imageId: 'img1',
        platform: 'Adobe Stock',
        downloads: 10,
        earnings: 15.0,
      });

      mockStatsUpdate.mockResolvedValue({
        id: 'stat1',
        downloads: 15,
        earnings: 22.5,
      });

      mockStatsFindMany.mockResolvedValue([
        { platform: 'Adobe Stock', downloads: 15 },
      ]);

      const request = new NextRequest('http://localhost:3000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: 'img1',
          platform: 'Adobe Stock',
          downloads: 5,
          earnings: 7.5,
          date: '2026-08-14',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockStatsUpdate).toHaveBeenCalledWith({
        where: { id: 'stat1' },
        data: {
          downloads: 15,
          earnings: 22.5,
        },
      });
    });

    it('returns 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: '',
          platform: 'Adobe Stock',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('returns 404 if target image is not found', async () => {
      mockImageFindUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: 'nonexistent',
          platform: 'Shutterstock',
          downloads: 1,
          earnings: 1,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE', () => {
    it('deletes sale record and syncs image rollups', async () => {
      mockStatsFindUnique.mockResolvedValue({ id: 'stat1', imageId: 'img1' });
      mockStatsDelete.mockResolvedValue({ id: 'stat1' });
      mockStatsFindMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/sales?id=stat1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockStatsDelete).toHaveBeenCalledWith({ where: { id: 'stat1' } });
      expect(mockImageUpdate).toHaveBeenCalled();
    });

    it('returns 404 if sale record does not exist', async () => {
      mockStatsFindUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/sales?id=missing', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      expect(response.status).toBe(404);
    });
  });
});
