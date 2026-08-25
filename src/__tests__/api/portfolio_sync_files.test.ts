import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/portfolio/sync-files/route';
import { NextRequest } from 'next/server';

const { mockSyncPhysicalUploadFiles } = vi.hoisted(() => ({
  mockSyncPhysicalUploadFiles: vi.fn(),
}));

vi.mock('@/lib/fileStorage', () => ({
  syncPhysicalUploadFiles: mockSyncPhysicalUploadFiles,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

describe('Portfolio Sync Files API (UT-API-PF-SYNC-FILES-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers physical file synchronization and returns report', async () => {
    mockSyncPhysicalUploadFiles.mockResolvedValueOnce({
      syncedCount: 3,
      syncedCodes: ['1604-01', '2002-01', '2005-02'],
    });

    const req = new NextRequest('http://localhost:3000/api/portfolio/sync-files', {
      method: 'POST',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({
      success: true,
      syncedCount: 3,
      syncedCodes: ['1604-01', '2002-01', '2005-02'],
    });
  });

  it('handles errors gracefully and returns 500 status', async () => {
    mockSyncPhysicalUploadFiles.mockRejectedValueOnce(new Error('Disk read failure'));

    const req = new NextRequest('http://localhost:3000/api/portfolio/sync-files', {
      method: 'POST',
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json).toEqual({
      success: false,
      error: 'Disk read failure',
    });
  });
});
