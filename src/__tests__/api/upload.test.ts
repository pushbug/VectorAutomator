import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/upload/route';
import { NextRequest } from 'next/server';

const { mockCreate, mockFindFirst, mockFindUnique } = vi.hoisted(() => {
  return {
    mockCreate: vi.fn(),
    mockFindFirst: vi.fn(),
    mockFindUnique: vi.fn(),
  };
});

vi.mock('@/generated/prisma/client', () => {
  return {
    PrismaClient: class {
      image = {
        create: mockCreate,
        findFirst: mockFindFirst,
        findUnique: mockFindUnique,
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
    access: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Upload API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET next code', () => {
    it('calculates next code based on highest existing sequence', async () => {
      mockFindFirst.mockResolvedValue({ seqNumber: 122 });

      const request = new NextRequest('http://localhost:3000/api/upload?date=2026-08-14');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.nextCode).toBe('2608-123');
      expect(data.seqNumber).toBe(123);
      expect(data.year).toBe(2026);
      expect(data.month).toBe(8);
    });

    it('defaults next code to 1 when no images exist for year', async () => {
      mockFindFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/upload?date=2026-08-14');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.nextCode).toBe('2608-01');
      expect(data.seqNumber).toBe(1);
    });
  });

  describe('POST upload', () => {
    it('creates image record with custom code and parsed components', async () => {
      mockFindUnique.mockResolvedValue(null);
      const fakeCreated = {
        id: 'img-1',
        code: '2608-123',
        year: 2026,
        month: 8,
        seqNumber: 123,
        title: 'Test Title',
        keywords: 'tag1, tag2',
        filePath: '/path/to/file.jpg',
        ssDownloads: 5,
        asDownloads: 3,
        totalDownloads: 8,
        status: 'uploaded',
        createdAt: new Date('2026-08-14T00:00:00.000Z'),
      };
      mockCreate.mockResolvedValue(fakeCreated);

      const formData = new FormData();
      const fakeFile = new File(['dummy content'], 'sample.jpg', { type: 'image/jpeg' });
      formData.append('file', fakeFile);
      formData.append('code', '2608-123');
      formData.append('title', 'Test Title');
      formData.append('keywords', 'tag1, tag2');
      formData.append('uploadDate', '2026-08-14');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: '2608-123',
            year: 2026,
            month: 8,
            seqNumber: 123,
            title: 'Test Title',
          }),
        })
      );
    });

    it('persists platform asset IDs (ssId, asId, vzId) and initial downloads', async () => {
      mockFindUnique.mockResolvedValue(null);
      const fakeCreated = {
        id: 'img-2',
        code: '2608-456',
        title: 'Platform Asset Test',
        keywords: 'vector, icon',
        filePath: '/path/to/icon.jpg',
        ssId: '24589201',
        asId: '83920194',
        vzId: '19384029',
        ssDownloads: 10,
        asDownloads: 5,
        totalDownloads: 17,
        status: 'uploaded',
        createdAt: new Date('2026-08-14T00:00:00.000Z'),
      };
      mockCreate.mockResolvedValue(fakeCreated);

      const formData = new FormData();
      const fakeFile = new File(['dummy icon'], 'icon.jpg', { type: 'image/jpeg' });
      formData.append('file', fakeFile);
      formData.append('code', '2608-456');
      formData.append('title', 'Platform Asset Test');
      formData.append('keywords', 'vector, icon');
      formData.append('ssId', '24589201');
      formData.append('asId', '83920194');
      formData.append('vzId', '19384029');
      formData.append('ssDownloads', '10');
      formData.append('asDownloads', '5');
      formData.append('vzDownloads', '2');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ssId: '24589201',
            asId: '83920194',
            vzId: '19384029',
            ssDownloads: 10,
            asDownloads: 5,
            totalDownloads: 17,
            stats: {
              create: expect.arrayContaining([
                expect.objectContaining({ platform: 'Shutterstock', downloads: 10 }),
                expect.objectContaining({ platform: 'Adobe Stock', downloads: 5 }),
                expect.objectContaining({ platform: 'Vecteezy', downloads: 2 }),
              ]),
            },
          }),
        })
      );
    });

    it('persists tags and notes during image upload', async () => {
      mockFindUnique.mockResolvedValue(null);
      const fakeCreated = {
        id: 'img-3',
        code: '2608-789',
        title: 'Tagged Asset',
        keywords: 'vector, icon',
        tags: 'infographic, series-a',
        notes: 'Needs color variation next week',
        filePath: '/path/to/icon.jpg',
        ssDownloads: 0,
        asDownloads: 0,
        totalDownloads: 0,
        status: 'uploaded',
        createdAt: new Date('2026-08-14T00:00:00.000Z'),
      };
      mockCreate.mockResolvedValue(fakeCreated);

      const formData = new FormData();
      const fakeFile = new File(['dummy icon'], 'icon.jpg', { type: 'image/jpeg' });
      formData.append('file', fakeFile);
      formData.append('code', '2608-789');
      formData.append('title', 'Tagged Asset');
      formData.append('keywords', 'vector, icon');
      formData.append('tags', 'infographic, series-a');
      formData.append('notes', 'Needs color variation next week');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: 'infographic, series-a',
            notes: 'Needs color variation next week',
          }),
        })
      );
    });

    it('persists category during image upload (UT-API-CAT-01)', async () => {
      mockFindUnique.mockResolvedValue(null);
      const fakeCreated = {
        id: 'img-4',
        code: '2608-101',
        title: 'Business Diagram',
        keywords: 'business, chart',
        category: 'Business',
        filePath: '/path/to/chart.jpg',
        ssDownloads: 0,
        asDownloads: 0,
        totalDownloads: 0,
        status: 'uploaded',
        createdAt: new Date('2026-08-14T00:00:00.000Z'),
      };
      mockCreate.mockResolvedValue(fakeCreated);

      const formData = new FormData();
      const fakeFile = new File(['dummy icon'], 'chart.jpg', { type: 'image/jpeg' });
      formData.append('file', fakeFile);
      formData.append('code', '2608-101');
      formData.append('title', 'Business Diagram');
      formData.append('keywords', 'business, chart');
      formData.append('category', 'Business');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: 'Business',
          }),
        })
      );
    });

    it('rejects duplicate image code with 409 Conflict', async () => {
      mockFindUnique.mockResolvedValue({ id: 'existing-img', code: '2608-123' });

      const formData = new FormData();
      const fakeFile = new File(['dummy content'], 'sample.jpg', { type: 'image/jpeg' });
      formData.append('file', fakeFile);
      formData.append('code', '2608-123');
      formData.append('title', 'Test Title');
      formData.append('keywords', 'tag1, tag2');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });

    it('auto-generates next code for the month when code is omitted', async () => {
      mockFindFirst.mockResolvedValue({ seqNumber: 70 });
      mockCreate.mockResolvedValue({
        id: 'img-auto-1',
        code: '2608-71',
        year: 2026,
        month: 8,
        seqNumber: 71,
        title: 'Auto Code Image',
        keywords: 'auto, code',
        filePath: '/path/to/auto.jpg',
        createdAt: new Date('2026-08-16T00:00:00.000Z'),
      });

      const formData = new FormData();
      const fakeFile = new File(['dummy auto content'], 'auto.jpg', { type: 'image/jpeg' });
      formData.append('file', fakeFile);
      formData.append('title', 'Auto Code Image');
      formData.append('keywords', 'auto, code');
      formData.append('uploadDate', '2026-08-16');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { year: 2026, month: 8 },
        })
      );
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: '2608-71',
            year: 2026,
            month: 8,
            seqNumber: 71,
          }),
        })
      );
    });

    it('creates image record without a file (status pending, empty filePath)', async () => {
      mockFindUnique.mockResolvedValue(null);
      const fakeCreated = {
        id: 'img-no-file',
        code: '1604-01',
        title: 'Company History Brochure',
        keywords: 'timeline, history, company',
        category: 'Business',
        filePath: '',
        status: 'pending',
        createdAt: new Date('2016-04-16T00:00:00.000Z'),
      };
      mockCreate.mockResolvedValue(fakeCreated);

      const formData = new FormData();
      formData.append('code', '1604-01');
      formData.append('title', 'Company History Brochure');
      formData.append('keywords', 'timeline, history, company');
      formData.append('category', 'Business');
      formData.append('uploadDate', '2016-04-16');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: '1604-01',
            title: 'Company History Brochure',
            filePath: '',
            status: 'pending',
          }),
        })
      );
    });

    it('returns 400 when required fields (title or keywords) are missing', async () => {
      const formData = new FormData();
      formData.append('title', 'Incomplete');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('sets filePath matching /uploads/${code}.${ext}', async () => {
      mockFindUnique.mockResolvedValue(null);
      const fakeCreated = {
        id: 'img-code-test',
        code: '2608-88',
        title: 'Filename Test',
        keywords: 'test',
        filePath: '/uploads/2608-88.png',
        ssDownloads: 0,
        asDownloads: 0,
        totalDownloads: 0,
        status: 'uploaded',
        createdAt: new Date('2026-08-24T00:00:00.000Z'),
      };
      mockCreate.mockResolvedValue(fakeCreated);

      const formData = new FormData();
      const fakeFile = new File(['png content'], 'photo.png', { type: 'image/png' });
      formData.append('file', fakeFile);
      formData.append('code', '2608-88');
      formData.append('title', 'Filename Test');
      formData.append('keywords', 'test');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filePath: '/uploads/2608-88.png',
          }),
        })
      );
    });

    it('UT-API-UPLOAD-BATCH-LOCK-01: handles rapid sequential batch uploads safely without lock error', async () => {
      mockFindUnique.mockResolvedValue(null);
      let seq = 1;
      mockFindFirst.mockImplementation(() => Promise.resolve({ seqNumber: seq++ }));
      mockCreate.mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: `img-${data.code}`,
          code: data.code,
          title: data.title,
          keywords: data.keywords,
          filePath: data.filePath,
          status: 'uploaded',
          createdAt: new Date(),
        })
      );

      const items = [
        { code: '2609-10', title: 'Batch Item 1', keywords: 'tag1' },
        { code: '2609-11', title: 'Batch Item 2', keywords: 'tag2' },
        { code: '2609-12', title: 'Batch Item 3', keywords: 'tag3' },
      ];

      for (const item of items) {
        const formData = new FormData();
        formData.append('code', item.code);
        formData.append('title', item.title);
        formData.append('keywords', item.keywords);
        formData.append('uploadDate', '2026-09-03');

        const request = new NextRequest('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData,
        });

        const res = await POST(request);
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.code).toBe(item.code);
      }

      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });
});
