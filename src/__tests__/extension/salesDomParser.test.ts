import { describe, it, expect } from 'vitest';
import { formatSalesClipboardTsv } from '@/lib/salesTsvFormatter';

describe('UT-EXT-SALES-TSV-01: Adobe Sales TSV Clipboard Formatter', () => {
  it('formats sales items into valid TSV with Date header and tabbed columns', () => {
    const mockData = {
      dateStr: '2026-05-28',
      items: [
        {
          assetId: '1929092005',
          assetType: 'Vectors',
          uploadDate: '2/27/2026',
          royalty: '$216.40',
        },
        {
          assetId: '1056563551',
          assetType: 'Vectors',
          uploadDate: '10/31/2024',
          royalty: '$90.68',
        },
      ],
    };

    const tsv = formatSalesClipboardTsv(mockData);
    const lines = tsv.split('\n');

    expect(lines[0]).toBe('Date: 2026-05-28');
    expect(lines[1]).toBe('Thumb\tId\tType\tUpload date\tEarnings');
    expect(lines[2]).toBe('\t1929092005\tVectors\t2/27/2026\t$216.40');
    expect(lines[3]).toBe('\t1056563551\tVectors\t10/31/2024\t$90.68');
  });

  it('handles empty items array gracefully without emitting row lines', () => {
    const mockEmpty = {
      dateStr: '2026-08-28',
      items: [],
    };

    const tsv = formatSalesClipboardTsv(mockEmpty);
    const lines = tsv.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Date: 2026-08-28');
    expect(lines[1]).toBe('Thumb\tId\tType\tUpload date\tEarnings');
  });

  it('uses default fallback values when optional fields are missing', () => {
    const mockPartial = {
      dateStr: '2026-01-15',
      items: [
        {
          assetId: '55667788',
        },
      ],
    };

    const tsv = formatSalesClipboardTsv(mockPartial);
    const lines = tsv.split('\n');

    expect(lines[2]).toBe('\t55667788\tVectors\t\t$0.00');
  });
});

describe('UT-EXT-SALES-AUTOCOPY-01: Auto-Copy Extraction Logic Parity', () => {
  it('verifies formatted payload is immediately parseable by parseStockPaste and extractStatementDate', async () => {
    const { parseStockPaste, extractStatementDate } = await import('@/lib/stockPasteParser');

    const sampleTsv = [
      'Date: 2026-05-28',
      'Thumb\tId\tType\tUpload date\tEarnings',
      '\t1929092005\tVectors\t2/27/2026\t$216.40',
      '\t1056563551\tVectors\t10/31/2024\t$90.68',
      '\t636376104\tVectors\t8/18/2023\t$83.40',
    ].join('\n');

    const detectedDate = extractStatementDate(sampleTsv);
    const rows = parseStockPaste(sampleTsv);

    expect(detectedDate).toBe('2026-05-28');
    expect(rows).toHaveLength(3);
    expect(rows[0].assetId).toBe('1929092005');
    expect(rows[0].earnings).toBe(216.4);
    expect(rows[1].assetId).toBe('1056563551');
    expect(rows[1].earnings).toBe(90.68);
    expect(rows[2].assetId).toBe('636376104');
    expect(rows[2].earnings).toBe(83.4);

    const totalEarnings = rows.reduce((sum, r) => sum + r.earnings, 0);
    expect(totalEarnings).toBeCloseTo(390.48, 2);
  });
});
