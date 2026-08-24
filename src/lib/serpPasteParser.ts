export interface ParsedSerpItem {
  rank: number;
  assetId: string;
  title: string;
  author?: string;
  thumbnailUrl?: string;
  detailUrl?: string;
  isMine?: boolean;
  matchedImageId?: string;
}

export interface ParsedSerpBatch {
  keyword: string;
  platform: string;
  pageNumber: number;
  items: ParsedSerpItem[];
  totalItems: number;
}

/**
 * Universal parser for TSV, CSV, or JSON clipboard pastes representing stock search results.
 */
export function parseSerpClipboardText(
  rawText: string,
  fallbackKeyword = 'untitled',
  fallbackPage = 1,
  platform = 'Adobe Stock'
): ParsedSerpBatch {
  const trimmed = (rawText || '').trim();
  if (!trimmed) {
    return {
      keyword: fallbackKeyword,
      platform,
      pageNumber: fallbackPage,
      items: [],
      totalItems: 0,
    };
  }

  // 1. Try parsing JSON format
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const items: ParsedSerpItem[] = [];
        for (let idx = 0; idx < parsed.length; idx++) {
          const item = parsed[idx];
          if (!item || typeof item !== 'object') continue;
          const record = item as Record<string, unknown>;
          const assetId = String(record.assetId || record.id || record.contentId || '').replace(/^[#:]+/, '').trim();
          const title = String(record.title || record.name || '').trim();
          const page = Number(record.page || record.pageNumber) || fallbackPage;
          const rank = Number(record.rank) || (page - 1) * 100 + idx + 1;
          if (!assetId && !title) continue;
          items.push({
            rank,
            assetId: assetId || `temp_${idx + 1}`,
            title: title || `Asset #${assetId}`,
            author: typeof record.author === 'string' ? record.author : typeof record.creator === 'string' ? record.creator : undefined,
            thumbnailUrl: typeof record.thumbnailUrl === 'string' ? record.thumbnailUrl : typeof record.thumb === 'string' ? record.thumb : undefined,
            detailUrl: typeof record.detailUrl === 'string' ? record.detailUrl : typeof record.url === 'string' ? record.url : undefined,
          });
        }

        const detectedKeyword = String(parsed[0]?.keyword || fallbackKeyword).trim();
        const detectedPage = Number(parsed[0]?.page || parsed[0]?.pageNumber) || fallbackPage;

        return {
          keyword: detectedKeyword || fallbackKeyword,
          platform: String(parsed[0]?.platform || platform).trim(),
          pageNumber: detectedPage,
          items,
          totalItems: items.length,
        };
      } else if (parsed && typeof parsed === 'object') {
        const keyword = String(parsed.keyword || fallbackKeyword).trim();
        const pageNumber = Number(parsed.pageNumber || parsed.page) || fallbackPage;
        const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
        const items: ParsedSerpItem[] = [];

        for (let idx = 0; idx < rawItems.length; idx++) {
          const item = rawItems[idx];
          if (!item || typeof item !== 'object') continue;
          const record = item as Record<string, unknown>;
          const assetId = String(record.assetId || record.id || '').replace(/^[#:]+/, '').trim();
          const title = String(record.title || '').trim();
          const rank = Number(record.rank) || (pageNumber - 1) * 100 + idx + 1;
          if (!assetId && !title) continue;
          items.push({
            rank,
            assetId: assetId || `temp_${idx + 1}`,
            title: title || `Asset #${assetId}`,
            author: typeof record.author === 'string' ? record.author : undefined,
            thumbnailUrl: typeof record.thumbnailUrl === 'string' ? record.thumbnailUrl : undefined,
            detailUrl: typeof record.detailUrl === 'string' ? record.detailUrl : undefined,
          });
        }

        return {
          keyword,
          platform: String(parsed.platform || platform).trim(),
          pageNumber,
          items,
          totalItems: items.length,
        };
      }
    } catch {
      // Fall through to text/TSV parsing
    }
  }

  // 2. Parse Delimited Text (TSV, CSV, or Tabular lines)
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      keyword: fallbackKeyword,
      platform,
      pageNumber: fallbackPage,
      items: [],
      totalItems: 0,
    };
  }

  let detectedKeyword = fallbackKeyword;
  let detectedPage = fallbackPage;
  const items: ParsedSerpItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeader =
      /^(keyword|page|rank|asset\s*id|title|thumb)/i.test(line) ||
      (i === 0 && line.toLowerCase().includes('asset') && line.toLowerCase().includes('rank'));

    if (isHeader) {
      continue;
    }

    // Determine delimiter: Tab or Comma (respecting quotes)
    const delimiter = line.includes('\t') ? '\t' : ',';
    const cols = parseDelimitedLine(line, delimiter);
    if (cols.length === 0) continue;

    // Pattern 1: [Keyword, Page, Rank, AssetId, Title, ThumbnailUrl, DetailUrl, Author]
    // Pattern 2: [Rank, AssetId, Title, ThumbnailUrl, DetailUrl, Author]
    // Pattern 3: [AssetId, Title, ThumbnailUrl]
    let rowKeyword = fallbackKeyword;
    let rowPage = fallbackPage;
    let rank = 0;
    let assetId = '';
    let title = '';
    let thumbnailUrl: string | undefined;
    let detailUrl: string | undefined;
    let author: string | undefined;

    if (cols.length >= 5 && isNaN(Number(cols[0])) && !isNaN(Number(cols[1]))) {
      // Starts with Keyword string, then Page number, Rank, Asset ID...
      rowKeyword = cols[0];
      rowPage = Number(cols[1]) || fallbackPage;
      rank = Number(cols[2]) || (rowPage - 1) * 100 + items.length + 1;
      assetId = cleanAssetId(cols[3]);

      // Detect layout: Clean (6 cols: Keyword,Page,Rank,AssetId,Author,Title)
      // vs Extended (8 cols: Keyword,Page,Rank,AssetId,Title,Thumbnail,DetailUrl,Author)
      // Heuristic: if col[4] does NOT look like a URL/path and cols.length <= 6, treat as clean layout
      const col4LooksLikeUrl = cols[4] && (cols[4].startsWith('http') || cols[4].startsWith('/'));

      if (cols.length <= 6 && !col4LooksLikeUrl) {
        // Clean layout: [Keyword, Page, Rank, AssetId, Author, Title]
        author = cols[4] || undefined;
        title = cols[5] || '';
      } else {
        // Extended layout: [Keyword, Page, Rank, AssetId, Title, Thumbnail, DetailUrl, Author]
        title = cols[4] || '';
        thumbnailUrl = cols[5] || undefined;
        detailUrl = cols[6] || undefined;
        author = cols[7] || undefined;
      }
    } else if (cols.length >= 3 && !isNaN(Number(cols[0]))) {
      // Starts with numeric Rank, then Asset ID, Title...
      rank = Number(cols[0]);
      assetId = cleanAssetId(cols[1]);
      title = cols[2] || '';
      thumbnailUrl = cols[3] || undefined;
      detailUrl = cols[4] || undefined;
      author = cols[5] || undefined;
    } else {
      // Loose mapping: find first all-digit token as asset ID
      const digitIdx = cols.findIndex((c) => /^\d{6,15}$/.test(c.replace(/^[#:]+/, '')));
      if (digitIdx !== -1) {
        assetId = cleanAssetId(cols[digitIdx]);
        title = cols.filter((_, idx) => idx !== digitIdx).join(' ');
        rank = (detectedPage - 1) * 100 + items.length + 1;
      } else {
        assetId = `row_${i + 1}`;
        title = cols.join(' ');
        rank = (detectedPage - 1) * 100 + items.length + 1;
      }
    }

    if (rowKeyword && rowKeyword !== 'untitled' && detectedKeyword === fallbackKeyword) {
      detectedKeyword = rowKeyword;
    }
    if (rowPage && detectedPage === fallbackPage) {
      detectedPage = rowPage;
    }

    if (!rank) {
      rank = (detectedPage - 1) * 100 + items.length + 1;
    }

    if (assetId || title) {
      items.push({
        rank,
        assetId: assetId || `row_${i + 1}`,
        title: title || `Artwork #${assetId}`,
        author: author || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        detailUrl: detailUrl || undefined,
      });
    }
  }

  return {
    keyword: detectedKeyword,
    platform,
    pageNumber: detectedPage,
    items,
    totalItems: items.length,
  };
}

function cleanAssetId(val: string): string {
  return (val || '').replace(/^[#:]+/, '').replace(/\D+$/, '').trim();
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') {
    return line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
  }
  // Simple CSV regex parsing with quote handling
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}
