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
