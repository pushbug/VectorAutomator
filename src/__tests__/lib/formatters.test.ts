import { describe, it, expect, vi } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatTableDate,
  formatDisplayDate,
  formatDateSafe,
  calculatePlatformBreakdown,

  getTodayDateString,
  getImageUrl,
} from '@/lib/formatters';

import { parseImageCode, getNextImageCode } from '@/lib/imageCode';
import { SUPPORTED_PLATFORMS, PLATFORM_THEMES } from '@/lib/platforms';

describe('Formatters and Shared Utilities', () => {
  it('formatCurrency correctly formats numbers with and without symbols', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(null)).toBe('$0.00');
    expect(formatCurrency(undefined)).toBe('$0.00');
    expect(formatCurrency(1234.5, false)).toBe('1,234.50');
  });

  it('formatNumber correctly formats integers and defaults nullish', () => {
    expect(formatNumber(1500)).toBe('1,500');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
  });

  it('formatTableDate formats YYYY-MM-DD to DD-MM-YYYY', () => {
    expect(formatTableDate('2026-08-20')).toBe('20-08-2026');
    expect(formatTableDate(null)).toBe('-');
    expect(formatTableDate('')).toBe('-');
  });

  it('formatDisplayDate formats YYYY-MM-DD to human readable string', () => {
    expect(formatDisplayDate('2026-08-20')).toContain('Aug 20, 2026');
    expect(formatDisplayDate(null)).toBe('Select date');
  });

  it('formatDateSafe formats Date and ISO strings and returns None on empty', () => {
    expect(formatDateSafe('2026-08-20T00:00:00.000Z')).toContain('Aug 20, 2026');
    expect(formatDateSafe(new Date('2026-08-20T00:00:00.000Z'))).toContain('Aug 20, 2026');
    expect(formatDateSafe(null)).toBe('None');
    expect(formatDateSafe(undefined)).toBe('None');
    expect(formatDateSafe('')).toBe('None');
  });


  it('parseImageCode parses YYMM-Seq patterns correctly', () => {
    expect(parseImageCode('2608-12')).toEqual({ year: 2026, month: 8, seqNumber: 12 });
    expect(parseImageCode('2512-005')).toEqual({ year: 2025, month: 12, seqNumber: 5 });
    expect(parseImageCode('invalid-code')).toBeNull();
    expect(parseImageCode(null)).toBeNull();
  });

  it('UT-CODE-SEQ-01: getNextImageCode computes next monthly sequence', async () => {
    const mockFindFirst = vi.fn().mockResolvedValue({ seqNumber: 42 });
    const mockPrisma = {
      image: { findFirst: mockFindFirst },
    };

    const res = await getNextImageCode(mockPrisma, new Date('2026-08-15T00:00:00Z'));
    expect(res).toEqual({
      nextCode: '2608-43',
      year: 2026,
      month: 8,
      seqNumber: 43,
    });
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { year: 2026, month: 8 },
      orderBy: { seqNumber: 'desc' },
      select: { seqNumber: true },
    });
  });

  it('platforms constants define expected microstock platforms and themes', () => {
    expect(SUPPORTED_PLATFORMS).toEqual(['Shutterstock', 'Adobe Stock', 'Vecteezy']);
    expect(PLATFORM_THEMES['Shutterstock'].dot).toBe('bg-red-500');
    expect(PLATFORM_THEMES['Adobe Stock'].dot).toBe('bg-blue-500');
  });

  it('UT-LIB-STATS-BREAKDOWN-01: calculatePlatformBreakdown aggregates totals and breakdowns correctly', () => {
    const empty = calculatePlatformBreakdown(null);
    expect(empty).toEqual({
      totalEarnings: 0,
      totalDownloads: 0,
      platformBreakdown: {},
    });

    const stats = [
      { platform: 'Shutterstock', downloads: 5, earnings: 4.5 },
      { platform: 'Adobe Stock', downloads: 10, earnings: 12.0 },
      { platform: 'Shutterstock', downloads: 2, earnings: 1.5 },
      { platform: 'Vecteezy', downloads: 3, earnings: 2.0 },
    ];

    const result = calculatePlatformBreakdown(stats);
    expect(result.totalDownloads).toBe(20);
    expect(result.totalEarnings).toBe(20.0);
    expect(result.platformBreakdown).toEqual({
      Shutterstock: { downloads: 7, earnings: 6.0 },
      'Adobe Stock': { downloads: 10, earnings: 12.0 },
      Vecteezy: { downloads: 3, earnings: 2.0 },
    });
  });

  it('UT-LIB-FORMATTERS-02: getTodayDateString returns valid YYYY-MM-DD format', () => {
    const today = getTodayDateString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const d = new Date();
    const expectedYear = String(d.getFullYear());
    expect(today.startsWith(expectedYear)).toBe(true);
  });

  it('UT-LIB-FORMATTERS-02: getImageUrl formats URLs with encoding and cache-busting', () => {
    expect(getImageUrl('')).toBe('');
    expect(getImageUrl(null)).toBe('');
    expect(getImageUrl(undefined)).toBe('');

    // Basic path
    expect(getImageUrl('/uploads/2608-12.jpg')).toBe('/api/image?path=%2Fuploads%2F2608-12.jpg');

    // Path with timestamp number
    expect(getImageUrl('/uploads/2608-12.jpg', 1724580000000)).toBe(
      '/api/image?path=%2Fuploads%2F2608-12.jpg&v=1724580000000'
    );

    // Path with ISO string date
    const isoDate = '2026-08-25T10:00:00.000Z';
    const expectedTimestamp = new Date(isoDate).getTime();
    expect(getImageUrl('/uploads/2608-12.jpg', isoDate)).toBe(
      `/api/image?path=%2Fuploads%2F2608-12.jpg&v=${expectedTimestamp}`
    );

    // Path with Date object
    const dateObj = new Date('2026-08-25T12:00:00.000Z');
    expect(getImageUrl('/uploads/2608-12.jpg', dateObj)).toBe(
      `/api/image?path=%2Fuploads%2F2608-12.jpg&v=${dateObj.getTime()}`
    );
  });
});

