/**
 * Keyword Analytics Engine for Microstock Asset Processing
 * Pure functions for token extraction, deduplication, accumulated metrics aggregation, and ranking.
 */

export interface PortfolioReferenceImage {
  id: string;
  code?: string | null;
  title: string;
  keywords: string;
  totalDownloads?: number;
  totalEarnings?: number;
  filePath?: string;
}

export type KeywordTier = 'star' | 'workhorse' | 'draw_more' | 'dormant' | 'untested';

export interface KeywordAnalyticsToken {
  keyword: string;
  frequency: number;
  totalDownloads: number;
  totalEarnings: number;
  rpi: number; // Revenue Per Image ($/image)
  rpd: number; // Revenue Per Download ($/download)
  tier: KeywordTier;
  isTopFive: boolean;
  topFiveCount: number;
  score: number;
}

export type KeywordSortMode = 'score' | 'earnings' | 'downloads' | 'frequency' | 'rpi' | 'rpd' | 'alphabetical';

export interface AggregateOptions {
  sortBy?: KeywordSortMode;
  sortOrder?: 'asc' | 'desc';
  minFrequency?: number;
  search?: string;
  tier?: string;
}

export interface CoOccurringKeyword {
  keyword: string;
  count: number;
  totalEarnings: number;
  isTopFive: boolean;
}

/**
 * Splits a comma-separated keywords string into clean, trimmed array of words
 */
export function parseKeywordsString(keywordsStr?: string | null): string[] {
  if (!keywordsStr) return [];
  return keywordsStr
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0 && /[a-zA-Z0-9\u0E00-\u0E7F]/.test(k));
}

/**
 * Calculates the tier of a keyword based on its performance metrics
 */
export function calculateKeywordTier(frequency: number, totalDownloads: number, totalEarnings: number): KeywordTier {
  if (totalDownloads === 0 && totalEarnings === 0) {
    return frequency >= 3 ? 'dormant' : 'untested';
  }
  const rpi = frequency > 0 ? totalEarnings / frequency : 0;
  const rpd = totalDownloads > 0 ? totalEarnings / totalDownloads : 0;
  // High Potential Niche / Draw More: Small asset pool (<= 3), proven downloads, high RPI (>= $15/image)
  if (frequency <= 3 && totalDownloads >= 3 && rpi >= 15) {
    return 'draw_more';
  }
  if (rpi >= 1.5 || rpd >= 1.0 || totalEarnings >= 20 || totalDownloads >= 25) {
    return 'star';
  }
  return 'workhorse';
}

/**
 * Computes top co-occurring keywords across artworks that share the primary keyword,
 * ranked by joint earnings and co-occurrence frequency.
 */
export function calculateCoOccurringKeywords(
  images: PortfolioReferenceImage[],
  primaryKeyword: string,
  limit: number = 10
): CoOccurringKeyword[] {
  if (!images || images.length === 0 || !primaryKeyword) return [];
  const normalizedPrimary = primaryKeyword.trim().toLowerCase();

  const map = new Map<string, { keyword: string; count: number; totalEarnings: number; topFiveCount: number }>();

  for (const img of images) {
    const words = parseKeywordsString(img.keywords);
    const normalizedWords = words.map(w => w.toLowerCase());

    // Only process images containing the primary keyword
    if (!normalizedWords.includes(normalizedPrimary)) continue;

    const imgEarnings = typeof img.totalEarnings === 'number' ? Math.max(0, img.totalEarnings) : 0;
    const seenInImage = new Set<string>();

    normalizedWords.forEach((word, index) => {
      if (!word || word === normalizedPrimary) return;
      const isTop5 = index < 5;

      if (!map.has(word)) {
        map.set(word, { keyword: word, count: 0, totalEarnings: 0, topFiveCount: 0 });
      }

      const entry = map.get(word)!;
      if (!seenInImage.has(word)) {
        seenInImage.add(word);
        entry.count += 1;
        entry.totalEarnings += imgEarnings;
      }
      if (isTop5) {
        entry.topFiveCount += 1;
      }
    });
  }

  return Array.from(map.values())
    .map(e => ({
      keyword: e.keyword,
      count: e.count,
      totalEarnings: Number(e.totalEarnings.toFixed(2)),
      isTopFive: e.topFiveCount > 0,
    }))
    .sort((a, b) => {
      if (b.totalEarnings !== a.totalEarnings) return b.totalEarnings - a.totalEarnings;
      if (b.count !== a.count) return b.count - a.count;
      return a.keyword.localeCompare(b.keyword);
    })
    .slice(0, limit);
}

/**
 * Aggregates keyword tokens across multiple reference images,
 * computing frequency, accumulated downloads/earnings, RPI, RPD, tiers, top-5 flags, and composite score.
 */
export function aggregateKeywordTokens(
  images: PortfolioReferenceImage[],
  options: AggregateOptions = {}
): KeywordAnalyticsToken[] {
  if (!images || images.length === 0) return [];

  const tokenMap = new Map<string, {
    keyword: string;
    frequency: number;
    totalDownloads: number;
    totalEarnings: number;
    topFiveCount: number;
  }>();

  for (const img of images) {
    const rawWords = parseKeywordsString(img.keywords);
    const seenInImage = new Set<string>();
    const imgDownloads = typeof img.totalDownloads === 'number' ? Math.max(0, img.totalDownloads) : 0;
    const imgEarnings = typeof img.totalEarnings === 'number' ? Math.max(0, img.totalEarnings) : 0;

    rawWords.forEach((word, index) => {
      const normalized = word.toLowerCase();
      if (!normalized) return;

      const isTop5 = index < 5;

      if (!tokenMap.has(normalized)) {
        tokenMap.set(normalized, {
          keyword: normalized,
          frequency: 0,
          totalDownloads: 0,
          totalEarnings: 0,
          topFiveCount: 0
        });
      }

      const token = tokenMap.get(normalized)!;

      // Count each image once per unique keyword token
      if (!seenInImage.has(normalized)) {
        seenInImage.add(normalized);
        token.frequency += 1;
        token.totalDownloads += imgDownloads;
        token.totalEarnings += imgEarnings;
      }

      if (isTop5) {
        token.topFiveCount += 1;
      }
    });
  }

  let tokens: KeywordAnalyticsToken[] = Array.from(tokenMap.values()).map(t => {
    const score = (t.frequency * 10) + (t.totalDownloads * 2) + (t.topFiveCount * 5) + Math.round(t.totalEarnings);
    const totalEarnings = Number(t.totalEarnings.toFixed(2));
    const rpi = t.frequency > 0 ? Number((totalEarnings / t.frequency).toFixed(2)) : 0;
    const rpd = t.totalDownloads > 0 ? Number((totalEarnings / t.totalDownloads).toFixed(2)) : 0;
    const tier = calculateKeywordTier(t.frequency, t.totalDownloads, totalEarnings);

    return {
      keyword: t.keyword,
      frequency: t.frequency,
      totalDownloads: t.totalDownloads,
      totalEarnings,
      rpi,
      rpd,
      tier,
      isTopFive: t.topFiveCount > 0,
      topFiveCount: t.topFiveCount,
      score
    };
  });

  // Optional filtering by min frequency
  if (options.minFrequency && options.minFrequency > 1) {
    tokens = tokens.filter(t => t.frequency >= options.minFrequency!);
  }

  // Optional search filtering
  if (options.search && options.search.trim()) {
    const query = options.search.trim().toLowerCase();
    tokens = tokens.filter(t => t.keyword.includes(query));
  }

  // Optional tier filtering
  if (options.tier && options.tier !== 'all') {
    tokens = tokens.filter(t => t.tier === options.tier);
  }

  const sortBy = options.sortBy || 'score';
  const sortOrder = options.sortOrder || 'desc';
  const orderMultiplier = sortOrder === 'asc' ? -1 : 1;

  return tokens.sort((a, b) => {
    if (sortBy === 'earnings') {
      if (b.totalEarnings !== a.totalEarnings) return (b.totalEarnings - a.totalEarnings) * orderMultiplier;
      if (b.totalDownloads !== a.totalDownloads) return (b.totalDownloads - a.totalDownloads) * orderMultiplier;
      return a.keyword.localeCompare(b.keyword);
    }
    if (sortBy === 'downloads') {
      if (b.totalDownloads !== a.totalDownloads) return (b.totalDownloads - a.totalDownloads) * orderMultiplier;
      if (b.frequency !== a.frequency) return (b.frequency - a.frequency) * orderMultiplier;
      return a.keyword.localeCompare(b.keyword);
    }
    if (sortBy === 'frequency') {
      if (b.frequency !== a.frequency) return (b.frequency - a.frequency) * orderMultiplier;
      if (b.totalDownloads !== a.totalDownloads) return (b.totalDownloads - a.totalDownloads) * orderMultiplier;
      return a.keyword.localeCompare(b.keyword);
    }
    if (sortBy === 'rpi') {
      if (b.rpi !== a.rpi) return (b.rpi - a.rpi) * orderMultiplier;
      if (b.totalEarnings !== a.totalEarnings) return (b.totalEarnings - a.totalEarnings) * orderMultiplier;
      return a.keyword.localeCompare(b.keyword);
    }
    if (sortBy === 'rpd') {
      if (b.rpd !== a.rpd) return (b.rpd - a.rpd) * orderMultiplier;
      if (b.totalEarnings !== a.totalEarnings) return (b.totalEarnings - a.totalEarnings) * orderMultiplier;
      return a.keyword.localeCompare(b.keyword);
    }
    if (sortBy === 'alphabetical') {
      return (orderMultiplier === 1 ? 1 : -1) * a.keyword.localeCompare(b.keyword);
    }
    // Default: by composite score
    if (b.score !== a.score) return (b.score - a.score) * orderMultiplier;
    return a.keyword.localeCompare(b.keyword);
  });
}

/**
 * Safely merges new keywords into existing active asset keywords.
 * Enforces strict case-insensitive deduplication, preserves existing keywords without displacement in 'append' mode,
 * and allows working candidate pool up to soft limit (default 100 words).
 */
export function mergeKeywords(
  currentKeywords: string | string[],
  newKeywords: string | string[],
  maxLimit: number = 100,
  mode: 'append' | 'replace' = 'append'
): {
  mergedString: string;
  mergedArray: string[];
  addedCount: number;
  isCapped: boolean;
  isOverStockLimit: boolean;
  count: number;
} {
  const currentList = (Array.isArray(currentKeywords)
    ? currentKeywords
    : parseKeywordsString(currentKeywords)).map(k => k.trim().toLowerCase()).filter(Boolean);

  const incomingList = (Array.isArray(newKeywords)
    ? newKeywords
    : parseKeywordsString(newKeywords)).map(k => k.trim().toLowerCase()).filter(Boolean);

  if (mode === 'replace') {
    const uniqueIncoming: string[] = [];
    const seen = new Set<string>();
    for (const word of incomingList) {
      if (word && !seen.has(word)) {
        seen.add(word);
        uniqueIncoming.push(word);
      }
    }
    const finalArray = uniqueIncoming.slice(0, maxLimit);
    return {
      mergedString: finalArray.join(', '),
      mergedArray: finalArray,
      addedCount: finalArray.length,
      isCapped: uniqueIncoming.length > maxLimit,
      isOverStockLimit: finalArray.length > 50,
      count: finalArray.length,
    };
  }

  const existingSet = new Set(currentList);
  const uniqueIncoming: string[] = [];
  const incomingSeen = new Set<string>();

  for (const word of incomingList) {
    if (word && !existingSet.has(word) && !incomingSeen.has(word)) {
      incomingSeen.add(word);
      uniqueIncoming.push(word);
    }
  }

  const combined = [...currentList, ...uniqueIncoming];
  const isCapped = combined.length > maxLimit;
  const finalArray = isCapped ? combined.slice(0, maxLimit) : combined;
  const addedCount = Math.max(0, finalArray.length - currentList.length);

  return {
    mergedString: finalArray.join(', '),
    mergedArray: finalArray,
    addedCount,
    isCapped,
    isOverStockLimit: finalArray.length > 50,
    count: finalArray.length,
  };
}
