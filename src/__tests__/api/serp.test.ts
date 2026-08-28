import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getSerp, DELETE as deleteSerp, OPTIONS as optionsSerp } from '@/app/api/serp/route';
import { POST as postSerpSync } from '@/app/api/serp/paste-sync/route';
import { GET as getArtworkSerp } from '@/app/api/serp/artwork/[id]/route';
import { NextRequest } from 'next/server';

const {
  mockImageFindMany,
  mockImageFindUnique,
  mockImageFindFirst,
  mockSerpQueryCreate,
  mockSerpQueryFindMany,
  mockSerpQueryFindUnique,
  mockSerpQueryDelete,
  mockSerpQueryGroupBy,
  mockSerpQueryDeleteMany,
  mockSerpItemFindMany,
  mockSerpItemFindFirst,
  mockSerpItemCount,
  mockSerpItemDeleteMany,
  mockSerpItemGroupBy,
  mockPlatformStatsFindMany,
  mockTransaction,
  mockExecuteRawUnsafe,
} = vi.hoisted(() => ({
  mockImageFindMany: vi.fn(),
  mockImageFindUnique: vi.fn(),
  mockImageFindFirst: vi.fn(),
  mockSerpQueryCreate: vi.fn(),
  mockSerpQueryFindMany: vi.fn(),
  mockSerpQueryFindUnique: vi.fn(),
  mockSerpQueryDelete: vi.fn(),
  mockSerpQueryDeleteMany: vi.fn(),
  mockSerpQueryGroupBy: vi.fn(),
  mockSerpItemFindMany: vi.fn(),
  mockSerpItemFindFirst: vi.fn(),
  mockSerpItemCount: vi.fn(),
  mockSerpItemDeleteMany: vi.fn(),
  mockSerpItemGroupBy: vi.fn(),
  mockPlatformStatsFindMany: vi.fn(),
  mockTransaction: vi.fn(),
  mockExecuteRawUnsafe: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    image: {
      findMany: mockImageFindMany,
      findUnique: mockImageFindUnique,
      findFirst: mockImageFindFirst,
    },
    serpQuery: {
      create: mockSerpQueryCreate,
      findMany: mockSerpQueryFindMany,
      findUnique: mockSerpQueryFindUnique,
      delete: mockSerpQueryDelete,
      deleteMany: mockSerpQueryDeleteMany,
      groupBy: mockSerpQueryGroupBy,
    },
    serpItem: {
      findMany: mockSerpItemFindMany,
      findFirst: mockSerpItemFindFirst,
      count: mockSerpItemCount,
      deleteMany: mockSerpItemDeleteMany,
      groupBy: mockSerpItemGroupBy,
    },
    platformStats: {
      findMany: mockPlatformStatsFindMany,
    },
    $transaction: mockTransaction,
    $executeRawUnsafe: mockExecuteRawUnsafe,
  },
}));

describe('SERP API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSerpQueryFindMany.mockResolvedValue([]);
    mockSerpQueryGroupBy.mockResolvedValue([{ keyword: 'infographic' }]);
    mockSerpItemGroupBy.mockResolvedValue([{ assetId: '1056563551' }]);
    mockPlatformStatsFindMany.mockResolvedValue([]);
    mockExecuteRawUnsafe.mockResolvedValue(0);

    mockTransaction.mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback({
          serpQuery: {
            create: mockSerpQueryCreate,
            delete: mockSerpQueryDelete,
            deleteMany: mockSerpQueryDeleteMany,
            findMany: mockSerpQueryFindMany,
          },
          serpItem: {
            deleteMany: mockSerpItemDeleteMany,
          },
          image: {
            findMany: mockImageFindMany,
            findUnique: mockImageFindUnique,
            findFirst: mockImageFindFirst,
          },
        });
      }
      return callback;
    });
  });

  it('handles CORS OPTIONS requests', () => {
    const res = optionsSerp();
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('POST /api/serp/paste-sync matches portfolio asId, calculates ranks, and persists', async () => {
    mockImageFindMany.mockResolvedValue([
      { id: 'img-123', asId: '684583478', title: 'Test Vector' },
    ]);

    mockSerpQueryCreate.mockResolvedValue({
      id: 'query-1',
      keyword: 'infographic 2',
      platform: 'Adobe Stock',
      pageNumber: 1,
      searchedAt: new Date('2026-08-10'),
      totalItems: 2,
      myItemsCount: 1,
      items: [
        { id: 'item-1', rank: 1, assetId: '507970140', isMine: false, matchedImageId: null },
        { id: 'item-2', rank: 2, assetId: '684583478', isMine: true, matchedImageId: 'img-123' },
      ],
    });

    const payload = {
      keyword: 'infographic 2',
      pageNumber: 1,
      searchedAt: '2026-08-10',
      items: [
        { rank: 1, assetId: '507970140', title: 'Diverse coworkers working together', author: 'Studio A' },
        { rank: 2, assetId: '684583478', title: '2 step infographic template vector element', author: 'Haris' },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/serp/paste-sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await postSerpSync(req);
    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.keyword).toBe('infographic 2');
    expect(data.totalItems).toBe(2);
    expect(data.myItemsCount).toBe(1);
    expect(data.myRanks).toEqual([2]);
    expect(data.myItems.find((i: any) => i.isMine)?.matchedImageId).toBe('img-123');
  });

  it('UT-SERP-DELTA-01: calculates historical rank deltas across sequential snapshots', async () => {
    mockSerpItemCount
      .mockResolvedValueOnce(1) // totalCount
      .mockResolvedValueOnce(2) // page1Count
      .mockResolvedValueOnce(1); // top10Count

    mockSerpItemFindMany
      .mockResolvedValueOnce([
        {
          id: 'item-2',
          rank: 3,
          assetId: '684583478',
          title: 'Infographic 3',
          author: 'Me',
          thumbnailUrl: null,
          detailUrl: null,
          serpQueryId: 'q-2',
          matchedImageId: 'img-123',
          serpQuery: {
            keyword: 'infographic',
            platform: 'Adobe Stock',
            pageNumber: 1,
            searchedAt: new Date('2026-08-15'),
          },
          matchedImage: {
            code: 'TST-2608-01',
            title: 'Infographic 3',
            filePath: '/uploads/test.jpg',
            asDownloads: 10,
            totalDownloads: 15,
            stats: [{ downloads: 10, earnings: 12.5, platform: 'Adobe Stock' }],
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          assetId: '684583478',
          rank: 15,
          serpQuery: { keyword: 'infographic', searchedAt: new Date('2026-08-01') },
        },
      ]);

    mockSerpQueryFindMany.mockResolvedValue([{ keyword: 'infographic' }]);
    mockSerpQueryGroupBy.mockResolvedValue([{ keyword: 'infographic' }]);
    mockSerpItemGroupBy
      .mockResolvedValueOnce([{ assetId: '684583478' }, { assetId: 'other-asset' }]) // page1Count
      .mockResolvedValueOnce([{ assetId: '684583478' }]); // top10Count

    mockSerpItemFindFirst
      .mockResolvedValueOnce({ rank: 3, serpQuery: { keyword: 'infographic' } }); // bestRankItem

    const req = new NextRequest('http://localhost:3000/api/serp?view=artworks&keyword=infographic');
    const res = await getSerp(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.items).toHaveLength(1);
    const latestItem = data.items[0];
    expect(latestItem.rank).toBe(3);
    expect(latestItem.previousRank).toBe(15);
    expect(latestItem.rankDelta).toBe(12);
    expect(latestItem.isNew).toBe(false);
    expect(latestItem.imageCode).toBe('TST-2608-01');
    expect(latestItem.totalEarnings).toBe(12.5);

    expect(data.summary.totalKeywords).toBe(1);
    expect(data.summary.page1Artworks).toBe(2);
    expect(data.summary.top10Artworks).toBe(1);
    expect(data.summary.bestRank).toContain('#3');
  });

  it('UT-API-SERP-ARTWORK-01: /api/serp/artwork/[id] returns keyword progression and sales correlation', async () => {
    mockImageFindFirst.mockResolvedValue({
      id: 'img-123',
      code: 'TST-2608-01',
      title: 'Infographic 5',
      filePath: '/uploads/test.jpg',
      asDownloads: 10,
      totalDownloads: 15,
      stats: [{ downloads: 10, earnings: 12.5, platform: 'Adobe Stock' }],
    });

    mockSerpItemFindMany.mockResolvedValue([
      {
        id: 'item-1',
        rank: 5,
        serpQuery: {
          id: 'q-1',
          keyword: 'infographic',
          platform: 'Adobe Stock',
          searchedAt: new Date('2026-08-10'),
        },
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/serp/artwork/img-123');
    const res = await getArtworkSerp(req, { params: Promise.resolve({ id: 'img-123' }) });
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.artwork.id).toBe('img-123');
    expect(data.artwork.code).toBe('TST-2608-01');
    expect(data.artwork.totalEarnings).toBe(12.5);
    expect(data.activeKeywords).toHaveLength(1);
    expect(data.activeKeywords[0].keyword).toBe('infographic');
    expect(data.activeKeywords[0].currentRank).toBe(5);
    expect(data.history).toHaveLength(1);
    expect(data.history[0].milestone).toBe('Top 10 🚀');
  });

  it('UT-SERP-RECONCILE-02: paste-sync cross-references asId, ssId, and vzId, and GET triggers proactive raw SQL reconcile', async () => {
    mockImageFindMany.mockResolvedValueOnce([
      { id: 'img-as', asId: '1056563551', title: 'Infographic 5 Elements' },
      { id: 'img-ss', ssId: '888999111', title: 'Shutter Vector Banner' },
      { id: 'img-vz', vzId: 'vz-777', title: 'Vecteezy Flow Diagram' },
    ]);

    mockTransaction.mockImplementation(async (cb) => {
      if (typeof cb === 'function') {
        return cb({
          serpQuery: {
            create: vi.fn().mockImplementation(({ data }) =>
              Promise.resolve({
                id: 'q-reconciled',
                keyword: data.keyword,
                platform: data.platform,
                searchedAt: data.searchedAt,
                totalItems: data.totalItems,
                myItemsCount: data.myItemsCount,
                items: [],
              })
            ),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            findMany: vi.fn().mockResolvedValue([]),
          },
          serpItem: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        });
      }
      return cb;
    });

    const pasteBody = {
      keyword: 'diagram',
      platform: 'Adobe Stock',
      pageNumber: 1,
      items: [
        { rank: 1, assetId: '1056563551', title: 'Infographic 5 Elements' },
        { rank: 2, assetId: '888999111', title: 'Shutter Vector Banner' },
        { rank: 3, assetId: 'vz-777', title: 'Vecteezy Flow Diagram' },
      ],
    };

    const pasteReq = new NextRequest('http://localhost:3000/api/serp/paste-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pasteBody),
    });

    const pasteRes = await postSerpSync(pasteReq);
    expect(pasteRes.status).toBe(201);
    const pasteData = await pasteRes.json();
    expect(pasteData.myItemsCount).toBe(3);
    expect(pasteData.myRanks).toEqual([1, 2, 3]);

    // Test GET /api/serp triggers proactive $executeRawUnsafe reconcile
    const getReq = new NextRequest('http://localhost:3000/api/serp?view=artworks');
    await getSerp(getReq);
    expect(mockExecuteRawUnsafe).toHaveBeenCalled();
  });
});
