import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/portfolio/route';
import { NextRequest } from 'next/server';

const { mockFindMany, mockCount, mockFindUnique, mockUpdate, mockDelete } = vi.hoisted(() => {
  return {
    mockFindMany: vi.fn(),
    mockCount: vi.fn(),
    mockFindUnique: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
  };
});

vi.mock('@/generated/prisma/client', () => {
  return {
    PrismaClient: class {
      image = {
        findMany: mockFindMany,
        count: mockCount,
        findUnique: mockFindUnique,
        update: mockUpdate,
        delete: mockDelete,
      };
    },
  };
});

vi.mock('fs/promises', () => ({
  default: {
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Portfolio API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('fetches paginated portfolio data', async () => {
      mockFindMany.mockResolvedValue([{ id: '1', title: 'Test Image', code: '2608-1' }]);
      mockCount.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/portfolio?page=1&limit=10&sortBy=createdAt&sortOrder=desc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.total).toBe(1);
      expect(data.data.length).toBe(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' }
        })
      );
    });
  });

  describe('PATCH', () => {
    it('updates download counts and computes totalDownloads', async () => {
      const mockImage = { id: 'img1', ssDownloads: 10, asDownloads: 5 };
      mockFindUnique.mockResolvedValue(mockImage);
      mockUpdate.mockResolvedValue({ ...mockImage, ssDownloads: 20, asDownloads: 5, totalDownloads: 25 });

      const request = new NextRequest('http://localhost:3000/api/portfolio', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'img1', ssDownloads: 20 }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalDownloads).toBe(25);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'img1' },
          data: {
            ssDownloads: 20,
            asDownloads: 5,
            totalDownloads: 25,
          }
        })
      );
    });

    it('returns 404 if image not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/portfolio', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'nonexistent', ssDownloads: 100 }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE', () => {
    it('deletes image and safely unlinks file', async () => {
      const mockImage = { id: 'img1', title: 'To Delete', filePath: '/path/to/img.jpg' };
      mockFindUnique.mockResolvedValue(mockImage);
      mockDelete.mockResolvedValue(mockImage);

      const request = new NextRequest('http://localhost:3000/api/portfolio?id=img1', {
        method: 'DELETE',
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'img1' } });
    });

    it('returns 404 if image to delete is not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/portfolio?id=missing', {
        method: 'DELETE',
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Image not found');
    });

    it('returns 400 if image id is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/portfolio', {
        method: 'DELETE',
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Image ID is required');
    });
  });
});
