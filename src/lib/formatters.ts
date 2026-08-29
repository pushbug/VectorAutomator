/**
 * Formats a numeric value as US Dollar currency string (e.g. "$1,234.56" or "1,234.56").
 */
export function formatCurrency(
  val: number | null | undefined,
  includeSymbol: boolean = true
): string {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return includeSymbol ? `$${formatted}` : formatted;
}

/**
 * Formats a numeric value as Thai Baht currency string (e.g. "฿1,234.56" or "1,234.56").
 */
export function formatBaht(
  val: number | null | undefined,
  includeSymbol: boolean = true
): string {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return includeSymbol ? `฿${formatted}` : formatted;
}

/**
 * Formats a numeric value with standard thousands separators (e.g. "1,234").
 */
export function formatNumber(val: number | null | undefined): string {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('en-US');
}

/**
 * Formats an ISO / YYYY-MM-DD date string into DD-MM-YYYY tabular display format (e.g. "20-08-2026").
 */
export function formatTableDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Formats a date string into readable weekday + month + day + year (e.g. "Thu, Aug 20, 2026").
 */
export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Select date';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const date = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return dateStr;
}

/**
 * Safely formats any Date object or ISO date string into standard "MMM D, YYYY" format (e.g. "Aug 20, 2026").
 * Returns 'None' if date is null/undefined/empty.
 */
export function formatDateSafe(d: string | Date | null | undefined): string {
  if (!d) return 'None';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return String(d);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}



export interface PlatformStatItem {
  platform: string;
  downloads?: number | null;
  earnings?: number | null;
}

export interface PlatformBreakdownResult {
  totalEarnings: number;
  totalDownloads: number;
  platformBreakdown: Record<string, { downloads: number; earnings: number }>;
}

/**
 * Aggregates a list of platform statistics into accumulated total earnings,
 * total downloads, and a per-platform breakdown dictionary.
 */
export function calculatePlatformBreakdown(
  stats?: PlatformStatItem[] | null
): PlatformBreakdownResult {
  const result: PlatformBreakdownResult = {
    totalEarnings: 0,
    totalDownloads: 0,
    platformBreakdown: {},
  };

  if (!stats || !Array.isArray(stats) || stats.length === 0) {
    return result;
  }

  for (const s of stats) {
    if (!s || !s.platform) continue;
    const dl = typeof s.downloads === 'number' && !isNaN(s.downloads) ? s.downloads : 0;
    const earn = typeof s.earnings === 'number' && !isNaN(s.earnings) ? s.earnings : 0;

    result.totalDownloads += dl;
    result.totalEarnings += earn;

    if (!result.platformBreakdown[s.platform]) {
      result.platformBreakdown[s.platform] = { downloads: 0, earnings: 0 };
    }
    result.platformBreakdown[s.platform].downloads += dl;
    result.platformBreakdown[s.platform].earnings += earn;
  }

  return result;
}

/**
 * Returns today's date formatted as YYYY-MM-DD string.
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Builds a sanitized, URI-encoded image serving URL with optional cache-busting version parameter.
 */
export function getImageUrl(
  filePath?: string | null,
  updatedAt?: string | Date | number | null
): string {
  if (!filePath || typeof filePath !== 'string' || !filePath.trim()) {
    return '';
  }
  const encoded = encodeURIComponent(filePath.trim());
  if (!updatedAt) {
    return `/api/image?path=${encoded}`;
  }
  let v: number;
  if (typeof updatedAt === 'number') {
    v = updatedAt;
  } else {
    const d = new Date(updatedAt);
    v = isNaN(d.getTime()) ? Date.now() : d.getTime();
  }
  return `/api/image?path=${encoded}&v=${v}`;
}

