import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as postPortfolioPasteSync, computeSimilarity, normalizeTitle, cleanSuffixes } from '@/app/api/portfolio/paste-sync/route';
import { NextRequest } from 'next/server';

const {
  mockImageFindMany,
  mockImageFindUnique,
  mockImageFindFirst,
  mockImageUpdate,
  mockImageCreate,
  mockPlatformStatsUpsert,
  mockSerpItemUpdateMany,
  mockScheduleAutoBackup,
  mockCreateDbBackup,
  mockReconcileImageSales,
} = vi.hoisted(() => ({
  mockImageFindMany: vi.fn(),
  mockImageFindUnique: vi.fn(),
  mockImageFindFirst: vi.fn(),
  mockImageUpdate: vi.fn(),
  mockImageCreate: vi.fn(),
  mockPlatformStatsUpsert: vi.fn(),
  mockSerpItemUpdateMany: vi.fn(),
  mockScheduleAutoBackup: vi.fn(),
  mockCreateDbBackup: vi.fn(),
  mockReconcileImageSales: vi.fn().mockResolvedValue({ reconciledCount: 0 }),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    image: {
      findMany: mockImageFindMany,
      findUnique: mockImageFindUnique,
      findFirst: mockImageFindFirst,
      update: mockImageUpdate,
      create: mockImageCreate,
    },
    platformStats: {
      upsert: mockPlatformStatsUpsert,
    },
    serpItem: {
      updateMany: mockSerpItemUpdateMany,
    },
  },
}));

vi.mock('@/lib/salesReconciler', () => ({
  reconcileImageSales: mockReconcileImageSales,
}));

vi.mock('@/lib/dbBackup', () => ({
  scheduleAutoBackup: mockScheduleAutoBackup,
  createDbBackup: mockCreateDbBackup,
}));

describe('UT-API-PORTFOLIO-SYNC-ID-01: Smart Bulk Asset ID Matcher Preview & Commit API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates dry-run preview with exact matches without mutating database', async () => {
    mockImageFindMany.mockResolvedValue([
      {
        id: 'img-1',
        code: '2408-01',
        title: '10 Important historical event timeline infographic brochure.',
        filePath: '/uploads/2408-01.jpg',
        asId: null,
        asDownloads: 0,
        ssDownloads: 50,
        totalDownloads: 50,
      },
      {
        id: 'img-2',
        code: '2408-02',
        title: 'Workflow lines infographic. The pie chart is divided into 6 parts.',
        filePath: '/uploads/2408-02.jpg',
        asId: null,
        asDownloads: 0,
        ssDownloads: 10,
        totalDownloads: 10,
      },
    ]);

    const tsvData = [
      'Asset ID\tTitle\tDownloads\tThumbnail',
      '569029521\t10 Important historical event timeline infographic brochure.\t1,410\thttps://as2.ftcdn.net/img1.jpg',
      '636376104\tWorkflow lines infographic. The pie chart is divided into 6 parts.\t1399\thttps://as2.ftcdn.net/img2.jpg',
    ].join('\n');

    const req = new NextRequest('http://localhost:3000/api/portfolio/paste-sync', {
      method: 'POST',
      body: JSON.stringify({ text: tsvData }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postPortfolioPasteSync(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.preview).toBe(true);
    expect(json.totalParsed).toBe(2);
    expect(json.exactCount).toBe(2);
    expect(json.fuzzyCount).toBe(0);
    expect(json.unmatchedCount).toBe(0);

    // Verify dry-run: image update was NOT called
    expect(mockImageUpdate).not.toHaveBeenCalled();
    expect(mockPlatformStatsUpsert).not.toHaveBeenCalled();

    // Verify row structure
    expect(json.rows[0].asId).toBe('569029521');
    expect(json.rows[0].status).toBe('exact');
    expect(json.rows[0].matchedImage.id).toBe('img-1');
    expect(json.rows[0].matchedImage.code).toBe('2408-01');
    expect(json.rows[0].thumbnailUrl).toBe('https://as2.ftcdn.net/img1.jpg');
  });

  it('commits approved items atomically to database', async () => {
    mockImageFindUnique.mockResolvedValueOnce({
      id: 'img-1',
      ssDownloads: 50,
      asDownloads: 0,
    });
    mockImageUpdate.mockResolvedValue({});
    mockPlatformStatsUpsert.mockResolvedValue({});
    mockSerpItemUpdateMany.mockResolvedValue({ count: 1 });

    const req = new NextRequest('http://localhost:3000/api/portfolio/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        action: 'commit',
        items: [
          {
            imageId: 'img-1',
            asId: '569029521',
          },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postPortfolioPasteSync(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.committedCount).toBe(1);

    expect(mockCreateDbBackup).toHaveBeenCalled();
    expect(mockImageUpdate).toHaveBeenCalledWith({
      where: { id: 'img-1' },
      data: {
        asId: '569029521',
      },
    });

    expect(mockReconcileImageSales).toHaveBeenCalledWith(expect.anything(), {
      id: 'img-1',
      asId: '569029521',
    });

    expect(mockSerpItemUpdateMany).toHaveBeenCalledWith({
      where: { assetId: '569029521' },
      data: {
        isMine: true,
        matchedImageId: 'img-1',
      },
    });

    expect(mockCreateDbBackup).toHaveBeenCalled();
  });

  it('creates placeholder artwork with custom past date and generates correct monthly code', async () => {
    mockImageFindFirst.mockResolvedValueOnce({ seqNumber: 5 });
    mockImageCreate.mockResolvedValueOnce({
      id: 'created-img-1',
      code: '2305-6',
      year: 2023,
      month: 5,
      seqNumber: 6,
      title: 'Annual Report Sales Summary Quarter Of Year',
      asId: '169309344',
      createdAt: new Date('2023-05-15T12:00:00.000Z'),
    });

    const req = new NextRequest('http://localhost:3000/api/portfolio/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        action: 'commit',
        items: [
          {
            action: 'create_placeholder',
            title: 'Annual Report Sales Summary Quarter Of Year',
            asId: '169309344',
            date: '2023-05-15',
          },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postPortfolioPasteSync(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.committedCount).toBe(1);

    expect(mockImageCreate).toHaveBeenCalledWith({
      data: {
        code: '2305-06',
        year: 2023,
        month: 5,
        seqNumber: 6,
        title: 'Annual Report Sales Summary Quarter Of Year',
        asId: '169309344',
        asDownloads: 0,
        totalDownloads: 0,
        keywords: '',
        category: null,
        filePath: '',
        status: 'pending',
        createdAt: new Date('2023-05-15T12:00:00.000Z'),
      },
    });
    expect(mockReconcileImageSales).toHaveBeenCalledWith(expect.anything(), {
      id: 'created-img-1',
      asId: '169309344',
    });
    expect(mockCreateDbBackup).toHaveBeenCalled();
  });
});

describe('UT-API-PORTFOLIO-FUZZY-SYNC-01: Fuzzy Matching & Ambiguity Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes common stock suffixes and punctuation correctly', () => {
    expect(cleanSuffixes('Business Infographic Design Vector illustration.')).toBe('Business Infographic Design');
    expect(normalizeTitle('3-step process infographic template.')).toBe('3stepprocessinfographic');
    expect(normalizeTitle('3 step process infographic template')).toBe('3stepprocessinfographic');
  });

  it('computes similarity between similar titles', () => {
    const sim = computeSimilarity(
      'Business infographic template 5 step process',
      'Business infographic template 5 step diagram'
    );
    expect(sim).toBeGreaterThan(0.65);
  });

  it('flags items as fuzzy/needs_review when similarity >= 0.60', async () => {
    mockImageFindMany.mockResolvedValue([
      {
        id: 'img-3',
        code: '2408-03',
        title: 'Modern Business Infographic with 5 Arrows',
        filePath: '/uploads/2408-03.jpg',
        asId: null,
        asDownloads: 0,
        ssDownloads: 0,
        totalDownloads: 0,
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/portfolio/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        text: '999111222\tModern Business Infographic with 5 Step Arrows Vector\t45',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postPortfolioPasteSync(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.rows[0].status).toBe('fuzzy');
    expect(json.rows[0].matchedImage.id).toBe('img-3');
    expect(json.rows[0].confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('flags ambiguous titles when multiple DB images share the same normalized title', async () => {
    mockImageFindMany.mockResolvedValue([
      {
        id: 'img-4a',
        code: '2408-04A',
        title: 'Abstract Geometric Background',
        filePath: '/uploads/2408-04a.jpg',
        asId: null,
        asDownloads: 0,
        ssDownloads: 0,
        totalDownloads: 0,
      },
      {
        id: 'img-4b',
        code: '2408-04B',
        title: 'Abstract Geometric Background Vector',
        filePath: '/uploads/2408-04b.jpg',
        asId: null,
        asDownloads: 0,
        ssDownloads: 0,
        totalDownloads: 0,
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/portfolio/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        text: '123456789\tAbstract Geometric Background\t10',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postPortfolioPasteSync(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.rows[0].status).toBe('ambiguous');
    expect(json.rows[0].candidates.length).toBe(2);
    expect(json.rows[0].matchedImage).toBeNull();
  });

  it('strictly excludes images that already have an asId from fuzzy similarity candidate suggestions', async () => {
    mockImageFindMany.mockResolvedValue([
      {
        id: 'img-synced-1',
        code: '1710-01',
        title: 'hacker criminal security internet',
        filePath: '/uploads/1710-01.jpg',
        asId: '175524050', // Already assigned!
        asDownloads: 50,
        ssDownloads: 0,
        totalDownloads: 50,
      },
      {
        id: 'img-unsynced-2',
        code: '2408-99',
        title: 'different topic business finance chart',
        filePath: '/uploads/2408-99.jpg',
        asId: null,
        asDownloads: 0,
        ssDownloads: 0,
        totalDownloads: 0,
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/portfolio/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        text: '345672354\thacker anonymous criminal security internet network.\t100',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postPortfolioPasteSync(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    // Because img-synced-1 is excluded, this item should cleanly land in 'unmatched'
    expect(json.rows[0].status).toBe('unmatched');
    expect(json.rows[0].matchedImage).toBeNull();
    expect(json.unmatchedCount).toBe(1);
    expect(json.fuzzyCount).toBe(0);
  });

  it('commits action: create_placeholder generating a pending Image record with metadata and zero CDN requests', async () => {
    mockImageFindFirst.mockResolvedValue(null);
    mockImageCreate.mockResolvedValue({
      id: 'new-img-cuid',
      title: 'hacker anonymous criminal security internet network.',
      asId: '345672354',
      status: 'pending',
    });
    mockSerpItemUpdateMany.mockResolvedValue({ count: 0 });

    const req = new NextRequest('http://localhost:3000/api/portfolio/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        action: 'commit',
        items: [
          {
            action: 'create_placeholder',
            title: 'hacker anonymous criminal security internet network.',
            asId: '345672354',
          },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postPortfolioPasteSync(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.committedCount).toBe(1);

    expect(mockImageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'hacker anonymous criminal security internet network.',
        asId: '345672354',
        asDownloads: 0,
        totalDownloads: 0,
        keywords: '',
        filePath: '',
        status: 'pending',
      }),
    });

    expect(mockSerpItemUpdateMany).toHaveBeenCalledWith({
      where: { assetId: '345672354' },
      data: {
        isMine: true,
        matchedImageId: 'new-img-cuid',
      },
    });

    expect(mockCreateDbBackup).toHaveBeenCalled();
  });

  it('prioritizes direct asId match as already-synced exact match on re-import even if title differs', async () => {
    mockImageFindMany.mockResolvedValue([
      {
        id: 'img-2204-29',
        code: '2204-29',
        title: 'Red Ocean compare with Blue Ocean. Business marketing presentation',
        filePath: '/uploads/2204-29.jpg',
        asId: '498624504',
        asDownloads: 25,
        ssDownloads: 0,
        totalDownloads: 25,
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/portfolio/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        text: '498624504\tRed Ocean compares with Blue Ocean. Business marketing presentation\t50\thttps://as2.ftcdn.net/img.jpg',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postPortfolioPasteSync(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.rows[0].status).toBe('exact');
    expect(json.rows[0].isAlreadySynced).toBe(true);
    expect(json.rows[0].matchedImage.id).toBe('img-2204-29');
    expect(json.rows[0].matchedImage.code).toBe('2204-29');
  });

  it('resolves previously committed candidate in ambiguous group as already-synced exact match on re-import', async () => {
    mockImageFindMany.mockResolvedValue([
      {
        id: 'img-2211-101',
        code: '2211-101',
        title: 'Infographic colorful arrow crossroads 5 options. Vector illustration.',
        filePath: '/uploads/2211-101.jpg',
        asId: '557875582', // User previously committed this one!
        asDownloads: 10,
        ssDownloads: 0,
        totalDownloads: 10,
      },
      {
        id: 'img-2301-16',
        code: '2301-16',
        title: 'Infographic colorful arrow crossroads 5 options. Vector illustration.',
        filePath: '/uploads/2301-16.jpg',
        asId: null,
        asDownloads: 0,
        ssDownloads: 0,
        totalDownloads: 0,
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/portfolio/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        text: '557875582\tInfographic colorful arrow crossroads 5 options. Vector illustration.\t15\thttps://as2.ftcdn.net/cross.jpg',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postPortfolioPasteSync(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.rows[0].status).toBe('exact');
    expect(json.rows[0].isAlreadySynced).toBe(true);
    expect(json.rows[0].matchedImage.id).toBe('img-2211-101');
    expect(json.rows[0].matchedImage.code).toBe('2211-101');
  });

  it('commits action: create_placeholder with custom keywords and category correctly', async () => {
    mockImageFindFirst.mockResolvedValue(null);
    mockImageCreate.mockResolvedValue({
      id: 'new-img-cuid-2',
      title: 'Business Infographic Workflow',
      asId: '888999111',
      keywords: 'business, infographic, workflow',
      category: 'Business',
      status: 'pending',
    });
    mockSerpItemUpdateMany.mockResolvedValue({ count: 0 });

    const req = new NextRequest('http://localhost:3000/api/portfolio/paste-sync', {
      method: 'POST',
      body: JSON.stringify({
        action: 'commit',
        items: [
          {
            action: 'create_placeholder',
            title: 'Business Infographic Workflow',
            asId: '888999111',
            date: '2026-08-25',
            code: '2608-99',
            keywords: 'business, infographic, workflow',
            category: 'Business',
          },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await postPortfolioPasteSync(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.committedCount).toBe(1);

    expect(mockImageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: '2608-99',
        title: 'Business Infographic Workflow',
        asId: '888999111',
        keywords: 'business, infographic, workflow',
        category: 'Business',
      }),
    });
  });
});
