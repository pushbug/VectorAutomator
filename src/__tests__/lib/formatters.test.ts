import { describe, it, expect, vi } from 'vitest';
import { formatCurrency, formatNumber, formatTableDate, formatDisplayDate } from '@/lib/formatters';
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
});
