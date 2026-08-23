import { describe, it, expect } from 'vitest';
import {
  normalizeDateToUTC,
  parseCleanNumber,
  calculatePayoutDerivedFields,
  calculateBundledSplit,
  normalizeStockName,
  parseGoogleSheetPayoutsTSV,
  getStockBadgeColor,
  STOCK_AGENCIES,
  PAYMENT_PLATFORMS,
  THAI_BANKS,
} from '@/lib/payoutCalculations';

describe('Payout Calculations & TSV Parser (UT-LIB-PAYOUT-01)', () => {
  it('normalizes DD/MM/YY and DD/MM/YYYY dates to UTC midnight', () => {
    expect(normalizeDateToUTC('01/09/23')).toBe('2023-09-01T00:00:00.000Z');
    expect(normalizeDateToUTC('03/09/2023')).toBe('2023-09-03T00:00:00.000Z');
    expect(normalizeDateToUTC('01/05/26')).toBe('2026-05-01T00:00:00.000Z');
    expect(normalizeDateToUTC('-')).toBeNull();
    expect(normalizeDateToUTC('')).toBeNull();
  });

  it('cleans numeric strings with currency signs and commas', () => {
    expect(parseCleanNumber('$2,667.41')).toBe(2667.41);
    expect(parseCleanNumber('114,595.77 ฿')).toBe(114595.77);
    expect(parseCleanNumber('34.72')).toBe(34.72);
    expect(parseCleanNumber('-')).toBeNull();
  });

  it('calculates derived fee, rate, and status correctly for completed payout', () => {
    const derived = calculatePayoutDerivedFields({
      stockWithdrawDate: '2023-09-03T00:00:00.000Z',
      stockAmountUsd: 2667.41,
      platformDate: '2023-09-09T00:00:00.000Z',
      platformAmountUsd: 2664.41,
      bankReceivedDate: '2023-09-10T00:00:00.000Z',
      exchangeRate: 34.72,
    });

    expect(derived.feeUsd).toBe(3.00);
    expect(derived.netIncomeThb).toBe(92508.32);
    expect(derived.status).toBe('completed');
    expect(derived.taxYear).toBe(2023);
    expect(derived.leadTimeDays).toBe(7);
  });

  it('calculates derived fields for in-platform holding payout without bank transfer', () => {
    const derived = calculatePayoutDerivedFields({
      stockWithdrawDate: '2024-01-15T00:00:00.000Z',
      stockAmountUsd: 45.68,
      platformDate: '2024-01-15T00:00:00.000Z',
      platformAmountUsd: 41.68,
    });

    expect(derived.feeUsd).toBe(4.00);
    expect(derived.netIncomeThb).toBeNull();
    expect(derived.status).toBe('in_platform');
    expect(derived.taxYear).toBe(2024);
  });

  it('computes proportional bundled splits without rounding drift', () => {
    const records = [
      { id: 'rec-1', stockAmountUsd: 2664.41, platformAmountUsd: 2664.41 },
      { id: 'rec-2', stockAmountUsd: 41.68, platformAmountUsd: 41.68 },
    ];

    const split = calculateBundledSplit(records, { totalNetIncomeThb: 93955.44 });
    expect(split).toHaveLength(2);
    const sumThb = split.reduce((sum, r) => sum + r.netIncomeThb, 0);
    expect(sumThb).toBe(93955.44);
    expect(split[0].netIncomeThb).toBe(92508.31);
    expect(split[1].netIncomeThb).toBe(1447.13);
  });

  it('normalizes stock platform names', () => {
    expect(normalizeStockName('AdobeStock')).toBe('Adobe Stock');
    expect(normalizeStockName('ShutterStock')).toBe('Shutterstock');
    expect(normalizeStockName('Vecteezy')).toBe('Vecteezy');
    expect(normalizeStockName('123RF')).toBe('123RF');
  });

  it('parses Google Sheet TSV clipboard text with multiple rows and notes', () => {
    const sampleTsv = `Stock Withdraw\tStock Name\tMoney\tPlatform Date\tPlatform\tMoney\tRate\tNet Income\tNotes
01/09/23\tShutterStock\t548.04\t07/09/23\tPayOneer\t539.26\t-\t-\t
03/09/23\tAdobeStock\t2,667.41\t09/09/23\tPayOneer\t2,664.41\t34.72\t114,595.77\tRate 35.45 (116,992.80) 1 วัน
13/09/23\tVecteezy\t38.77\t13/09/23\tPayOneer\t35.77\t-\t-\t
Summary\t65,319.76\tSummary\t65,054.89\t33.22`;

    const parsed = parseGoogleSheetPayoutsTSV(sampleTsv);
    expect(parsed).toHaveLength(3);

    expect(parsed[0].stockName).toBe('Shutterstock');
    expect(parsed[0].stockAmountUsd).toBe(548.04);
    expect(parsed[0].platformAmountUsd).toBe(539.26);
    expect(parsed[0].feeUsd).toBe(8.78);
    expect(parsed[0].status).toBe('in_platform');

    expect(parsed[1].stockName).toBe('Adobe Stock');
    expect(parsed[1].stockAmountUsd).toBe(2667.41);
    expect(parsed[1].platformAmountUsd).toBe(2664.41);
    expect(parsed[1].feeUsd).toBe(3.00);
    expect(parsed[1].exchangeRate).toBe(34.72);
    expect(parsed[1].netIncomeThb).toBe(114595.77);
    expect(parsed[1].status).toBe('completed');
    expect(parsed[1].notes).toBe('Rate 35.45 (116,992.80) 1 วัน');

    expect(parsed[2].stockName).toBe('Vecteezy');
    expect(parsed[2].stockAmountUsd).toBe(38.77);
    expect(parsed[2].platformAmountUsd).toBe(35.77);
    expect(parsed[2].feeUsd).toBe(3.00);
  });

  it('returns appropriate badge color classes for each supported stock agency', () => {
    expect(getStockBadgeColor('Adobe Stock')).toContain('text-red-500');
    expect(getStockBadgeColor('Shutterstock')).toContain('text-rose-500');
    expect(getStockBadgeColor('Vecteezy')).toContain('text-orange-500');
    expect(getStockBadgeColor('123RF')).toContain('text-blue-500');
    expect(getStockBadgeColor('Unknown Agency')).toContain('text-purple-500');
  });

  it('exports valid constants for stock agencies, payment platforms, and Thai banks', () => {
    expect(STOCK_AGENCIES).toEqual(['Adobe Stock', 'Shutterstock', 'Vecteezy', '123RF']);
    expect(PAYMENT_PLATFORMS).toContain('Payoneer');
    expect(THAI_BANKS[0]).toBe('Bangkok Bank (BBL)');
  });
});
