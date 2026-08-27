import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseStockPaste, extractStatementDate } from '@/lib/stockPasteParser';
import { POST } from '@/app/api/sales/paste-sync/route';
import { NextRequest } from 'next/server';

const {
  mockFindMany,
  mockFindUnique,
  mockUpdate,
  mockUpsert,
  mockStatsFindMany,
  mockFindFirst,
  mockCreate,
} = vi.hoisted(() => {
  return {
    mockFindMany: vi.fn(),
    mockFindUnique: vi.fn(),
    mockUpdate: vi.fn(),
    mockUpsert: vi.fn(),
    mockStatsFindMany: vi.fn(),
    mockFindFirst: vi.fn(),
    mockCreate: vi.fn(),
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
        findFirst: mockFindFirst,
        create: mockCreate,
        update: mockUpdate,
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
            findFirst: mockFindFirst,
            create: mockCreate,
            update: mockUpdate,
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
      downloads: 1,
    });
    expect(parsed[2]).toEqual({
      assetId: '569029521',
      type: 'Vectors',
      dateDisplay: '2/7/2023',
      dateStr: '2023-02-07',
      earnings: 63.01,
      downloads: 1,
    });
  });

  it('UT-SALES-PASTE-DL-01: defaults downloads to 1 when earnings > 0 and download token is omitted', () => {
    const rawPaste = `
583485973\tVectors\t3/21/2023\t$1.10
638902325\tVectors\t8/24/2023\t$0.00
    `;

    const parsed = parseStockPaste(rawPaste);
    expect(parsed.length).toBe(2);
    expect(parsed[0].downloads).toBe(1);
    expect(parsed[1].downloads).toBe(0);
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

  it('UT-SALES-DATE-01: /api/sales/paste-sync overrides target date with statementDate when useStatementDate is true', async () => {
    mockFindMany.mockResolvedValue([]);

    const req = new NextRequest('http://localhost:3000/api/sales/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        action: 'preview',
        platform: 'Adobe Stock',
        statementDate: '2026-08-20',
        useStatementDate: true,
        rawText: `
1929092005
Vectors
2/27/2026
$207.04
        `,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.rows.length).toBe(1);
    expect(data.rows[0].dateStr).toBe('2026-08-20');
    expect(data.rows[0].uploadDateStr).toBe('2026-02-27');
  });

  it('UT-SALES-UNMATCHED-01: /api/sales/paste-sync commits unmatched sales with null imageId and platformAssetId', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'unlinked-stat-1' });

    const commitReq = new NextRequest('http://localhost:3000/api/sales/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        action: 'commit',
        platform: 'Adobe Stock',
        items: [
          {
            imageId: null,
            assetId: '1929092005',
            dateStr: '2026-08-20',
            earnings: 207.04,
            downloads: 15,
          },
        ],
      }),
    });

    const res = await POST(commitReq);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.syncedCount).toBe(1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        imageId: null,
        platform: 'Adobe Stock',
        platformAssetId: '1929092005',
        date: new Date('2026-08-20T00:00:00.000Z'),
        earnings: 207.04,
        downloads: 15,
      },
    });
  });

  it('UT-SALES-PASTE-DATE-01: extractStatementDate extracts date and parseStockPaste tolerates date header', () => {
    const rawPasteWithIso = `
Date: 2026-05-01
Thumb\tId\tType\tUpload date\tEarnings
\t1905258292\tVectors\t2/8/2026\t$1.91
\t638902325\tVectors\t8/24/2023\t$1.30
`;
    expect(extractStatementDate(rawPasteWithIso)).toBe('2026-05-01');

    const rows = parseStockPaste(rawPasteWithIso);
    expect(rows.length).toBe(2);
    expect(rows[0].assetId).toBe('1905258292');
    expect(rows[0].earnings).toBe(1.91);
    expect(rows[1].assetId).toBe('638902325');
    expect(rows[1].earnings).toBe(1.30);

    const rawPasteWithUs = `
# Statement Date: 5/1/2026
1905258292\tVectors\t2/8/2026\t$1.91
`;
    expect(extractStatementDate(rawPasteWithUs)).toBe('2026-05-01');
    expect(extractStatementDate('Just plain text with no date header')).toBeNull();
  });

  it('UT-SALES-PASTE-DUP-01: /api/sales/paste-sync preview detects existing sales for target date and returns existingSalesWarning', async () => {
    mockFindMany.mockResolvedValue([]);
    // Mock existing records found for platformStats on 2026-05-01
    mockStatsFindMany.mockResolvedValueOnce([
      { earnings: 1.91 },
      { earnings: 1.30 },
      { earnings: 0.99 },
    ]);

    const rawText = `
Date: 2026-05-01
1905258292\tVectors\t2/8/2026\t$1.91
638902325\tVectors\t8/24/2023\t$1.30
`;

    const previewReq = new NextRequest('http://localhost:3000/api/sales/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        action: 'preview',
        platform: 'Adobe Stock',
        rawText,
        statementDate: '2026-05-01',
        useStatementDate: true,
      }),
    });

    const res = await POST(previewReq);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.rows.length).toBe(2);
    expect(data.existingSalesWarning).toEqual({
      count: 3,
      totalEarnings: 4.2,
      dateStr: '2026-05-01',
    });
  });

  it('UT-SALES-DATE-02: /api/sales/paste-sync prioritizes date header in rawText over stale client statementDate', async () => {
    mockFindMany.mockResolvedValue([]);

    const rawText = `
Date: 2026-05-01
1905258292\tVectors\t2/8/2026\t$1.91
`;

    // Client mistakenly or stalely sends statementDate = 2026-08-27
    const previewReq = new NextRequest('http://localhost:3000/api/sales/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        action: 'preview',
        platform: 'Adobe Stock',
        rawText,
        statementDate: '2026-08-27',
        useStatementDate: true,
      }),
    });

    const res = await POST(previewReq);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.rows.length).toBe(1);
    // Overrides stale client date 2026-08-27 with explicit text header 2026-05-01
    expect(data.rows[0].dateStr).toBe('2026-05-01');
    expect(data.detectedStatementDate).toBe('2026-05-01');
  });

  it('UT-SALES-PASTE-DEDUP-01: parseStockPaste deduplicates concatenated paste payloads by assetId', () => {
    // Simulating user accidental double-paste (exactly as in user screenshot)
    const doublePasteText = `
656442298\tVectors\t10/3/2023\t$0.36
Date: 2026-05-01
Thumb\tId\tType\tUpload date\tEarnings
1905258292\tVectors\t2/8/2026\t$1.91
638902325\tVectors\t8/24/2023\t$1.30
656442298\tVectors\t10/3/2023\t$0.36
`;
    const parsed = parseStockPaste(doublePasteText);
    // Even though 656442298 appeared twice, it is deduplicated to 3 items
    expect(parsed.length).toBe(3);
    const ids = parsed.map((p) => p.assetId);
    expect(ids).toEqual(['656442298', '1905258292', '638902325']);
  });
});
