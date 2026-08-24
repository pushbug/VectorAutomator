import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { GET as getSerp, OPTIONS as optionsSerp } from '@/app/api/serp/route';
import { POST as postSerpSync } from '@/app/api/serp/paste-sync/route';
import { NextRequest } from 'next/server';

describe('SERP API Routes', () => {
  let createdImageId: string;

  beforeEach(async () => {
    // Setup test Image with asId
    const image = await prisma.image.create({
      data: {
        title: 'Test Infographic Arrow Goal',
        keywords: 'infographic, arrow, goal, business',
        filePath: '/uploads/test.jpg',
        asId: '684583478', // Matching test Adobe ID
      },
    });
    createdImageId = image.id;
  });

  afterEach(async () => {
    await prisma.serpQuery.deleteMany({});
    await prisma.image.deleteMany({ where: { id: createdImageId } });
  });

  it('handles CORS OPTIONS requests', () => {
    const res = optionsSerp();
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('POST /api/serp/paste-sync matches portfolio asId, calculates ranks, and persists', async () => {
    const payload = {
      keyword: 'infographic 2',
      pageNumber: 1,
      items: [
        {
          rank: 1,
          assetId: '507970140',
          title: 'Diverse coworkers working together',
          author: 'Studio A',
        },
        {
          rank: 2,
          assetId: '684583478', // Should match our portfolio image
          title: '2 step infographic template vector element',
          author: 'Haris',
        },
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
    expect(data.myItems[0].matchedImageId).toBe(createdImageId);

    // Verify in database
    const savedQuery = await prisma.serpQuery.findUnique({
      where: { id: data.serpQueryId },
      include: { items: true },
    });
    expect(savedQuery).not.toBeNull();
    expect(savedQuery?.items).toHaveLength(2);
    const myItem = savedQuery?.items.find((i) => i.isMine);
    expect(myItem?.assetId).toBe('684583478');
    expect(myItem?.rank).toBe(2);
  });

  it('POST /api/serp/paste-sync parses raw TSV text and matches portfolio', async () => {
    const rawTsv = [
      'Keyword\tPage\tRank\tAsset ID\tTitle\tThumbnail\tDetail URL\tAuthor',
      'infographic 2\t1\t1\t684583478\t2 step infographic template\thttps://t4.ftcdn.net/684583478.jpg\thttps://stock.adobe.com/684583478\tHaris',
    ].join('\n');

    const req = new NextRequest('http://localhost:3000/api/serp/paste-sync', {
      method: 'POST',
      body: JSON.stringify({ text: rawTsv }),
    });

    const res = await postSerpSync(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.keyword).toBe('infographic 2');
    expect(data.myItemsCount).toBe(1);
    expect(data.myRanks).toEqual([1]);
  });

  it('GET /api/serp returns paginated query list', async () => {
    // Ingest 1 query first
    await postSerpSync(
      new NextRequest('http://localhost:3000/api/serp/paste-sync', {
        method: 'POST',
        body: JSON.stringify({
          keyword: 'business chart',
          items: [{ rank: 1, assetId: '111', title: 'Chart A' }],
        }),
      })
    );

    const getReq = new NextRequest('http://localhost:3000/api/serp?keyword=business');
    const res = await getSerp(getReq);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.queries).toHaveLength(1);
    expect(data.queries[0].keyword).toBe('business chart');
    expect(data.pagination.total).toBe(1);
  });
});
