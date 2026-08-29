import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/portfolio/route';
import { NextRequest } from 'next/server';

const {
  mockFindMany,
  mockCount,
  mockFindUnique,
  mockFindFirst,
  mockUpdate,
  mockDelete,
  mockSyncPhysicalUploadFiles,
} = vi.hoisted(() => {
  return {
    mockFindMany: vi.fn(),
    mockCount: vi.fn(),
    mockFindUnique: vi.fn(),
    mockFindFirst: vi.fn(),
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
    mockSyncPhysicalUploadFiles: vi.fn().mockResolvedValue({ syncedCount: 0, syncedCodes: [] }),
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
      platformStats = {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
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

vi.mock('@/lib/fileStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/fileStorage')>();
  return {
    ...actual,
    syncPhysicalUploadFiles: mockSyncPhysicalUploadFiles,
  };
});

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
          orderBy: [
            { year: 'desc' },
            { month: 'desc' },
            { seqNumber: 'desc' },
            { createdAt: 'desc' },
          ]
        })
      );
    });

    it('UT-API-PORTFOLIO-AUTO-SYNC-01: auto-syncs physical files on page 1 without search and handles errors safely', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Call on page 1 with no search -> triggers auto-sync
      const req1 = new NextRequest('http://localhost:3000/api/portfolio?page=1');
      await GET(req1);
      expect(mockSyncPhysicalUploadFiles).toHaveBeenCalledTimes(1);

      // Call on page 2 -> should NOT trigger auto-sync
      mockSyncPhysicalUploadFiles.mockClear();
      const req2 = new NextRequest('http://localhost:3000/api/portfolio?page=2');
      await GET(req2);
      expect(mockSyncPhysicalUploadFiles).not.toHaveBeenCalled();

      // Call with search keyword -> should NOT trigger auto-sync
      mockSyncPhysicalUploadFiles.mockClear();
      const req3 = new NextRequest('http://localhost:3000/api/portfolio?page=1&search=nature');
      await GET(req3);
      expect(mockSyncPhysicalUploadFiles).not.toHaveBeenCalled();

      // Error in auto-sync does not break GET request (graceful error suppression)
      mockSyncPhysicalUploadFiles.mockClear();
      mockSyncPhysicalUploadFiles.mockRejectedValueOnce(new Error('Disk read error'));
      const req4 = new NextRequest('http://localhost:3000/api/portfolio?page=1');
      const res4 = await GET(req4);
      expect(res4.status).toBe(200);
    });

    it('UT-API-PF-SUMMARY-01: calculates and returns totalImages, totalDownloads, and totalEarnings in summary', async () => {
      mockFindMany
        .mockResolvedValueOnce([
          { id: '1', title: 'Image 1', totalDownloads: 50, stats: [{ platform: 'Adobe Stock', earnings: 25.0 }] },
        ])
        .mockResolvedValueOnce([
          { totalDownloads: 50, stats: [{ earnings: 25.0 }] },
          { totalDownloads: 30, stats: [{ earnings: 15.0 }] },
        ]);
      mockCount.mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/portfolio?page=1&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary).toEqual(
        expect.objectContaining({
          totalImages: 2,
          totalDownloads: 80,
          totalEarnings: 40.0,
          top100AvgMonthlyEarnings: 20,
          top100AvgMonthlyDownloads: 40,
          portfolioAvgMonthlyEarnings: 20,
          portfolioAvgMonthlyDownloads: 40,
        })
      );
    });

    it('UT-API-PF-BENCHMARK-01: computes dynamic Top 100 and portfolio monthly average earnings and downloads', async () => {
      mockFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { totalDownloads: 100, stats: [{ earnings: 50.0, date: '2026-08-01T00:00:00.000Z' }] },
          { totalDownloads: 20, stats: [{ earnings: 10.0, date: '2026-07-01T00:00:00.000Z' }] },
        ]);
      mockCount.mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/portfolio');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalImages).toBe(2);
      expect(data.summary.totalEarnings).toBe(60.0);
      expect(data.summary.totalDownloads).toBe(120);
      // 2 distinct months -> top 100 avg monthly = (60/2)/2 = 15.0
      expect(data.summary.top100AvgMonthlyEarnings).toBe(15.0);
      expect(data.summary.top100AvgMonthlyDownloads).toBe(30.0);
      expect(data.summary.portfolioAvgMonthlyEarnings).toBe(15.0);
      expect(data.summary.portfolioAvgMonthlyDownloads).toBe(30.0);
    });

    it('UT-API-PF-BENCHMARK-FILTER-01: calculates global benchmarks from full dataset even when search filter is active', async () => {
      mockFindMany
        // 1. Filtered paginated items
        .mockResolvedValueOnce([{ id: 'img-stagnant', title: 'Stagnant Artwork', totalDownloads: 2, stats: [{ earnings: 1.37 }] }])
        // 2. Filtered matching items (for total search count & search-scoped earnings)
        .mockResolvedValueOnce([{ totalDownloads: 2, stats: [{ earnings: 1.37, date: '2026-08-01T00:00:00.000Z' }] }])
        // 3. Global benchmark items (for true Top 100 and Port Avg)
        .mockResolvedValueOnce([
          { totalDownloads: 100, stats: [{ earnings: 50.0, date: '2026-08-01T00:00:00.000Z' }] },
          { totalDownloads: 20, stats: [{ earnings: 10.0, date: '2026-07-01T00:00:00.000Z' }] },
        ]);
      mockCount.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/portfolio?search=2506-12');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Search-scoped summary
      expect(data.summary.totalImages).toBe(1);
      expect(data.summary.totalEarnings).toBe(1.37);
      expect(data.summary.totalDownloads).toBe(2);
      // Global benchmarks are NOT collapsed to 0.00 or the single item
      expect(data.summary.top100AvgMonthlyEarnings).toBe(15.0);
      expect(data.summary.top100AvgMonthlyDownloads).toBe(30.0);
      expect(data.summary.portfolioAvgMonthlyEarnings).toBe(15.0);
      expect(data.summary.portfolioAvgMonthlyDownloads).toBe(30.0);
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

    it('UT-API-PF-SEARCH-02: searches multi-word queries with tokenized AND/OR condition', async () => {
      mockFindMany.mockResolvedValue([{ id: '1', title: 'Infographic 5 Steps', keywords: 'business, step' }]);
      mockCount.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/portfolio?search=infographic+5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.total).toBe(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { title: { contains: 'infographic' } },
                  { keywords: { contains: 'infographic' } },
                ]),
              }),
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { title: { contains: '5' } },
                  { keywords: { contains: '5' } },
                ]),
              }),
            ]),
          }),
        })
      );
    });

    it('UT-API-PF-SEARCH-FIELD-01: scopes search to specific searchField (title, keywords, code, ids)', async () => {
      mockFindMany.mockResolvedValue([{ id: '1', title: 'Infographic 5 Steps', keywords: 'business, step' }]);
      mockCount.mockResolvedValue(1);

      // Search title only
      const reqTitle = new NextRequest('http://localhost:3000/api/portfolio?search=infographic&searchField=title');
      await GET(reqTitle);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'infographic' } },
            ],
          }),
        })
      );

      // Search keywords only
      const reqKeywords = new NextRequest('http://localhost:3000/api/portfolio?search=business&searchField=keywords');
      await GET(reqKeywords);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { keywords: { contains: 'business' } },
            ],
          }),
        })
      );

      // Search code only
      const reqCode = new NextRequest('http://localhost:3000/api/portfolio?search=2608-01&searchField=code');
      await GET(reqCode);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { code: { contains: '2608-01' } },
            ],
          }),
        })
      );

      // Search ids only
      const reqIds = new NextRequest('http://localhost:3000/api/portfolio?search=569029521&searchField=ids');
      await GET(reqIds);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { asId: { contains: '569029521' } },
              { ssId: { contains: '569029521' } },
              { vzId: { contains: '569029521' } },
            ],
          }),
        })
      );
      // Search exactKeyword only
      const reqExact = new NextRequest('http://localhost:3000/api/portfolio?search=semi&searchField=exactKeyword');
      await GET(reqExact);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { keywords: { equals: 'semi' } },
              { keywords: { startsWith: 'semi,' } },
              { keywords: { contains: ', semi,' } },
              { keywords: { endsWith: ', semi' } },
            ]),
          }),
        })
      );
    });

    it('UT-API-PF-SORT-EARNINGS-01: sorts enriched images by totalEarnings descending', async () => {
      mockFindMany.mockResolvedValue([
        { id: '1', title: 'A', stats: [{ platform: 'Adobe', earnings: 5.0, downloads: 2 }] },
        { id: '2', title: 'B', stats: [{ platform: 'Adobe', earnings: 50.0, downloads: 10 }] },
      ]);
      mockCount.mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/portfolio?sortBy=earnings&sortOrder=desc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].id).toBe('2'); // $50.00 first
      expect(data.data[1].id).toBe('1'); // $5.00 second
      expect(data.data[0].totalEarnings).toBe(50.0);
    });

    it('UT-API-PF-FILTER-ID-01: filters by idStatus across platform IDs and image file presence', async () => {
      mockFindMany.mockResolvedValue([{ id: '1', title: 'Test Vector' }]);
      mockCount.mockResolvedValue(1);

      // 1. has_asId
      const reqHasAs = new NextRequest('http://localhost:3000/api/portfolio?idStatus=has_asId');
      await GET(reqHasAs);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { asId: { not: null } },
              { NOT: { asId: '' } },
            ],
          },
        })
      );

      // 2. missing_asId
      const reqMissingAs = new NextRequest('http://localhost:3000/api/portfolio?idStatus=missing_asId');
      await GET(reqMissingAs);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { asId: null },
              { asId: '' },
            ],
          },
        })
      );

      // 3. has_ssId
      const reqHasSs = new NextRequest('http://localhost:3000/api/portfolio?idStatus=has_ssId');
      await GET(reqHasSs);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { ssId: { not: null } },
              { NOT: { ssId: '' } },
            ],
          },
        })
      );

      // 4. missing_ssId
      const reqMissingSs = new NextRequest('http://localhost:3000/api/portfolio?idStatus=missing_ssId');
      await GET(reqMissingSs);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { ssId: null },
              { ssId: '' },
            ],
          },
        })
      );

      // 5. missing_image_file
      const reqMissingFile = new NextRequest('http://localhost:3000/api/portfolio?idStatus=missing_image_file');
      await GET(reqMissingFile);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            filePath: '',
          },
        })
      );

      // 6. has_image_file
      const reqHasFile = new NextRequest('http://localhost:3000/api/portfolio?idStatus=has_image_file');
      await GET(reqHasFile);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            filePath: { not: '' },
          },
        })
      );


      // 7. Combination of search and idStatus
      const reqCombined = new NextRequest('http://localhost:3000/api/portfolio?search=business&idStatus=missing_asId');
      await GET(reqCombined);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { title: { contains: 'business' } },
                ]),
              }),
              {
                OR: [
                  { asId: null },
                  { asId: '' },
                ],
              },
            ],
          },
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
