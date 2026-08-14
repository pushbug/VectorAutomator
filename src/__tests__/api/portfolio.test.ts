import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/portfolio/route';
import { NextRequest } from 'next/server';

const { mockFindMany, mockCount, mockFindUnique, mockFindFirst, mockUpdate, mockDelete } = vi.hoisted(() => {
  return {
    mockFindMany: vi.fn(),
    mockCount: vi.fn(),
    mockFindUnique: vi.fn(),
    mockFindFirst: vi.fn(),
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
        findFirst: mockFindFirst,
        update: mockUpdate,
        delete: mockDelete,
      };
    },
  };
});

vi.mock('fs/promises', () => ({
  default: {
    unlink: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
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

    it('UT-API-PF-SEARCH-01: searches across title, keywords, tags, code, and platform asset IDs', async () => {
      mockFindMany.mockResolvedValue([{ id: '1', title: 'Infographic Timeline', asId: '569029521' }]);
      mockCount.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/portfolio?search=569029521');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.total).toBe(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { asId: { contains: '569029521' } },
              { ssId: { contains: '569029521' } },
              { vzId: { contains: '569029521' } },
              { title: { contains: '569029521' } },
              { keywords: { contains: '569029521' } },
              { tags: { contains: '569029521' } },
              { code: { contains: '569029521' } },
            ]),
          }),
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
          data: expect.objectContaining({
            ssDownloads: 20,
            asDownloads: 5,
            totalDownloads: 25,
          })
        })
      );
    });

    it('updates platform asset IDs (ssId, asId, vzId)', async () => {
      const mockImage = { id: 'img1', ssId: null, asId: null, vzId: null, ssDownloads: 10, asDownloads: 5 };
      mockFindUnique.mockResolvedValue(mockImage);
      mockUpdate.mockResolvedValue({
        ...mockImage,
        ssId: '24589201',
        asId: '83920194',
        vzId: '19384029',
      });

      const request = new NextRequest('http://localhost:3000/api/portfolio', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'img1',
          ssId: '24589201',
          asId: '83920194',
          vzId: '19384029',
        }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'img1' },
          data: {
            ssId: '24589201',
            asId: '83920194',
            vzId: '19384029',
          },
        })
      );
    });

    it('updates full metadata (title, keywords, category, tags, notes, code, uploadDate)', async () => {
      const mockImage = {
        id: 'img1',
        title: 'Old Title',
        keywords: 'old, keywords',
        code: '2608-1',
        category: null,
        tags: null,
        notes: null,
        createdAt: new Date('2026-08-10'),
      };
      mockFindUnique.mockResolvedValue(mockImage);
      mockFindFirst.mockResolvedValue(null); // no conflict
      mockUpdate.mockResolvedValue({
        ...mockImage,
        title: 'New Title',
        keywords: 'new, tags',
        code: '2608-9',
        category: 'Icons',
        tags: 'flat, modern',
        notes: 'Updated note',
      });

      const request = new NextRequest('http://localhost:3000/api/portfolio', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'img1',
          title: 'New Title',
          keywords: 'new, tags',
          code: '2608-9',
          category: 'Icons',
          tags: 'flat, modern',
          notes: 'Updated note',
          uploadDate: '2026-08-14',
        }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'img1' },
          data: expect.objectContaining({
            title: 'New Title',
            keywords: 'new, tags',
            code: '2608-9',
            category: 'Icons',
            tags: 'flat, modern',
            notes: 'Updated note',
            year: 2026,
            month: 8,
            seqNumber: 9,
          }),
        })
      );
    });

    it('allows keeping existing image code without conflict', async () => {
      const mockImage = { id: 'img1', code: '2608-1', title: 'Old Title' };
      mockFindUnique.mockResolvedValue(mockImage);
      mockFindFirst.mockResolvedValue(null); // NOT: { id: 'img1' } returns null
      mockUpdate.mockResolvedValue({ ...mockImage, title: 'Updated' });

      const request = new NextRequest('http://localhost:3000/api/portfolio', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'img1', code: '2608-1', title: 'Updated' }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          code: '2608-1',
          NOT: { id: 'img1' },
        },
      });
    });

    it('rejects duplicate code belonging to another image with 409', async () => {
      const mockImage = { id: 'img1', code: '2608-1' };
      mockFindUnique.mockResolvedValue(mockImage);
      mockFindFirst.mockResolvedValue({ id: 'img2', code: '2608-2' }); // conflict with img2

      const request = new NextRequest('http://localhost:3000/api/portfolio', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'img1', code: '2608-2' }),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
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
