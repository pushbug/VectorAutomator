import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as listCollections, POST as createCollection } from '@/app/api/collections/route';
import { GET as getCollectionDetail, PATCH as updateCollection, DELETE as deleteCollection } from '@/app/api/collections/[id]/route';
import { POST as addCollectionItems, DELETE as removeCollectionItem } from '@/app/api/collections/[id]/items/route';
import { NextRequest } from 'next/server';

const {
  mockCollectionFindMany,
  mockCollectionFindUnique,
  mockCollectionCreate,
  mockCollectionUpdate,
  mockCollectionDelete,
  mockCollectionItemCreateMany,
  mockCollectionItemFindMany,
  mockCollectionItemDeleteMany,
  mockImageFindMany,
} = vi.hoisted(() => ({
  mockCollectionFindMany: vi.fn(),
  mockCollectionFindUnique: vi.fn(),
  mockCollectionCreate: vi.fn(),
  mockCollectionUpdate: vi.fn(),
  mockCollectionDelete: vi.fn(),
  mockCollectionItemCreateMany: vi.fn(),
  mockCollectionItemFindMany: vi.fn(),
  mockCollectionItemDeleteMany: vi.fn(),
  mockImageFindMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    collection: {
      findMany: mockCollectionFindMany,
      findUnique: mockCollectionFindUnique,
      create: mockCollectionCreate,
      update: mockCollectionUpdate,
      delete: mockCollectionDelete,
    },
    collectionItem: {
      createMany: mockCollectionItemCreateMany,
      findMany: mockCollectionItemFindMany,
      deleteMany: mockCollectionItemDeleteMany,
    },
    image: {
      findMany: mockImageFindMany,
    },
  },
}));

describe('Collections API Routes (UT-API-COLLECTION-01, UT-API-COLLECTION-DETAIL-02, UT-API-COLLECTION-ITEMS-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/collections', () => {
    it('returns enriched collections list with rollups and preview images', async () => {
      const mockCollections = [
        {
          id: 'col-1',
          name: 'Infographic 2026',
          description: 'Top infographic templates',
          coverId: null,
          createdAt: new Date('2026-08-01'),
          updatedAt: new Date('2026-08-02'),
          items: [
            {
              image: {
                id: 'img-1',
                title: 'Business Timeline',
                code: '2608-01',
                filePath: '/path/1.jpg',
                totalDownloads: 15,
                stats: [{ earnings: 25.5 }],
              },
            },
            {
              image: {
                id: 'img-2',
                title: 'Step Diagram',
                code: '2608-02',
                filePath: '/path/2.jpg',
                totalDownloads: 5,
                stats: [{ earnings: 10.0 }],
              },
            },
          ],
        },
      ];

      mockCollectionFindMany.mockResolvedValue(mockCollections);

      const req = new NextRequest('http://localhost:3000/api/collections');
      const res = await listCollections(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].name).toBe('Infographic 2026');
      expect(json.data[0].totalImages).toBe(2);
      expect(json.data[0].totalDownloads).toBe(20);
      expect(json.data[0].totalEarnings).toBe(35.5);
      expect(json.data[0].avgRpi).toBe(17.75);
      expect(json.data[0].coverImage.id).toBe('img-1');
    });
  });

  describe('POST /api/collections', () => {
    it('creates collection and associates images', async () => {
      mockCollectionCreate.mockResolvedValue({ id: 'col-123', name: 'New Theme' });
      mockCollectionItemCreateMany.mockResolvedValue({ count: 2 });
      mockCollectionFindUnique.mockResolvedValue({
        id: 'col-123',
        name: 'New Theme',
        items: [{ image: { id: 'img-1' } }, { image: { id: 'img-2' } }],
      });

      const req = new NextRequest('http://localhost:3000/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Theme',
          description: 'A test group',
          imageIds: ['img-1', 'img-2'],
        }),
      });

      const res = await createCollection(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(mockCollectionCreate).toHaveBeenCalledWith({
        data: {
          name: 'New Theme',
          description: 'A test group',
          coverId: null,
        },
      });
      expect(mockCollectionItemCreateMany).toHaveBeenCalledWith({
        data: [
          { collectionId: 'col-123', imageId: 'img-1' },
          { collectionId: 'col-123', imageId: 'img-2' },
        ],
      });
    });

    it('rejects creation if name is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });

      const res = await createCollection(req);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/collections/[id]', () => {
    it('returns detail with Top 15 shared keywords', async () => {
      mockCollectionFindUnique.mockResolvedValue({
        id: 'col-1',
        name: 'Thai Patterns',
        description: 'Gold vector patterns',
        coverId: null,
        createdAt: new Date('2026-08-01'),
        updatedAt: new Date('2026-08-02'),
        items: [
          {
            addedAt: new Date('2026-08-01'),
            image: {
              id: 'img-1',
              code: '2608-01',
              title: 'Thai Gold Pattern 1',
              keywords: 'thai, pattern, gold, vector, background',
              filePath: '/path/1.jpg',
              totalDownloads: 10,
              stats: [{ earnings: 15.0 }],
            },
          },
          {
            addedAt: new Date('2026-08-02'),
            image: {
              id: 'img-2',
              code: '2608-02',
              title: 'Thai Gold Pattern 2',
              keywords: 'thai, pattern, gold, luxury, traditional',
              filePath: '/path/2.jpg',
              totalDownloads: 20,
              stats: [{ earnings: 30.0 }],
            },
          },
        ],
      });

      const req = new NextRequest('http://localhost:3000/api/collections/col-1');
      const res = await getCollectionDetail(req, { params: Promise.resolve({ id: 'col-1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.name).toBe('Thai Patterns');
      expect(json.summary.totalImages).toBe(2);
      expect(json.summary.totalDownloads).toBe(30);
      expect(json.summary.totalEarnings).toBe(45.0);
      expect(json.summary.avgRpi).toBe(22.5);
      expect(json.images[0].stats).toBeDefined();
      expect(json.images[0].stats).toHaveLength(1);
      expect(json.images[0].stats[0].earnings).toBe(15.0);


      // Top shared keywords check
      expect(json.topKeywords.length).toBeGreaterThan(0);
      const topWords = json.topKeywords.map((k: any) => k.keyword);
      expect(topWords).toContain('thai');
      expect(topWords).toContain('pattern');
      expect(topWords).toContain('gold');

      const thaiStat = json.topKeywords.find((k: any) => k.keyword === 'thai');
      expect(thaiStat.frequency).toBe(2);
      expect(thaiStat.percentage).toBe(100);
      expect(thaiStat.totalDownloads).toBe(30);
      expect(thaiStat.totalEarnings).toBe(45.0);
    });

    it('returns 404 for non-existent collection', async () => {
      mockCollectionFindUnique.mockResolvedValue(null);
      const req = new NextRequest('http://localhost:3000/api/collections/col-999');
      const res = await getCollectionDetail(req, { params: Promise.resolve({ id: 'col-999' }) });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/collections/[id]', () => {
    it('updates collection name and description', async () => {
      mockCollectionUpdate.mockResolvedValue({
        id: 'col-1',
        name: 'Updated Name',
        description: 'Updated Desc',
      });

      const req = new NextRequest('http://localhost:3000/api/collections/col-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name', description: 'Updated Desc' }),
      });

      const res = await updateCollection(req, { params: Promise.resolve({ id: 'col-1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.name).toBe('Updated Name');
      expect(mockCollectionUpdate).toHaveBeenCalledWith({
        where: { id: 'col-1' },
        data: { name: 'Updated Name', description: 'Updated Desc' },
      });
    });
  });

  describe('DELETE /api/collections/[id]', () => {
    it('deletes collection without deleting images', async () => {
      mockCollectionFindUnique.mockResolvedValue({ id: 'col-1', name: 'To Delete' });
      mockCollectionDelete.mockResolvedValue({ id: 'col-1' });

      const req = new NextRequest('http://localhost:3000/api/collections/col-1', {
        method: 'DELETE',
      });

      const res = await deleteCollection(req, { params: Promise.resolve({ id: 'col-1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockCollectionDelete).toHaveBeenCalledWith({
        where: { id: 'col-1' },
      });
    });
  });

  describe('POST & DELETE /api/collections/[id]/items', () => {
    it('adds new images to collection ignoring duplicates', async () => {
      mockCollectionFindUnique.mockResolvedValue({ id: 'col-1' });
      mockImageFindMany.mockResolvedValue([{ id: 'img-1' }, { id: 'img-2' }]);
      mockCollectionItemFindMany.mockResolvedValue([{ imageId: 'img-1' }]);
      mockCollectionItemCreateMany.mockResolvedValue({ count: 1 });

      const req = new NextRequest('http://localhost:3000/api/collections/col-1/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: ['img-1', 'img-2'] }),
      });

      const res = await addCollectionItems(req, { params: Promise.resolve({ id: 'col-1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.addedCount).toBe(1);
      expect(mockCollectionItemCreateMany).toHaveBeenCalledWith({
        data: [{ collectionId: 'col-1', imageId: 'img-2' }],
      });
    });

    it('UT-API-COLLECTION-IMPORT-ASID-01: resolves universal tokens (asIds, codes) and adds matched images', async () => {
      mockCollectionFindUnique.mockResolvedValue({ id: 'col-1' });
      mockImageFindMany.mockResolvedValue([
        { id: 'img-1', asId: '972184113', code: '2308-81' },
        { id: 'img-2', asId: '972184114', code: '2302-09' },
      ]);
      mockCollectionItemFindMany.mockResolvedValue([]);
      mockCollectionItemCreateMany.mockResolvedValue({ count: 2 });

      const req = new NextRequest('http://localhost:3000/api/collections/col-1/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: ['972184113', '2302-09', 'unknown-id'] }),
      });

      const res = await addCollectionItems(req, { params: Promise.resolve({ id: 'col-1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.matchedCount).toBe(2);
      expect(json.addedCount).toBe(2);
      expect(json.notFoundCount).toBe(1);
      expect(mockCollectionItemCreateMany).toHaveBeenCalledWith({
        data: [
          { collectionId: 'col-1', imageId: 'img-1' },
          { collectionId: 'col-1', imageId: 'img-2' },
        ],
      });
    });

    it('removes item from collection', async () => {
      mockCollectionItemDeleteMany.mockResolvedValue({ count: 1 });

      const req = new NextRequest('http://localhost:3000/api/collections/col-1/items?imageId=img-2', {
        method: 'DELETE',
      });

      const res = await removeCollectionItem(req, { params: Promise.resolve({ id: 'col-1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockCollectionItemDeleteMany).toHaveBeenCalledWith({
        where: { collectionId: 'col-1', imageId: 'img-2' },
      });
    });
  });
});
