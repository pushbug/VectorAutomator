/**
 * Serp Author Enricher Engine
 * Extracts contributor names from Adobe Stock detail HTML responses & provides randomized human jitter timing.
 */

export function extractAuthorFromHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // 1. Match primary detail panel author element (from user DOM inspection)
  // <span class="blue science-text" data-t="detail-panel-content-author-name"><a class="blue science-text js-contributor-link" href="..."> NAMPIX </a></span>
  const primaryMatch = html.match(/data-t="detail-panel-content-author-name"[\s\S]*?<a[^>]*class="[^"]*js-contributor-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  if (primaryMatch && primaryMatch[1]) {
    const cleaned = primaryMatch[1].replace(/<[^>]+>/g, '').trim();
    if (cleaned) return cleaned;
  }

  // 2. Match general js-contributor-link
  const linkMatch = html.match(/<a[^>]*class="[^"]*js-contributor-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  if (linkMatch && linkMatch[1]) {
    const cleaned = linkMatch[1].replace(/<[^>]+>/g, '').trim();
    if (cleaned) return cleaned;
  }

  // 3. Match contributor URL slug in href: /contributor/204881684/nampix
  const slugMatch = html.match(/\/contributor\/\d+\/([a-zA-Z0-9_%-]+)/i);
  if (slugMatch && slugMatch[1]) {
    try {
      return decodeURIComponent(slugMatch[1]).replace(/[_-]+/g, ' ').trim();
    } catch {
      return slugMatch[1];
    }
  }

  // 4. Match meta author tag
  const metaMatch = html.match(/<meta[^>]+(?:name|property)="author"[^>]+content="([^"]*)"/i);
  if (metaMatch && metaMatch[1]) {
    return metaMatch[1].trim();
  }

  return '';
}

/**
 * Returns a randomized human-mimicking delay between minMs and maxMs (e.g. 500ms - 1200ms).
 */
export function getHumanJitterDelay(minMs = 500, maxMs = 1200): number {
  const min = Math.max(100, Math.floor(minMs));
  const max = Math.max(min, Math.floor(maxMs));
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export type AuthorEnrichDepth = 'none' | 'top10' | 'top20' | 'all';

/**
 * Slices the target items according to selected user depth.
 */
export function getTargetItemsForEnrichment<T>(items: T[], depth: AuthorEnrichDepth): T[] {
  if (!items || items.length === 0 || depth === 'none') {
    return [];
  }
  if (depth === 'top10') {
    return items.slice(0, 10);
  }
  if (depth === 'top20') {
    return items.slice(0, 20);
  }
  return items; // 'all'
}

/** Watchdog timeout for waiting on detail panel transitions (ms). */
export const WATCHDOG_TIMEOUT_MS = 2500;

/**
 * Returns a stealth navigation delay for the given step index.
 * Base jitter: 500ms - 1200ms uniform random.
 * Smart linger: every 4-6 items (randomized), add 1500ms - 2500ms extra dwell time.
 */
export function getStealthSequenceDelay(stepIndex: number): number {
  const base = getHumanJitterDelay(500, 1200);

  // Smart linger: determine if this step triggers an extended dwell
  // Linger interval is randomized between 4-6 to avoid patterns
  const lingerInterval = 4 + Math.floor(Math.random() * 3); // 4, 5, or 6
  if (stepIndex > 0 && stepIndex % lingerInterval === 0) {
    const lingerExtra = Math.floor(Math.random() * (2500 - 1500 + 1)) + 1500;
    return base + lingerExtra;
  }

  return base;
}

/**
 * Returns an initial entry delay before the first navigation action.
 * Simulates user settling in after opening detail panel (800ms - 1500ms).
 */
export function getEntryDelay(): number {
  return Math.floor(Math.random() * (1500 - 800 + 1)) + 800;
}
