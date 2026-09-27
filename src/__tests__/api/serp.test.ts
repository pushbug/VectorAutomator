import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getSerp, DELETE as deleteSerp, OPTIONS as optionsSerp } from '@/app/api/serp/route';
import { POST as postSerpSync } from '@/app/api/serp/paste-sync/route';
import { GET as getArtworkSerp } from '@/app/api/serp/artwork/[id]/route';
import { calculateSerpItemStats, synthesizeAdjacentDropouts } from '@/lib/serp/serpEnrichment';
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
        { id: 'item-1', rank: 1, assetId: '507970140', isMine: false, matchedImageId: null, matchedImage: null },
        {
          id: 'item-2',
          rank: 2,
          assetId: '684583478',
          isMine: true,
          matchedImageId: 'img-123',
          matchedImage: {
            id: 'img-123',
            code: '2410-77',
            title: 'Test Vector Title',
            filePath: '/uploads/2410-77.jpg',
          },
        },
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
    const matchedItem = data.myItems.find((i: any) => i.isMine);
    expect(matchedItem?.matchedImageId).toBe('img-123');
    expect(matchedItem?.imageCode).toBe('2410-77');
    expect(matchedItem?.imageTitle).toBe('Test Vector Title');
    expect(matchedItem?.imageFilePath).toBe('/uploads/2410-77.jpg');
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

  it('UT-API-SERP-SORT-01: /api/serp sorts enriched items by downloads, revenue, and keyword', async () => {
    mockSerpItemCount.mockResolvedValue(2);
    mockSerpItemFindMany.mockResolvedValue([
      {
        id: 'item-a',
        rank: 10,
        assetId: 'asset-a',
        title: 'Artwork A',
        author: 'Author A',
        thumbnailUrl: null,
        detailUrl: null,
        serpQueryId: 'q-a',
        matchedImageId: 'img-a',
        serpQuery: { keyword: 'banner', platform: 'Adobe Stock', pageNumber: 1, searchedAt: new Date('2026-08-10') },
        matchedImage: { code: 'A-01', title: 'Artwork A', filePath: '/a.jpg', asDownloads: 5, totalDownloads: 5, stats: [{ downloads: 5, earnings: 5.0 }] },
      },
      {
        id: 'item-b',
        rank: 2,
        assetId: 'asset-b',
        title: 'Artwork B',
        author: 'Author B',
        thumbnailUrl: null,
        detailUrl: null,
        serpQueryId: 'q-b',
        matchedImageId: 'img-b',
        serpQuery: { keyword: 'poster', platform: 'Adobe Stock', pageNumber: 1, searchedAt: new Date('2026-08-11') },
        matchedImage: { code: 'B-02', title: 'Artwork B', filePath: '/b.jpg', asDownloads: 20, totalDownloads: 20, stats: [{ downloads: 20, earnings: 50.0 }] },
      },
    ]);

    // Test sort by downloads desc
    const reqDesc = new NextRequest('http://localhost:3000/api/serp?sortBy=downloads&sortOrder=desc');
    const resDesc = await getSerp(reqDesc);
    const dataDesc = await resDesc.json();
    expect(dataDesc.items[0].assetId).toBe('asset-b');
    expect(dataDesc.items[1].assetId).toBe('asset-a');

    // Test sort by keyword asc
    const reqAsc = new NextRequest('http://localhost:3000/api/serp?sortBy=keyword&sortOrder=asc');
    const resAsc = await getSerp(reqAsc);
    const dataAsc = await resAsc.json();
    expect(dataAsc.items[0].keyword).toBe('banner');
    expect(dataAsc.items[1].keyword).toBe('poster');
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

  it('UT-API-SERP-KEYWORD-SEARCH-01: supports universal search across keywords and exact keyword filter', async () => {
    mockSerpItemCount.mockResolvedValue(2);
    mockSerpItemFindMany
      .mockResolvedValueOnce([
        {
          id: 'item-kw1',
          rank: 5,
          assetId: 'asset-kw1',
          title: 'Clean Minimalist Slide',
          author: 'Me',
          thumbnailUrl: null,
          detailUrl: null,
          serpQueryId: 'q-kw1',
          matchedImageId: 'img-kw1',
          serpQuery: { keyword: 'infographics', platform: 'Adobe Stock', pageNumber: 1, searchedAt: new Date('2026-08-20') },
          matchedImage: { code: 'A-10', title: 'Clean Minimalist Slide', filePath: '/a.jpg', asDownloads: 20, totalDownloads: 20, stats: [] },
        },
        {
          id: 'item-kw2',
          rank: 12,
          assetId: 'asset-kw1', // same asset on earlier date
          title: 'Clean Minimalist Slide',
          author: 'Me',
          thumbnailUrl: null,
          detailUrl: null,
          serpQueryId: 'q-kw2',
          matchedImageId: 'img-kw1',
          serpQuery: { keyword: 'infographics', platform: 'Adobe Stock', pageNumber: 1, searchedAt: new Date('2026-07-20') },
          matchedImage: { code: 'A-10', title: 'Clean Minimalist Slide', filePath: '/a.jpg', asDownloads: 20, totalDownloads: 20, stats: [] },
        },
      ])
      .mockResolvedValueOnce([]); // allPrevItems

    mockSerpQueryFindMany.mockResolvedValue([{ keyword: 'infographics' }]);

    // 1. Exact keyword filter test: retains both snapshots across dates (timeline retention)
    const req = new NextRequest('http://localhost:3000/api/serp?view=artworks&keyword=infographics');
    const res = await getSerp(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.items).toHaveLength(2); // Timeline mode preserves both dates!
    expect(data.items[0].searchedAt).toBe(new Date('2026-08-20').toISOString());
    expect(data.items[1].searchedAt).toBe(new Date('2026-07-20').toISOString());

    // Verify itemWhere clause used exact match
    expect(mockSerpItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          serpQuery: expect.objectContaining({
            keyword: 'infographics',
          }),
        }),
      })
    );
  });

  it('UT-API-SERP-DROPPED-01: synthesizes dropped out artworks between adjacent snapshots and evaluates quickFilter', async () => {
    // Mock current query items (Page 1 in August: asset-1 present, asset-2 missing)
    mockSerpItemFindMany
      .mockResolvedValueOnce([
        {
          id: 'aug-1',
          rank: 2,
          assetId: 'asset-1',
          title: 'Top 10 Vector Graphic',
          author: 'Me',
          thumbnailUrl: null,
          detailUrl: null,
          serpQueryId: 'q-aug',
          matchedImageId: 'img-1',
          serpQuery: { keyword: 'dashboard', platform: 'Adobe Stock', pageNumber: 1, searchedAt: new Date('2026-08-28') },
          matchedImage: { code: 'D-01', title: 'Top 10 Vector Graphic', filePath: '/d1.jpg', asDownloads: 100, totalDownloads: 100, stats: [] },
        },
      ])
      .mockResolvedValueOnce([
        {
          assetId: 'asset-1',
          rank: 8,
          serpQuery: { keyword: 'dashboard', searchedAt: new Date('2026-07-28') },
        },
      ]); // allPrevItems for asset-1

    // Mock kwQueries for adjacent snapshot comparison:
    // Latest (August): asset-1
    // Previous (July): asset-1 and asset-2 (asset-2 was rank 45 in July, dropped in August)
    mockSerpQueryFindMany
      .mockResolvedValueOnce([{ keyword: 'dashboard' }]) // allQueries
      .mockResolvedValueOnce([
        {
          id: 'q-aug',
          keyword: 'dashboard',
          platform: 'Adobe Stock',
          searchedAt: new Date('2026-08-28'),
          items: [{ assetId: 'asset-1', rank: 2, isMine: true }],
        },
        {
          id: 'q-jul',
          keyword: 'dashboard',
          platform: 'Adobe Stock',
          searchedAt: new Date('2026-07-28'),
          items: [
            { assetId: 'asset-1', rank: 8, isMine: true },
            {
              assetId: 'asset-2',
              rank: 45,
              isMine: true,
              title: 'Dropped Vector Element',
              author: 'Me',
              thumbnailUrl: '/thumb.jpg',
              matchedImageId: 'img-2',
              matchedImage: { code: 'D-02', title: 'Dropped Vector Element', filePath: '/d2.jpg', asDownloads: 30, totalDownloads: 30, stats: [] },
            },
          ],
        },
      ]);

    const req = new NextRequest('http://localhost:3000/api/serp?view=artworks&keyword=dashboard');
    const res = await getSerp(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.items).toHaveLength(2);
    // First item is active rank #2 (improved by +6)
    expect(data.items[0].rank).toBe(2);
    expect(data.items[0].rankDelta).toBe(6);
    expect(data.items[0].isDropped).toBe(false);

    // Second item is synthesized dropped out artwork
    const droppedItem = data.items[1];
    expect(droppedItem.assetId).toBe('asset-2');
    expect(droppedItem.rank).toBeNull();
    expect(droppedItem.previousRank).toBe(45);
    expect(droppedItem.isDropped).toBe(true);

    // Quick filter test for quickFilter=dropped
    mockSerpItemFindMany
      .mockResolvedValueOnce([
        {
          id: 'aug-1',
          rank: 2,
          assetId: 'asset-1',
          title: 'Top 10 Vector Graphic',
          author: 'Me',
          thumbnailUrl: null,
          detailUrl: null,
          serpQueryId: 'q-aug',
          matchedImageId: 'img-1',
          serpQuery: { keyword: 'dashboard', platform: 'Adobe Stock', pageNumber: 1, searchedAt: new Date('2026-08-28') },
          matchedImage: { code: 'D-01', title: 'Top 10 Vector Graphic', filePath: '/d1.jpg', asDownloads: 100, totalDownloads: 100, stats: [] },
        },
      ])
      .mockResolvedValueOnce([]);

    mockSerpQueryFindMany
      .mockResolvedValueOnce([{ keyword: 'dashboard' }])
      .mockResolvedValueOnce([
        {
          id: 'q-aug',
          keyword: 'dashboard',
          platform: 'Adobe Stock',
          searchedAt: new Date('2026-08-28'),
          items: [{ assetId: 'asset-1', rank: 2, isMine: true }],
        },
        {
          id: 'q-jul',
          keyword: 'dashboard',
          platform: 'Adobe Stock',
          searchedAt: new Date('2026-07-28'),
          items: [
            {
              assetId: 'asset-2',
              rank: 45,
              isMine: true,
              title: 'Dropped Vector Element',
              author: 'Me',
              thumbnailUrl: '/thumb.jpg',
              matchedImageId: 'img-2',
              matchedImage: { code: 'D-02', title: 'Dropped Vector Element', filePath: '/d2.jpg', asDownloads: 30, totalDownloads: 30, stats: [] },
            },
          ],
        },
      ]);

    const droppedReq = new NextRequest('http://localhost:3000/api/serp?view=artworks&keyword=dashboard&quickFilter=dropped');
    const droppedRes = await getSerp(droppedReq);
    expect(droppedRes.status).toBe(200);
    const droppedData = await droppedRes.json();
    expect(droppedData.items).toHaveLength(1);
    expect(droppedData.items[0].isDropped).toBe(true);
    expect(droppedData.items[0].previousRank).toBe(45);
  });

  it('UT-API-SERP-PASTE-PAGES-01: scopes same-day query replacement by pageNumber, preserving other pages', async () => {
    mockImageFindMany.mockResolvedValue([
      { id: 'img-1', asId: '1001', title: 'Vector 1' },
    ]);

    let capturedDeleteScope: any = null;
    mockTransaction.mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback({
          serpQuery: {
            findMany: vi.fn().mockImplementation(({ where }) => {
              capturedDeleteScope = where;
              if (where.pageNumber === 2) {
                return Promise.resolve([{ id: 'existing-q-page-2' }]);
              }
              return Promise.resolve([]);
            }),
            create: vi.fn().mockResolvedValue({
              id: 'new-q-page-2',
              keyword: 'infographic',
              platform: 'Adobe Stock',
              pageNumber: 2,
              searchedAt: new Date('2026-08-20'),
              totalItems: 1,
              myItemsCount: 1,
              items: [],
            }),
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          serpItem: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
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

    const payload = {
      keyword: 'infographic',
      platform: 'Adobe Stock',
      pageNumber: 2,
      searchedAt: '2026-08-20T10:00:00.000Z',
      items: [
        { rank: 101, assetId: '1001', title: 'Vector 1', author: 'Me' },
      ],
    };

    const req = new NextRequest('http://localhost:3000/api/serp/paste-sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await postSerpSync(req);
    expect(res.status).toBe(201);
    expect(capturedDeleteScope).toBeDefined();
    expect(capturedDeleteScope.keyword).toBe('infographic');
    expect(capturedDeleteScope.platform).toBe('Adobe Stock');
    expect(capturedDeleteScope.pageNumber).toBe(2);
  });

  it('UT-API-SERP-ENRICH-01: calculates stats correctly and synthesizes dropouts across multiple keywords concurrently', async () => {
    // 1. Test calculateSerpItemStats helper directly
    const directStatsMap = new Map([
      ['asset-999', { downloads: 50, earnings: 75.0 }],
    ]);
    const statsResult = calculateSerpItemStats(
      {
        asDownloads: 10,
        totalDownloads: 15,
        stats: [{ downloads: 10, earnings: 25.0, platform: 'Adobe Stock' }],
      },
      directStatsMap,
      'asset-999'
    );
    expect(statsResult.asDownloads).toBe(10);
    expect(statsResult.totalDownloads).toBe(50);
    expect(statsResult.totalEarnings).toBe(75.0);

    // 2. Test synthesizeAdjacentDropouts with multiple keywords in parallel
    const fakePrisma = {
      serpQuery: {
        findMany: vi.fn().mockImplementation(({ where }) => {
          if (where.keyword === 'kw-1') {
            return Promise.resolve([
              {
                id: 'q-kw1-latest',
                keyword: 'kw-1',
                platform: 'Adobe Stock',
                searchedAt: new Date('2026-08-20'),
                items: [{ assetId: 'a1', rank: 1, isMine: true }],
              },
              {
                id: 'q-kw1-prev',
                keyword: 'kw-1',
                platform: 'Adobe Stock',
                searchedAt: new Date('2026-08-10'),
                items: [
                  { assetId: 'a1', rank: 2, isMine: true },
                  { assetId: 'a2', rank: 15, isMine: true, title: 'Dropped in KW1', author: 'Me', matchedImage: null },
                ],
              },
            ]);
          }
          if (where.keyword === 'kw-2') {
            return Promise.resolve([
              {
                id: 'q-kw2-latest',
                keyword: 'kw-2',
                platform: 'Adobe Stock',
                searchedAt: new Date('2026-08-20'),
                items: [{ assetId: 'b1', rank: 5, isMine: true }],
              },
              {
                id: 'q-kw2-prev',
                keyword: 'kw-2',
                platform: 'Adobe Stock',
                searchedAt: new Date('2026-08-10'),
                items: [
                  { assetId: 'b1', rank: 5, isMine: true },
                  { assetId: 'b2', rank: 30, isMine: true, title: 'Dropped in KW2', author: 'Me', matchedImage: null },
                ],
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      },
    };

    const droppedItems = await synthesizeAdjacentDropouts(fakePrisma, ['kw-1', 'kw-2']);
    expect(droppedItems).toHaveLength(2);
    expect(droppedItems.find((d) => d.assetId === 'a2')?.keyword).toBe('kw-1');
    expect(droppedItems.find((d) => d.assetId === 'a2')?.previousRank).toBe(15);
    expect(droppedItems.find((d) => d.assetId === 'b2')?.keyword).toBe('kw-2');
    expect(droppedItems.find((d) => d.assetId === 'b2')?.previousRank).toBe(30);
  });
});

