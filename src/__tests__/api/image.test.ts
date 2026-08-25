import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/image/route';
import fs from 'fs';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      promises: {
        ...actual.promises,
        stat: vi.fn(),
        readFile: vi.fn(),
      },
    },
  };
});

describe('Image API Route (/api/image) - UT-API-IMG-CACHE-01', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when path parameter is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/image');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe('Missing path parameter');
  });

  it('returns 400 when path contains traversal or null byte', async () => {
    const req = new NextRequest('http://localhost:3000/api/image?path=../../etc/passwd');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe('Invalid path');
  });

  it('returns 404 when file does not exist or is not a file', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.stat).mockResolvedValue({
      isFile: () => false,
      size: 0,
      mtimeMs: 1000,
    } as any);

    const req = new NextRequest('http://localhost:3000/api/image?path=uploads/not-a-file.jpg');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns 200 with ETag, Content-Type and no-cache header on first request', async () => {
    const mockStat = {
      isFile: () => true,
      size: 1024,
      mtimeMs: 1724580000000,
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.stat).mockResolvedValue(mockStat as any);
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('fake-image-bytes') as any);

    const req = new NextRequest('http://localhost:3000/api/image?path=uploads/1708-01.png');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Cache-Control')).toBe('no-cache, must-revalidate');
    const expectedETag = 'W/"1024-1724580000000"';
    expect(res.headers.get('ETag')).toBe(expectedETag);
  });

  it('returns 304 Not Modified when if-none-match header matches ETag', async () => {
    const mockStat = {
      isFile: () => true,
      size: 1024,
      mtimeMs: 1724580000000,
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.stat).mockResolvedValue(mockStat as any);

    const matchingETag = 'W/"1024-1724580000000"';
    const req = new NextRequest('http://localhost:3000/api/image?path=uploads/1708-01.png', {
      headers: {
        'if-none-match': matchingETag,
      },
    });

    const res = await GET(req);

    expect(res.status).toBe(304);
    expect(res.headers.get('ETag')).toBe(matchingETag);
    expect(res.headers.get('Cache-Control')).toBe('no-cache, must-revalidate');
    expect(fs.promises.readFile).not.toHaveBeenCalled();
  });

  it('returns 200 when file is modified (mtime changes) even if previous ETag was sent', async () => {
    const modifiedStat = {
      isFile: () => true,
      size: 2048,
      mtimeMs: 1724589999999,
    };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.promises.stat).mockResolvedValue(modifiedStat as any);
    vi.mocked(fs.promises.readFile).mockResolvedValue(Buffer.from('updated-image-bytes') as any);

    const oldETag = 'W/"1024-1724580000000"';
    const req = new NextRequest('http://localhost:3000/api/image?path=uploads/1708-01.png', {
      headers: {
        'if-none-match': oldETag,
      },
    });

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('ETag')).toBe('W/"2048-1724589999999"');
    expect(fs.promises.readFile).toHaveBeenCalled();
  });
});
