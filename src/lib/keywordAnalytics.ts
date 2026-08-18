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

export interface KeywordAnalyticsToken {
  keyword: string;
  frequency: number;
  totalDownloads: number;
  totalEarnings: number;
  isTopFive: boolean;
  topFiveCount: number;
  score: number;
}

export type KeywordSortMode = 'score' | 'downloads' | 'frequency' | 'alphabetical';

export interface AggregateOptions {
  sortBy?: KeywordSortMode;
}

/**
 * Splits a comma-separated keywords string into clean, trimmed array of words
 */
export function parseKeywordsString(keywordsStr?: string | null): string[] {
  if (!keywordsStr) return [];
  return keywordsStr
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
}

/**
 * Aggregates keyword tokens across multiple reference images,
 * computing frequency, accumulated downloads/earnings, top-5 flags, and composite score.
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

  const tokens: KeywordAnalyticsToken[] = Array.from(tokenMap.values()).map(t => {
    // Composite score giving weight to frequency, downloads velocity, and Top-5 placement
    const score = (t.frequency * 10) + (t.totalDownloads * 2) + (t.topFiveCount * 5) + Math.round(t.totalEarnings);
    return {
      keyword: t.keyword,
      frequency: t.frequency,
      totalDownloads: t.totalDownloads,
      totalEarnings: Number(t.totalEarnings.toFixed(2)),
      isTopFive: t.topFiveCount > 0,
      topFiveCount: t.topFiveCount,
      score
    };
  });

  const sortBy = options.sortBy || 'score';

  return tokens.sort((a, b) => {
    if (sortBy === 'downloads') {
      if (b.totalDownloads !== a.totalDownloads) return b.totalDownloads - a.totalDownloads;
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return a.keyword.localeCompare(b.keyword);
    }
    if (sortBy === 'frequency') {
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      if (b.totalDownloads !== a.totalDownloads) return b.totalDownloads - a.totalDownloads;
      return a.keyword.localeCompare(b.keyword);
    }
    if (sortBy === 'alphabetical') {
      return a.keyword.localeCompare(b.keyword);
    }
    // Default: by composite score
    if (b.score !== a.score) return b.score - a.score;
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
