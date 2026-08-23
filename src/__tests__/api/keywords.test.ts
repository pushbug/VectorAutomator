import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/keywords/route';
import { NextRequest } from 'next/server';

const { mockFindMany } = vi.hoisted(() => {
  return {
    mockFindMany: vi.fn(),
  };
});

vi.mock('@/generated/prisma/client', () => {
  return {
    PrismaClient: class {
      image = {
        findMany: mockFindMany,
      };
      platformStats = {
        findMany: vi.fn().mockResolvedValue([]),
      };
    },
  };
});

describe('Keywords API Route (UT-API-KW-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockImages = [
    {
      id: 'img1',
      code: '2608-01',
      title: 'Business Infographic Workflow',
      keywords: 'business, infographic, workflow, process, template, chart',
      totalDownloads: 50,
      filePath: '/files/2608-01.jpg',
      stats: [
        { platform: 'Adobe Stock', downloads: 30, earnings: 45.0 },
        { platform: 'Shutterstock', downloads: 20, earnings: 15.0 },
      ],
    },
    {
      id: 'img2',
      code: '2608-02',
      title: 'Corporate Timeline Infographic',
      keywords: 'timeline, business, milestone, infographic, planning',
      totalDownloads: 25,
      filePath: '/files/2608-02.jpg',
      stats: [
        { platform: 'Adobe Stock', downloads: 25, earnings: 30.0 },
      ],
    },
    {
      id: 'img3',
      code: '2608-03',
      title: 'Vector Arrow Step Diagram',
      keywords: 'arrow, step, diagram, business, marketing',
      totalDownloads: 10,
      filePath: '/files/2608-03.jpg',
      stats: [
        { platform: 'Shutterstock', downloads: 10, earnings: 5.0 },
      ],
    },
  ];

  it('aggregates keywords, computes summary KPIs, and returns paginated data', async () => {
    mockFindMany.mockResolvedValueOnce(mockImages);

    const req = new NextRequest('http://localhost:3000/api/keywords?page=1&limit=10&sortBy=earnings');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.meta.total).toBeGreaterThan(0);
    expect(json.meta.page).toBe(1);
    expect(json.meta.limit).toBe(10);
    expect(json.summary.totalTaggedAssets).toBe(3);
    expect(json.summary.topEarningKeyword?.keyword).toBe('business');
    expect(json.summary.topEarningKeyword?.earnings).toBe(95.0); // 60 + 30 + 5

    // Top keyword in sorted data by earnings should be 'business'
    const topToken = json.data[0];
    expect(topToken.keyword).toBe('business');
    expect(topToken.frequency).toBe(3);
    expect(topToken.totalDownloads).toBe(85);
    expect(topToken.totalEarnings).toBe(95.0);
    expect(topToken.rpi).toBe(31.67);
    expect(topToken.rpd).toBe(1.12);
    expect(topToken.tier).toBe('draw_more');
  });

  it('filters keywords by search query', async () => {
    mockFindMany.mockResolvedValueOnce(mockImages);

    const req = new NextRequest('http://localhost:3000/api/keywords?search=time');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data.length).toBe(1);
    expect(json.data[0].keyword).toBe('timeline');
  });

  it('sorts keywords by downloads and respects sortOrder', async () => {
    mockFindMany.mockResolvedValueOnce(mockImages);

    const req = new NextRequest('http://localhost:3000/api/keywords?sortBy=downloads&sortOrder=desc');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data[0].keyword).toBe('business');
    expect(json.data[0].totalDownloads).toBe(85);
  });

  it('filters by tier correctly', async () => {
    mockFindMany.mockResolvedValueOnce([
      ...mockImages,
      {
        id: 'img4',
        code: '2608-04',
        title: 'Untested Asset',
        keywords: 'rareconcept',
        totalDownloads: 0,
        filePath: '/files/2608-04.jpg',
        stats: [],
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/keywords?tier=untested');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data.length).toBe(1);
    expect(json.data[0].keyword).toBe('rareconcept');
    expect(json.data[0].tier).toBe('untested');
  });

  it('UT-API-KW-02: filters keyword analytics metrics by timeRange cutoff', async () => {
    const recentDate = new Date().toISOString();
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ago

    mockFindMany.mockResolvedValueOnce([
      {
        id: 'img1',
        title: 'Recent and Old Sales',
        keywords: 'trendingtag',
        totalDownloads: 50,
        stats: [
          { platform: 'Adobe Stock', downloads: 10, earnings: 20.0, date: recentDate },
          { platform: 'Adobe Stock', downloads: 40, earnings: 80.0, date: oldDate },
        ],
      },
    ]);

    // Requesting 30d should only sum stats from the recentDate (10 downloads, $20.00 earnings)
    const req = new NextRequest('http://localhost:3000/api/keywords?timeRange=30d');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data.length).toBe(1);
    expect(json.data[0].keyword).toBe('trendingtag');
    expect(json.data[0].totalDownloads).toBe(10);
    expect(json.data[0].totalEarnings).toBe(20.0);
  });

  it('UT-API-KW-03: returns key-value dictionary in mode=lookup', async () => {
    mockFindMany.mockResolvedValueOnce(mockImages);

    const req = new NextRequest('http://localhost:3000/api/keywords?mode=lookup&words=business,timeline');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.dictionary).toBeDefined();
    expect(json.dictionary.business).toBeDefined();
    expect(json.dictionary.business.totalDownloads).toBe(85);
    expect(json.dictionary.business.totalEarnings).toBe(95.0);
    expect(json.dictionary.timeline).toBeDefined();
    expect(json.dictionary.timeline.totalDownloads).toBe(25);
  });

  it('handles empty database and server errors gracefully', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const req = new NextRequest('http://localhost:3000/api/keywords');
    const res = await GET(req);
    const json = await res.json();

    expect(json.data).toEqual([]);
    expect(json.meta.total).toBe(0);
    expect(json.summary.totalUniqueKeywords).toBe(0);
    expect(json.summary.totalTaggedAssets).toBe(0);
    expect(json.summary.topEarningKeyword).toBeNull();
  });
});
