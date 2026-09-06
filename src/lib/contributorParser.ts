export interface ContributorItem {
  asId: string;
  ssId?: string;
  platform?: 'Adobe Stock' | 'Shutterstock';
  title: string;
  downloads: number;
  status?: string;
  mediaType?: string;
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
 * Auto-detects contributor platform from raw text, TSV headers, or HTML markup
 */
export function detectContributorPlatform(text: string): 'Adobe Stock' | 'Shutterstock' {
  const lower = text.toLowerCase();
  if (
    lower.includes('shutterstock id') ||
    lower.includes('submit.shutterstock.com') ||
    lower.includes('image.shutterstock.com') ||
    lower.includes('data-testid="asset-card"') ||
    lower.includes('data-testid="asset-grid-published"')
  ) {
    return 'Shutterstock';
  }
  return 'Adobe Stock';
}

/**
 * Parses TSV/CSV text strings from Contributor / SERP tables
 */
export function parseTsvString(
  tsv: string,
  targetPlatform?: 'Adobe Stock' | 'Shutterstock'
): ContributorItem[] {
  const detectedPlatform = targetPlatform || detectContributorPlatform(tsv);
  const isShutterstock = detectedPlatform === 'Shutterstock';

  const lines = tsv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: ContributorItem[] = [];

  for (const line of lines) {
    const parts = line.includes('\t') ? line.split('\t') : line.split(',');
    if (parts.length < 2) continue;

    const col0 = parts[0]?.trim().replace(/^["']|["']$/g, '');
    const col1 = parts[1]?.trim().replace(/^["']|["']$/g, '');
    const col2 = parts[2]?.trim().replace(/^["']|["']$/g, '');
    const col3 = parts[3]?.trim().replace(/^["']|["']$/g, '');

    // Skip headers
    const lower0 = col0.toLowerCase();
    if (
      lower0.includes('asset id') ||
      lower0.includes('shutterstock id') ||
      lower0.includes('keyword') ||
      (lower0.includes('id') && isNaN(Number(col0)))
    ) {
      continue;
    }

    let asId = '';
    let ssId = '';
    let title = '';
    let downloads = 0;
    let status = 'Approved';
    let mediaType = 'Illustration';
    let thumbnailUrl = '';

    // Dynamically locate any token representing an image URL
    const foundUrl = parts
      .map((p) => p.trim().replace(/^["']|["']$/g, ''))
      .find((clean) => clean.startsWith('http') || clean.includes('ftcdn.net') || clean.includes('shutterstock.com'));
    if (foundUrl) {
      thumbnailUrl = foundUrl;
    }

    // Shutterstock Format: Shutterstock ID \t Title / Filename \t Status \t Media Type \t Thumbnail URL
    if (isShutterstock && /^\d{6,15}$/.test(col0)) {
      ssId = col0;
      asId = col0; // for backwards compatibility in generic handlers
      title = col1;
      if (col2 && !col2.startsWith('http')) status = col2;
      if (col3 && !col3.startsWith('http')) mediaType = col3;
    }
    // Standard format: Col 0 is numeric Asset ID (Asset ID, Title, Downloads, ...)
    else if (/^\d{6,15}$/.test(col0)) {
      asId = col0;
      if (isShutterstock) ssId = col0;
      title = col1;
      if (col2 && !isNaN(Number(col2.replace(/,/g, '')))) {
        downloads = parseInt(col2.replace(/,/g, ''), 10);
      }
    }
    // SERP table format (Keyword, Page, Rank, Asset ID, Author, Title, Thumbnail)
    else if (parts.length >= 6 && /^\d{6,15}$/.test(parts[3]?.trim())) {
      asId = parts[3].trim();
      if (isShutterstock) ssId = asId;
      title = parts[5]?.trim() || '';
      if (!thumbnailUrl && parts[6]?.startsWith('http')) {
        thumbnailUrl = parts[6].trim();
      }
    }
    // Reverse format (Title, Asset ID, Downloads, ...)
    else if (/^\d{6,15}$/.test(col1)) {
      title = col0;
      asId = col1;
      if (isShutterstock) ssId = col1;
      if (col2 && !isNaN(Number(col2.replace(/,/g, '')))) {
        downloads = parseInt(col2.replace(/,/g, ''), 10);
      }
    }

    if ((asId || ssId) && title) {
      const item: ContributorItem = {
        asId,
        title,
        downloads,
      };
      if (thumbnailUrl) item.thumbnailUrl = thumbnailUrl;

      if (isShutterstock) {
        item.ssId = ssId || asId;
        item.platform = 'Shutterstock';
        item.status = status;
        item.mediaType = mediaType;
      }

      items.push(item);
    }
  }

  return items;
}

/**
 * Parses raw HTML string from Shutterstock Contributor Catalog page
 */
export function parseShutterstockHtml(html: string): ContributorItem[] {
  const items: ContributorItem[] = [];
  const seenIds = new Set<string>();

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const cards = doc.querySelectorAll('div[data-testid="asset-card"]');
    cards.forEach((card) => {
      let ssId = '';
      const typo = card.querySelector('.MuiTypography-bodyStaticMd, .MuiCardContent-root .MuiTypography-root');
      if (typo && typo.textContent) {
        const match = typo.textContent.trim().match(/^(\d{7,12})\b/);
        if (match) ssId = match[1];
      }

      const img = card.querySelector('img.MuiCardMedia-media') || card.querySelector('img');
      const src = img?.getAttribute('src') || '';
      if (!ssId && src) {
        const match = src.match(/-(\d{7,12})\.jpg/i);
        if (match) ssId = match[1];
      }

      if (!ssId || seenIds.has(ssId)) return;
      seenIds.add(ssId);

      let title = '';
      const checkbox = card.querySelector('input[data-testid="asset-checkbox"], input[type="checkbox"]');
      if (checkbox) {
        const ariaLabel = checkbox.getAttribute('aria-label') || '';
        if (ariaLabel) title = ariaLabel.replace(/^select\s+asset\s+/i, '').trim();
      }

      if (!title && img) {
        const testId = img.getAttribute('data-testid') || '';
        if (testId.startsWith('card-media-')) {
          title = testId.replace(/^card-media-/, '').trim();
        } else {
          title = img.getAttribute('alt')?.trim() || '';
        }
      }

      if (!title && typo) {
        title = typo.textContent?.replace(/^\d+\s*-\s*/, '').trim() || `Asset ${ssId}`;
      }

      let status = 'Approved';
      let mediaType = 'Illustration';
      const badges = card.querySelectorAll('.MuiCardContent-root p.MuiTypography-bodyStaticXs, .MuiCardContent-root p');
      if (badges.length > 0) {
        const texts = Array.from(badges).map((b) => (b.textContent || '').trim()).filter(Boolean);
        if (texts.length >= 1) status = texts[0];
        if (texts.length >= 2) mediaType = texts[1];
      }

      items.push({
        asId: ssId,
        ssId,
        platform: 'Shutterstock',
        title,
        downloads: 0,
        status,
        mediaType,
        thumbnailUrl: src,
      });
    });
  }

  // Regex fallback
  if (items.length === 0) {
    const cardChunks = html.split(/(?=<div[^>]*data-testid="asset-card")/i);
    for (const chunk of cardChunks) {
      const idMatch =
        chunk.match(/MuiTypography-bodyStaticMd[^>]*>(\d{7,12})/i) ||
        chunk.match(/-250nw-(\d{7,12})\.jpg/i) ||
        chunk.match(/-(\d{7,12})\.jpg/i);
      if (!idMatch) continue;
      const ssId = idMatch[1];
      if (seenIds.has(ssId)) continue;
      seenIds.add(ssId);

      const titleMatch =
        chunk.match(/aria-label="select\s+asset\s+([^"]+)"/i) ||
        chunk.match(/data-testid="card-media-([^"]+)"/i) ||
        chunk.match(/alt="([^"]+)"/i);
      const title = titleMatch ? titleMatch[1].trim() : `Asset ${ssId}`;

      const srcMatch = chunk.match(/src="([^"]+image\.shutterstock\.com[^"]+)"/i) || chunk.match(/src="([^"]+)"/i);
      const thumbnailUrl = srcMatch ? srcMatch[1] : '';

      items.push({
        asId: ssId,
        ssId,
        platform: 'Shutterstock',
        title,
        downloads: 0,
        status: 'Approved',
        mediaType: 'Illustration',
        thumbnailUrl,
      });
    }
  }

  return items;
}

/**
 * Parses raw HTML string from Adobe Stock Contributor portfolio page
 * and extracts { asId, title, downloads, thumbnailUrl }.
 */
export function parseContributorHtml(html: string): ContributorItem[] {
  if (detectContributorPlatform(html) === 'Shutterstock') {
    return parseShutterstockHtml(html);
  }

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
    const cardChunks = html.split(/(?=<div\s+title=)/i);
    for (const chunk of cardChunks) {
      const titleMatch = chunk.match(/<div\s+title="([^"]+)"/i);
      if (!titleMatch) continue;
      const title = titleMatch[1].trim();

      const imgMatch = chunk.match(/_F_(\d+)_/);
      if (!imgMatch) continue;
      const asId = imgMatch[1];
      if (seenIds.has(asId)) continue;
      seenIds.add(asId);

      let downloads = 0;
      const dlMatch =
        chunk.match(/downloads<\/div>\s*<span[^>]*class="[^"]*text-medium[^"]*"[^>]*>([0-9,]+)<\/span>/i) ||
        chunk.match(/<span[^>]*class="[^"]*text-medium[^"]*"[^>]*>([0-9,]+)<\/span>/i);
      if (dlMatch) {
        const parsed = parseInt(dlMatch[1].replace(/,/g, ''), 10);
        if (!isNaN(parsed)) downloads = parsed;
      }

      const srcMatch = chunk.match(/src="([^"]+_F_\d+_[^"]+)"/i);
      const thumbnailUrl = srcMatch ? srcMatch[1] : '';

      items.push({ asId, title, downloads, thumbnailUrl });
    }
  }

  return items;
}
