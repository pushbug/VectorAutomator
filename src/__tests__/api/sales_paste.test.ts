import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseStockPaste } from '@/lib/stockPasteParser';
import { POST } from '@/app/api/sales/paste-sync/route';
import { NextRequest } from 'next/server';

const { mockFindMany, mockFindUnique, mockUpdate, mockUpsert, mockStatsFindMany } = vi.hoisted(() => {
  return {
    mockFindMany: vi.fn(),
    mockFindUnique: vi.fn(),
    mockUpdate: vi.fn(),
    mockUpsert: vi.fn(),
    mockStatsFindMany: vi.fn(),
  };
});

vi.mock('@prisma/adapter-better-sqlite3', () => ({
  PrismaBetterSqlite3: class {},
}));

vi.mock('@/generated/prisma/client', () => {
  return {
    PrismaClient: class {
      image = {
        findMany: mockFindMany,
        findUnique: mockFindUnique,
        update: mockUpdate,
      };
      platformStats = {
        upsert: mockUpsert,
        findMany: mockStatsFindMany,
      };
      $transaction = vi.fn(async (callback) => {
        return callback({
          image: {
            update: mockUpdate,
            findUnique: mockFindUnique,
          },
          platformStats: {
            upsert: mockUpsert,
            findMany: mockStatsFindMany,
          },
        });
      });
    },
  };
});

describe('Smart Paste Stock Data Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-SALES-PASTE-01: parses multi-line clipboard text with markdown links from Adobe Stock', () => {
    const rawPaste = `
Thumb
Id
Type
Upload date
Earnings
[1929092005](https://stock.adobe.com/stock-photo/id/1929092005)
Vectors
2/27/2026
$207.04
[1056563551](https://stock.adobe.com/stock-photo/id/1056563551)
Vectors
10/31/2024
$93.77
[569029521](https://stock.adobe.com/stock-photo/id/569029521)
Vectors
2/7/2023
$63.01
`;

    const parsed = parseStockPaste(rawPaste);
    expect(parsed.length).toBe(3);
    expect(parsed[0]).toEqual({
      assetId: '1929092005',
      type: 'Vectors',
      dateDisplay: '2/27/2026',
      dateStr: '2026-02-27',
      earnings: 207.04,
      downloads: undefined,
    });
    expect(parsed[2]).toEqual({
      assetId: '569029521',
      type: 'Vectors',
      dateDisplay: '2/7/2023',
      dateStr: '2023-02-07',
      earnings: 63.01,
      downloads: undefined,
    });
  });

  it('UT-SALES-PASTE-02: parses single-line TSV table rows with downloads', () => {
    const rawPaste = `
569029521\tVectors\t2/7/2023\t1,405\t$63.01
636376104\tVectors\t8/18/2023\t850\t$81.16
`;

    const parsed = parseStockPaste(rawPaste);
    expect(parsed.length).toBe(2);
    expect(parsed[0]).toEqual({
      assetId: '569029521',
      type: 'Vectors',
      dateDisplay: '2/7/2023',
      dateStr: '2023-02-07',
      earnings: 63.01,
      downloads: 1405,
    });
  });

  it('UT-SALES-PASTE-03: /api/sales/paste-sync previews and commits atomic sync', async () => {
    // Mock DB images
    mockFindMany.mockResolvedValue([
      {
        id: 'img1',
        code: '2302-01',
        title: 'Timeline Brochure',
        filePath: 'public/uploads/test.jpg',
        createdAt: new Date('2023-02-07T00:00:00.000Z'),
        asId: null,
        totalDownloads: 0,
        totalEarnings: 0,
        platformStats: [],
      },
    ]);

    // Test preview action
    const previewReq = new NextRequest('http://localhost:3000/api/sales/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        action: 'preview',
        platform: 'Adobe Stock',
        rawText: `
[569029521](https://stock.adobe.com/stock-photo/id/569029521)
Vectors
2/7/2023
$63.01
        `,
      }),
    });

    const previewRes = await POST(previewReq);
    const previewData = await previewRes.json();

    expect(previewRes.status).toBe(200);
    expect(previewData.rows.length).toBe(1);
    expect(previewData.rows[0].matchedImage?.id).toBe('img1');
    expect(previewData.rows[0].matchType).toBe('exact_date');

    // Test commit action
    mockStatsFindMany.mockResolvedValue([{ platform: 'Adobe Stock', earnings: 63.01, downloads: 0 }]);
    mockFindUnique.mockResolvedValue({
      id: 'img1',
      totalDownloads: 0,
      totalEarnings: 0,
      platformStats: [{ platform: 'Adobe Stock', earnings: 63.01, downloads: 0 }],
    });

    const commitReq = new NextRequest('http://localhost:3000/api/sales/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        action: 'commit',
        platform: 'Adobe Stock',
        items: [
          {
            imageId: 'img1',
            assetId: '569029521',
            dateStr: '2023-02-07',
            earnings: 63.01,
            downloads: 0,
          },
        ],
      }),
    });

    const commitRes = await POST(commitReq);
    const commitData = await commitRes.json();

    expect(commitRes.status).toBe(200);
    expect(commitData.success).toBe(true);
    expect(commitData.syncedCount).toBe(1);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('UT-SALES-PASTE-04: parses multi-line stream text with standalone downloads and plain decimal earnings', () => {
    const rawPaste = `
1056563551
Vectors
Upload date: 10/31/2024
42
93.77
    `;

    const parsed = parseStockPaste(rawPaste);
    expect(parsed.length).toBe(1);
    expect(parsed[0]).toEqual({
      assetId: '1056563551',
      type: 'Vectors',
      dateDisplay: '10/31/2024',
      dateStr: '2024-10-31',
      earnings: 93.77,
      downloads: 42,
    });
  });

  it('UT-SALES-PASTE-05: /api/sales/paste-sync performs ±7 day proximity matching and candidate disambiguation', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'img-near-1',
        code: '2411-01',
        title: 'Autumn Banner A',
        filePath: 'public/uploads/banner1.jpg',
        createdAt: new Date('2024-11-03T00:00:00.000Z'),
        asId: null,
      },
      {
        id: 'img-near-2',
        code: '2411-02',
        title: 'Autumn Banner B',
        filePath: 'public/uploads/banner2.jpg',
        createdAt: new Date('2024-11-04T00:00:00.000Z'),
        asId: null,
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/sales/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        action: 'preview',
        platform: 'Adobe Stock',
        rawText: `
1056563551
10/31/2024
$93.77
        `,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.rows.length).toBe(1);
    expect(data.rows[0].matchType).toBe('proximity');
    expect(data.rows[0].candidates.length).toBe(2);
    expect(data.rows[0].matchedImage).toBeNull();
  });
});

