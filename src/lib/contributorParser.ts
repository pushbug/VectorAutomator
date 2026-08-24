export interface ContributorItem {
  asId: string;
  title: string;
  downloads: number;
  thumbnailUrl?: string;
}

export type SyncInputItem = ContributorItem;

/**
 * Strips common stock trailing suffixes and format descriptions
 */
export function cleanSuffixes(str: string): string {
  return str
    .replace(/\s*(vector\s+illustration|vector|illustration|infographic|template|brochure|diagram|poster|banner)[\.\s]*$/gi, '')
    .trim();
}

/**
 * Normalizes title string for exact and fuzzy matching comparisons
 */
export function normalizeTitle(str: string): string {
  const withoutSuffix = cleanSuffixes(str);
  return withoutSuffix
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0E00-\u0E7F]/g, '');
}

/**
 * Tokenizes title into unique word set for Jaccard similarity
 */
export function tokenize(str: string): Set<string> {
  const words = str
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
  return new Set(words);
}

/**
 * Computes Jaccard word-overlap similarity between two titles (0.0 to 1.0)
 */
export function computeSimilarity(titleA: string, titleB: string): number {
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);
  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const tokensA = tokenize(titleA);
  const tokensB = tokenize(titleB);
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersectionCount++;
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return unionCount > 0 ? intersectionCount / unionCount : 0;
}

/**
 * Parses TSV/CSV text strings from Contributor / SERP tables
 */
export function parseTsvString(tsv: string): SyncInputItem[] {
  const lines = tsv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: SyncInputItem[] = [];

  for (const line of lines) {
    const parts = line.includes('\t') ? line.split('\t') : line.split(',');
    if (parts.length < 2) continue;

    const col0 = parts[0]?.trim().replace(/^["']|["']$/g, '');
    const col1 = parts[1]?.trim().replace(/^["']|["']$/g, '');
    const col2 = parts[2]?.trim().replace(/^["']|["']$/g, '');
    const col3 = parts[3]?.trim().replace(/^["']|["']$/g, '');

    // Skip headers
    if (
      col0.toLowerCase().includes('asset id') ||
      col0.toLowerCase().includes('keyword') ||
      (col0.toLowerCase().includes('id') && isNaN(Number(col0)))
    ) {
      continue;
    }

    let asId = '';
    let title = '';
    let downloads = 0;
    let thumbnailUrl = '';

    // Standard format: Col 0 is numeric Asset ID (Asset ID, Title, Downloads, Thumbnail)
    if (/^\d{6,15}$/.test(col0)) {
      asId = col0;
      title = col1;
      if (col2 && !isNaN(Number(col2.replace(/,/g, '')))) {
        downloads = parseInt(col2.replace(/,/g, ''), 10);
      }
      if (col3 && (col3.startsWith('http') || col3.includes('ftcdn.net'))) {
        thumbnailUrl = col3;
      }
    }
    // SERP table format (Keyword, Page, Rank, Asset ID, Author, Title, Thumbnail)
    else if (parts.length >= 6 && /^\d{6,15}$/.test(parts[3]?.trim())) {
      asId = parts[3].trim();
      title = parts[5]?.trim() || '';
      if (parts[6]?.startsWith('http')) thumbnailUrl = parts[6].trim();
    }
    // Reverse format (Title, Asset ID, Downloads, Thumbnail)
    else if (/^\d{6,15}$/.test(col1)) {
      title = col0;
      asId = col1;
      if (col2 && !isNaN(Number(col2.replace(/,/g, '')))) {
        downloads = parseInt(col2.replace(/,/g, ''), 10);
      }
      if (col3 && col3.startsWith('http')) {
        thumbnailUrl = col3;
      }
    }

    if (asId && title) {
      items.push({ asId, title, downloads, thumbnailUrl });
    }
  }

  return items;
}

/**
 * Parses raw HTML string from Adobe Stock Contributor portfolio page
 * and extracts { asId, title, downloads, thumbnailUrl }.
 */
export function parseContributorHtml(html: string): ContributorItem[] {
  const items: ContributorItem[] = [];
  const seenIds = new Set<string>();

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const cards = doc.querySelectorAll('div[title]');
    cards.forEach((card) => {
      const title = card.getAttribute('title')?.trim();
      const img = card.querySelector('img[src*="_F_"]') || card.querySelector('img');
      const src = img?.getAttribute('src') || '';
      const match = src.match(/_F_(\d+)_/);
      const asId = match ? match[1] : '';

      if (asId && title && !seenIds.has(asId)) {
        seenIds.add(asId);
        let downloads = 0;
        const dlEl = card.querySelector('.text-medium.light, span.text-medium');
        if (dlEl && dlEl.textContent) {
          const parsed = parseInt(dlEl.textContent.replace(/,/g, '').trim(), 10);
          if (!isNaN(parsed)) downloads = parsed;
        }
        items.push({ asId, title, downloads, thumbnailUrl: src });
      }
    });
  }

  // Regex fallback if items empty or DOMParser is unavailable
  if (items.length === 0) {
    const titleRegex = /<div\s+title="([^"]+)"[^>]*>([\s\S]*?)<\/div>/gi;
    let cardMatch: RegExpExecArray | null;
    while ((cardMatch = titleRegex.exec(html)) !== null) {
      const title = cardMatch[1].trim();
      const inner = cardMatch[2];
      const imgMatch = inner.match(/_F_(\d+)_/);
      if (imgMatch) {
        const asId = imgMatch[1];
        if (!seenIds.has(asId)) {
          seenIds.add(asId);
          let downloads = 0;
          const dlMatch = inner.match(/<span[^>]*class="[^"]*text-medium[^"]*"[^>]*>([0-9,]+)<\/span>/i);
          if (dlMatch) {
            const parsed = parseInt(dlMatch[1].replace(/,/g, ''), 10);
            if (!isNaN(parsed)) downloads = parsed;
          }
          items.push({ asId, title, downloads });
        }
      }
    }
  }

  return items;
}
