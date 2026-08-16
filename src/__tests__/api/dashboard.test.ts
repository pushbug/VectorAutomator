import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/dashboard/route';

const {
  mockImageCount,
  mockImageAggregate,
  mockImageFindFirst,
  mockImageFindMany,
  mockPlatformStatsAggregate,
} = vi.hoisted(() => {
  return {
    mockImageCount: vi.fn(),
    mockImageAggregate: vi.fn(),
    mockImageFindFirst: vi.fn(),
    mockImageFindMany: vi.fn(),
    mockPlatformStatsAggregate: vi.fn(),
  };
});

vi.mock('@/generated/prisma/client', () => {
  return {
    PrismaClient: class {
      image = {
        count: mockImageCount,
        aggregate: mockImageAggregate,
        findFirst: mockImageFindFirst,
        findMany: mockImageFindMany,
      };
      platformStats = {
        aggregate: mockPlatformStatsAggregate,
      };
    },
  };
});

describe('Dashboard API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return aggregated dashboard statistics and calculations (UT-API-DASH-01)', async () => {
    // mock counts: 120 total, 25 monthly, 4 pending
    mockImageCount
      .mockResolvedValueOnce(120) // total
      .mockResolvedValueOnce(25)  // monthly
      .mockResolvedValueOnce(4);   // pending

    mockImageAggregate.mockResolvedValueOnce({
      _sum: { totalDownloads: 350 },
    });

    mockPlatformStatsAggregate.mockResolvedValueOnce({
      _sum: { earnings: 145.50, downloads: 350 },
    });

    mockImageFindFirst.mockResolvedValueOnce({
      code: '2608-25',
    });

    const mockRecent = [
      {
        id: 'img1',
        code: '2608-25',
        title: 'Business Infographic',
        filePath: '/uploads/2608-25.jpg',
        status: 'uploaded',
        totalDownloads: 10,
        ssDownloads: 5,
        asDownloads: 5,
        keywords: 'infographic, business',
        createdAt: new Date().toISOString(),
      },
    ];

    const mockTop = [
      {
        id: 'img2',
        code: '2608-01',
        title: 'Timeline Diagram',
        filePath: '/uploads/2608-01.jpg',
        status: 'uploaded',
        totalDownloads: 150,
        ssDownloads: 100,
        asDownloads: 50,
        keywords: 'timeline, diagram',
        createdAt: new Date().toISOString(),
      },
    ];

    mockImageFindMany
      .mockResolvedValueOnce(mockRecent) // recent
      .mockResolvedValueOnce(mockTop);    // top performers

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.totalVectors).toBe(120);
    expect(data.summary.monthlyVectors).toBe(25);
    expect(data.summary.pendingCount).toBe(4);
    expect(data.summary.totalDownloads).toBe(350);
    expect(data.summary.currentMonthEarnings).toBe(145.5);
    expect(data.summary.latestCode).toBe('2608-25');

    expect(data.monthlyGoal.target).toBe(50);
    expect(data.monthlyGoal.current).toBe(25);
    expect(data.monthlyGoal.percentage).toBe(50);

    expect(data.recentUploads).toHaveLength(1);
    expect(data.topPerformers).toHaveLength(1);
    expect(data.topPerformers[0].code).toBe('2608-01');
  });

  it('should handle zero data cleanly without NaN or crashes', async () => {
    mockImageCount.mockResolvedValue(0);
    mockImageAggregate.mockResolvedValue({ _sum: { totalDownloads: null } });
    mockPlatformStatsAggregate.mockResolvedValue({ _sum: { earnings: null, downloads: null } });
    mockImageFindFirst.mockResolvedValue(null);
    mockImageFindMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary.totalVectors).toBe(0);
    expect(data.summary.monthlyVectors).toBe(0);
    expect(data.summary.totalDownloads).toBe(0);
    expect(data.summary.currentMonthEarnings).toBe(0);
    expect(data.summary.latestCode).toBe('No uploads yet');
    expect(data.monthlyGoal.percentage).toBe(0);
    expect(data.recentUploads).toEqual([]);
    expect(data.topPerformers).toEqual([]);
  });

  it('should return 500 when database throws an unexpected error', async () => {
    mockImageCount.mockRejectedValue(new Error('DB Connection Lost'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to fetch dashboard metrics');
  });
});
