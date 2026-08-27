export interface ParsedStockRow {
  assetId: string;
  type?: string;
  dateStr: string; // Normalized YYYY-MM-DD
  dateDisplay: string; // Original M/D/YYYY
  earnings: number;
  downloads?: number;
}

/**
 * Extracts a statement date header from clipboard text if present.
 * Matches patterns like:
 * - Date: 2026-05-01
 * - # Date: 2026-05-01
 * - Statement Date: 2026-05-01
 * - Period: 5/1/2026 or 2026-05-01
 * Returns normalized YYYY-MM-DD string, or null if not found.
 */
export function extractStatementDate(rawText: string): string | null {
  if (!rawText || typeof rawText !== 'string') return null;

  const lines = rawText.split(/\r?\n/).slice(0, 10);
  for (const line of lines) {
    const trimmed = line.trim();
    // Pattern 1: ISO format YYYY-MM-DD
    const isoMatch = trimmed.match(/(?:#\s*)?(?:statement\s+date|date|period):\s*(\d{4})-(\d{1,2})-(\d{1,2})/i);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Pattern 2: US format M/D/YYYY
    const usMatch = trimmed.match(/(?:#\s*)?(?:statement\s+date|date|period):\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (usMatch) {
      const month = usMatch[1].padStart(2, '0');
      const day = usMatch[2].padStart(2, '0');
      const year = usMatch[3];
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Parses unstructured/semi-structured text copied from stock contributor tables.
 * Handles:
 * - Line-separated tokens (with or without markdown links `[1929092005](url)`)
 * - TSV tab-separated rows
 * - Currency symbols ($) and commas in numbers
 */
export function parseStockPaste(rawText: string): ParsedStockRow[] {
  if (!rawText || typeof rawText !== 'string') return [];

  const results: ParsedStockRow[] = [];
  const seenIds = new Set<string>();
  
  // Clean markdown links e.g. [1929092005](https://...) -> 1929092005
  const normalizedText = rawText.replace(/\[(\d{8,14})\]\([^)]+\)/g, '$1');

  // Strategy 1: Check for row-by-row lines (e.g. TSV or multi-token lines)
  const lines = normalizedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^(?:#\s*)?(?:statement\s+date|date|period):/i.test(l));

  // Check if each line is a standalone full row (contains ID, date, and currency on the same line)
  const singleLinePattern = /(\b\d{8,14}\b)[\s\t]+(?:(Vectors|Photos|Illustrations|Video)[\s\t]+)?(\d{1,2}\/\d{1,2}\/\d{4})[\s\t]+(?:([\d,]+)[\s\t]+)?\$?([\d,]+\.?\d*)/i;
  
  let foundSingleLines = false;
  for (const line of lines) {
    const match = line.match(singleLinePattern);
    if (match) {
      foundSingleLines = true;
      const assetId = match[1];
      if (seenIds.has(assetId)) continue;
      seenIds.add(assetId);

      const type = match[2] || 'Vectors';
      const dateDisplay = match[3];
      const earnings = parseFloat(match[5].replace(/,/g, '')) || 0;
      const downloads = match[4]
        ? parseInt(match[4].replace(/,/g, ''), 10)
        : (earnings > 0 ? 1 : 0);

      const dateParts = dateDisplay.split('/');
      const month = dateParts[0].padStart(2, '0');
      const day = dateParts[1].padStart(2, '0');
      const year = dateParts[2];
      const dateStr = `${year}-${month}-${day}`;

      results.push({
        assetId,
        type,
        dateDisplay,
        dateStr,
        earnings,
        downloads,
      });
    }
  }

  if (foundSingleLines && results.length > 0) {
    return results;
  }

  // Strategy 2: Block/Token stream parsing (one token per line)
  // Headers to ignore: Thumb, Id, Type, Upload date, Earnings, Downloads
  const ignoredHeaders = new Set(['thumb', 'id', 'type', 'upload date', 'earnings', 'downloads', 'vectors', 'photos', 'illustrations']);

  // Extract all IDs (8-14 digits) and their following tokens
  // A row block typically contains:
  // 1. Asset ID (\b\d{8,14}\b)
  // 2. Optional Type (Vectors/Photos)
  // 3. Date (\d{1,2}\/\d{1,2}\/\d{4})
  // 4. Optional Downloads (\d+)
  // 5. Earnings (\$?[\d,]+\.\d{2})
  
  let i = 0;
  while (i < lines.length) {
    const currentLine = lines[i];
    const idMatch = currentLine.match(/\b(\d{8,14})\b/);

    if (idMatch && !ignoredHeaders.has(currentLine.toLowerCase())) {
      const assetId = idMatch[1];
      let type = 'Vectors';
      let dateDisplay = '';
      let earnings = 0;
      let downloads: number | undefined;

      // Look ahead up to 6 lines for type, date, downloads, earnings
      let j = i + 1;
      while (j < Math.min(lines.length, i + 7)) {
        const nextLine = lines[j];
        
        // Check for date
        const dateMatch = nextLine.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
        if (dateMatch && !dateDisplay) {
          dateDisplay = dateMatch[0];
        }

        // Check for downloads count (standalone integer)
        const dlMatch = nextLine.match(/^\s*([\d,]+)\s*$/);
        if (dlMatch && !nextLine.includes('/') && !nextLine.includes('$') && !nextLine.includes('.')) {
          const num = parseInt(dlMatch[1].replace(/,/g, ''), 10);
          if (num >= 0 && num < 10000000 && downloads === undefined) {
            downloads = num;
          }
        }

        // Check for earnings ($XX.XX or XX.XX after date is found)
        const earningsMatch = nextLine.match(/\$?\s*([\d,]+\.\d{2})\b/);
        if (earningsMatch && (nextLine.includes('$') || Boolean(dateDisplay))) {
          earnings = parseFloat(earningsMatch[1].replace(/,/g, ''));
        }

        // Check for standalone type
        if (/^(Vectors|Photos|Illustrations|Video)$/i.test(nextLine)) {
          type = nextLine;
        }

        // If we found next ID, stop lookahead
        if (j > i + 1 && /\b\d{8,14}\b/.test(nextLine) && !nextLine.includes('$') && !nextLine.includes('/')) {
          break;
        }

        j++;
      }

      if (assetId && dateDisplay && earnings >= 0) {
        const dateParts = dateDisplay.split('/');
        const month = dateParts[0].padStart(2, '0');
        const day = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        const dateStr = `${year}-${month}-${day}`;

        if (!seenIds.has(assetId)) {
          seenIds.add(assetId);
          results.push({
            assetId,
            type,
            dateDisplay,
            dateStr,
            earnings,
            downloads: downloads !== undefined ? downloads : (earnings > 0 ? 1 : 0),
          });
        }

        i = j - 1; // Advance pointer
      }
    }
    i++;
  }

  return results;
}
