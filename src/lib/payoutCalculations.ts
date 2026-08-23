/**
 * Helper functions and tokenizers for Payouts & Withdrawals tracking
 */

export const STOCK_AGENCIES = ['Adobe Stock', 'Shutterstock', 'Vecteezy', '123RF'] as const;
export type StockAgency = (typeof STOCK_AGENCIES)[number];

export const PAYMENT_PLATFORMS = ['Payoneer', 'PayPal', 'Skrill', 'Bank Wire'] as const;

export const THAI_BANKS = [
  'Bangkok Bank (BBL)',
  'Kasikornbank (KBANK)',
  'SCB',
  'Krungthai (KTB)',
  'TTB',
  'Krungsri (BAY)',
] as const;

export function getStockBadgeColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('adobe')) return 'bg-red-500/10 text-red-500 border-red-500/20';
  if (lower.includes('shutter')) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
  if (lower.includes('vecteezy')) return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
  if (lower.includes('123rf')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
}

export interface ParsedPayoutRow {
  stockWithdrawDate: string; // ISO string
  stockName: string;
  stockAmountUsd: number;
  platformDate: string | null;
  platformName: string;
  platformAmountUsd: number | null;
  feeUsd: number | null;
  bankReceivedDate: string | null;
  exchangeRate: number | null;
  netIncomeThb: number | null;
  status: 'pending' | 'in_platform' | 'completed';
  taxYear: number;
  leadTimeDays: number | null;
  notes: string | null;
}

/**
 * Normalizes various date string formats (DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD) to UTC midnight ISO string
 */
export function normalizeDateToUTC(dateInput: string | Date | null | undefined): string | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate())).toISOString();
  }

  const trimmed = dateInput.trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'null') return null;

  // Handle DD/MM/YY or DD/MM/YYYY (with / or .)
  const slashMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    const d = new Date(Date.UTC(year, month, day));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Handle ISO or YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())).toISOString();
}

/**
 * Sanitizes numeric string removing currencies, commas, and whitespace
 */
export function parseCleanNumber(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = val.replace(/[\$,฿\s,]/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned.toLowerCase() === 'nan') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Derives financial metrics (Fee, Status, TaxYear, LeadTime, Net THB)
 */
export function calculatePayoutDerivedFields(params: {
  stockWithdrawDate: string | Date;
  stockAmountUsd: number;
  platformDate?: string | Date | null;
  platformAmountUsd?: number | null;
  bankReceivedDate?: string | Date | null;
  exchangeRate?: number | null;
  netIncomeThb?: number | null;
}): {
  stockWithdrawDate: string;
  platformDate: string | null;
  bankReceivedDate: string | null;
  feeUsd: number | null;
  exchangeRate: number | null;
  netIncomeThb: number | null;
  status: 'pending' | 'in_platform' | 'completed';
  taxYear: number;
  leadTimeDays: number | null;
} {
  const stockWithdrawDateUtc = normalizeDateToUTC(params.stockWithdrawDate) || new Date().toISOString();
  const platformDateUtc = normalizeDateToUTC(params.platformDate);
  const bankReceivedDateUtc = normalizeDateToUTC(params.bankReceivedDate);

  const stockUsd = Math.max(0, params.stockAmountUsd || 0);
  const platformUsd = params.platformAmountUsd != null ? Math.max(0, params.platformAmountUsd) : null;
  
  // Calculate Fee
  let feeUsd: number | null = null;
  if (platformUsd != null) {
    feeUsd = Math.max(0, Number((stockUsd - platformUsd).toFixed(2)));
  }

  // Calculate Rate & THB
  let exchangeRate = params.exchangeRate != null && params.exchangeRate > 0 ? params.exchangeRate : null;
  let netIncomeThb = params.netIncomeThb != null && params.netIncomeThb > 0 ? params.netIncomeThb : null;

  const effectiveUsdBase = platformUsd ?? stockUsd;

  if (exchangeRate != null && netIncomeThb == null && effectiveUsdBase > 0) {
    netIncomeThb = Number((effectiveUsdBase * exchangeRate).toFixed(2));
  } else if (netIncomeThb != null && exchangeRate == null && effectiveUsdBase > 0) {
    exchangeRate = Number((netIncomeThb / effectiveUsdBase).toFixed(4));
  }

  // Determine Status
  let status: 'pending' | 'in_platform' | 'completed' = 'pending';
  if (bankReceivedDateUtc != null || (netIncomeThb != null && netIncomeThb > 0)) {
    status = 'completed';
  } else if (platformDateUtc != null || platformUsd != null) {
    status = 'in_platform';
  }

  // Tax Year (based on bank receipt if completed, else withdraw date)
  const refDate = bankReceivedDateUtc ? new Date(bankReceivedDateUtc) : new Date(stockWithdrawDateUtc);
  const taxYear = refDate.getUTCFullYear();

  // Lead Time Days
  let leadTimeDays: number | null = null;
  if (bankReceivedDateUtc && stockWithdrawDateUtc) {
    const msDiff = new Date(bankReceivedDateUtc).getTime() - new Date(stockWithdrawDateUtc).getTime();
    leadTimeDays = Math.max(0, Math.round(msDiff / (1000 * 60 * 60 * 24)));
  }

  return {
    stockWithdrawDate: stockWithdrawDateUtc,
    platformDate: platformDateUtc,
    bankReceivedDate: bankReceivedDateUtc,
    feeUsd,
    exchangeRate,
    netIncomeThb,
    status,
    taxYear,
    leadTimeDays,
  };
}

/**
 * Computes proportional splits for bundled bank withdrawal
 */
export function calculateBundledSplit(
  records: Array<{ id: string; stockAmountUsd: number; platformAmountUsd?: number | null }>,
  target: { exchangeRate?: number; totalNetIncomeThb?: number }
): Array<{ id: string; exchangeRate: number; netIncomeThb: number }> {
  if (records.length === 0) return [];
  
  const totalBaseUsd = records.reduce((sum, r) => sum + (r.platformAmountUsd ?? r.stockAmountUsd), 0);
  if (totalBaseUsd <= 0) return [];

  let effectiveRate = target.exchangeRate;
  if (!effectiveRate && target.totalNetIncomeThb && target.totalNetIncomeThb > 0) {
    effectiveRate = target.totalNetIncomeThb / totalBaseUsd;
  }
  if (!effectiveRate) return [];

  if (target.totalNetIncomeThb && target.totalNetIncomeThb > 0) {
    let accumulatedThb = 0;
    const results = records.map((r, idx) => {
      const baseUsd = r.platformAmountUsd ?? r.stockAmountUsd;
      if (idx === records.length - 1) {
        // Last item takes the remainder to prevent 1-satang rounding drift
        const remainder = Number((target.totalNetIncomeThb! - accumulatedThb).toFixed(2));
        return {
          id: r.id,
          exchangeRate: Number(effectiveRate!.toFixed(4)),
          netIncomeThb: Math.max(0, remainder),
        };
      }
      const portion = Number(((baseUsd / totalBaseUsd) * target.totalNetIncomeThb!).toFixed(2));
      accumulatedThb += portion;
      return {
        id: r.id,
        exchangeRate: Number(effectiveRate!.toFixed(4)),
        netIncomeThb: portion,
      };
    });
    return results;
  }

  return records.map((r) => {
    const baseUsd = r.platformAmountUsd ?? r.stockAmountUsd;
    return {
      id: r.id,
      exchangeRate: Number(effectiveRate!.toFixed(4)),
      netIncomeThb: Number((baseUsd * effectiveRate!).toFixed(2)),
    };
  });
}

/**
 * Standardizes microstock platform name from raw string
 */
export function normalizeStockName(raw: string): string {
  const lower = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (lower.includes('shutter') || lower === 'ss') return 'Shutterstock';
  if (lower.includes('adobe') || lower.includes('ft') || lower === 'as') return 'Adobe Stock';
  if (lower.includes('vecteezy') || lower === 'vz') return 'Vecteezy';
  if (lower.includes('123rf')) return '123RF';
  if (lower.includes('freepik')) return 'Freepik';
  if (lower.includes('dreamstime')) return 'Dreamstime';
  if (lower.includes('istock') || lower.includes('getty')) return 'iStock / Getty';
  return raw.trim();
}

/**
 * Standardizes payment platform name from raw string
 */
export function normalizePlatformName(raw?: string | null): string {
  if (!raw) return 'Payoneer';
  const lower = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (lower.includes('payoneer')) return 'Payoneer';
  if (lower.includes('paypal')) return 'PayPal';
  if (lower.includes('skrill')) return 'Skrill';
  if (lower.includes('wire') || lower.includes('bank')) return 'Bank Wire';
  return raw.trim() || 'Payoneer';
}

/**
 * Parses raw Google Sheet TSV clipboard text into structured Payout records
 */
export function parseGoogleSheetPayoutsTSV(rawText: string): ParsedPayoutRow[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedPayoutRow[] = [];

  for (const line of lines) {
    const cols = line.includes('\t')
      ? line.split('\t').map((c) => c.trim())
      : line.split(/\s{2,}/).map((c) => c.trim());
    if (cols.length < 3) continue;

    // Check if header row
    const firstCol = cols[0].toLowerCase();
    if (firstCol.includes('stock withdraw') || firstCol === 'date' || firstCol.includes('summary')) {
      continue;
    }

    const stockWithdrawDateUtc = normalizeDateToUTC(cols[0]);
    if (!stockWithdrawDateUtc) continue;

    const stockName = normalizeStockName(cols[1]);
    const stockAmountUsd = parseCleanNumber(cols[2]);
    if (stockAmountUsd == null || stockAmountUsd <= 0) continue;

    // Column 3: Platform Date
    const platformDateUtc = cols.length > 3 ? normalizeDateToUTC(cols[3]) : null;
    
    // Column 4: Platform Name
    const platformName = cols.length > 4 ? normalizePlatformName(cols[4]) : 'Payoneer';

    // Column 5: Platform USD Amount
    const platformAmountUsd = cols.length > 5 ? parseCleanNumber(cols[5]) : null;

    // Column 6: Rate
    const exchangeRate = cols.length > 6 ? parseCleanNumber(cols[6]) : null;

    // Column 7: Net Income THB
    const netIncomeThb = cols.length > 7 ? parseCleanNumber(cols[7]) : null;

    // Column 8+: Notes (e.g. "Rate 35.45 (116,992.80) 1 วัน")
    const notes = cols.length > 8 ? cols.slice(8).join(' ').trim() || null : null;

    const derived = calculatePayoutDerivedFields({
      stockWithdrawDate: stockWithdrawDateUtc,
      stockAmountUsd,
      platformDate: platformDateUtc,
      platformAmountUsd,
      exchangeRate,
      netIncomeThb,
    });

    results.push({
      stockWithdrawDate: derived.stockWithdrawDate,
      stockName,
      stockAmountUsd,
      platformDate: derived.platformDate,
      platformName,
      platformAmountUsd,
      feeUsd: derived.feeUsd,
      bankReceivedDate: derived.bankReceivedDate,
      exchangeRate: derived.exchangeRate,
      netIncomeThb: derived.netIncomeThb,
      status: derived.status,
      taxYear: derived.taxYear,
      leadTimeDays: derived.leadTimeDays,
      notes,
    });
  }

  return results;
}
