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
      expect(data.nextCode).toBe('2608-1');
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

    it('returns 400 when required fields are missing', async () => {
      const formData = new FormData();
      formData.append('title', 'Incomplete');

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
