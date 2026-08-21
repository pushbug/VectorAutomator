import { describe, it, expect } from 'vitest';
import {
  parseKeywordsString,
  aggregateKeywordTokens,
  mergeKeywords,
  calculateKeywordTier,
  calculateCoOccurringKeywords,
  PortfolioReferenceImage
} from '@/lib/keywordAnalytics';

describe('Keyword Analytics Engine (UT-LIB-KEYWORD-ANALYTICS-01)', () => {
  describe('parseKeywordsString', () => {
    it('handles empty or null input cleanly', () => {
      expect(parseKeywordsString('')).toEqual([]);
      expect(parseKeywordsString(null)).toEqual([]);
      expect(parseKeywordsString(undefined)).toEqual([]);
    });

    it('splits comma separated keywords and trims whitespace', () => {
      const input = 'business , infographic,   timeline , vector, ';
      expect(parseKeywordsString(input)).toEqual(['business', 'infographic', 'timeline', 'vector']);
    });
  });

  describe('aggregateKeywordTokens', () => {
    const sampleImages: PortfolioReferenceImage[] = [
      {
        id: 'img1',
        title: 'Business Infographic 4 Steps',
        keywords: 'infographic, business, step, diagram, template, design, chart',
        totalDownloads: 45,
        totalEarnings: 18.50
      },
      {
        id: 'img2',
        title: 'Corporate Timeline Infographic',
        keywords: 'timeline, milestone, business, infographic, roadmap, planning',
        totalDownloads: 20,
        totalEarnings: 8.00
      },
      {
        id: 'img3',
        title: 'Arrow Step Process',
        keywords: 'arrow, step, business, marketing, modern',
        totalDownloads: 10,
        totalEarnings: 4.20
      }
    ];

    it('returns empty array when images list is empty', () => {
      expect(aggregateKeywordTokens([])).toEqual([]);
    });

    it('computes frequency, accumulated downloads, earnings, and top 5 flags accurately', () => {
      const tokens = aggregateKeywordTokens(sampleImages);
      
      // "business" is present in all 3 images (in Top 5 for img1, img2, and img3)
      const businessToken = tokens.find(t => t.keyword === 'business');
      expect(businessToken).toBeDefined();
      expect(businessToken?.frequency).toBe(3);
      expect(businessToken?.totalDownloads).toBe(75); // 45 + 20 + 10
      expect(businessToken?.totalEarnings).toBe(30.70); // 18.50 + 8.00 + 4.20
      expect(businessToken?.isTopFive).toBe(true);
      expect(businessToken?.topFiveCount).toBe(3);

      // "infographic" is present in 2 images (img1, img2)
      const infographicToken = tokens.find(t => t.keyword === 'infographic');
      expect(infographicToken).toBeDefined();
      expect(infographicToken?.frequency).toBe(2);
      expect(infographicToken?.totalDownloads).toBe(65); // 45 + 20
      expect(infographicToken?.totalEarnings).toBe(26.50);
      expect(infographicToken?.isTopFive).toBe(true);
      expect(infographicToken?.topFiveCount).toBe(2);

      // "design" is in img1 at index 5 (6th position -> not top 5)
      const designToken = tokens.find(t => t.keyword === 'design');
      expect(designToken).toBeDefined();
      expect(designToken?.isTopFive).toBe(false);
      expect(designToken?.topFiveCount).toBe(0);
    });

    it('sorts by downloads when requested', () => {
      const tokens = aggregateKeywordTokens(sampleImages, { sortBy: 'downloads' });
      expect(tokens[0].keyword).toBe('business'); // 75 downloads
      expect(tokens[1].keyword).toBe('infographic'); // 65 downloads
      expect(tokens[2].totalDownloads).toBeLessThanOrEqual(tokens[1].totalDownloads);
    });

    it('sorts by frequency when requested', () => {
      const tokens = aggregateKeywordTokens(sampleImages, { sortBy: 'frequency' });
      expect(tokens[0].keyword).toBe('business'); // frequency 3
      expect(tokens[0].frequency).toBe(3);
    });

    it('sorts alphabetically when requested', () => {
      const tokens = aggregateKeywordTokens(sampleImages, { sortBy: 'alphabetical' });
      expect(tokens[0].keyword).toBe('arrow');
    });

    it('sorts by earnings and calculates RPI and RPD accurately', () => {
      const tokens = aggregateKeywordTokens(sampleImages, { sortBy: 'earnings' });
      expect(tokens[0].keyword).toBe('business'); // $30.70
      expect(tokens[0].rpi).toBe(10.23); // 30.70 / 3
      expect(tokens[0].rpd).toBe(0.41); // 30.70 / 75
      expect(tokens[0].tier).toBe('star');
    });

    it('filters by search term and minFrequency', () => {
      const filtered = aggregateKeywordTokens(sampleImages, { search: 'time', minFrequency: 1 });
      expect(filtered.length).toBe(1);
      expect(filtered[0].keyword).toBe('timeline');

      const freqFiltered = aggregateKeywordTokens(sampleImages, { minFrequency: 2 });
      expect(freqFiltered.every(t => t.frequency >= 2)).toBe(true);
    });

    it('assigns dormant and untested tiers correctly for zero sales assets', () => {
      const dormantImages: PortfolioReferenceImage[] = [
        { id: '1', title: 'A', keywords: 'nichekeyword', totalDownloads: 0, totalEarnings: 0 },
        { id: '2', title: 'B', keywords: 'nichekeyword', totalDownloads: 0, totalEarnings: 0 },
        { id: '3', title: 'C', keywords: 'nichekeyword', totalDownloads: 0, totalEarnings: 0 },
        { id: '4', title: 'D', keywords: 'rarekeyword', totalDownloads: 0, totalEarnings: 0 },
      ];
      const tokens = aggregateKeywordTokens(dormantImages);
      const niche = tokens.find(t => t.keyword === 'nichekeyword');
      const rare = tokens.find(t => t.keyword === 'rarekeyword');
      expect(niche?.tier).toBe('dormant');
      expect(rare?.tier).toBe('untested');
    });

    it('identifies draw_more tier for high RPI small asset pool keywords', () => {
      expect(calculateKeywordTier(2, 10, 40.0)).toBe('draw_more'); // RPI = 20, freq = 2
      expect(calculateKeywordTier(10, 100, 200.0)).toBe('star'); // high assets -> star
      expect(calculateKeywordTier(5, 5, 2.5)).toBe('workhorse');
    });

    it('handles images with 0 downloads gracefully without failing', () => {
      const zeroImages: PortfolioReferenceImage[] = [
        { id: '1', title: 'A', keywords: 'apple, banana', totalDownloads: 0 },
        { id: '2', title: 'B', keywords: 'banana, cherry', totalDownloads: 0 }
      ];
      const tokens = aggregateKeywordTokens(zeroImages);
      expect(tokens.length).toBe(3);
      expect(tokens.find(t => t.keyword === 'banana')?.frequency).toBe(2);
      expect(tokens.find(t => t.keyword === 'banana')?.totalDownloads).toBe(0);
    });
  });

  describe('mergeKeywords', () => {
    it('merges new keywords without duplicates and preserves existing keywords intact', () => {
      const current = 'business, chart, design';
      const incoming = ['diagram', 'business', 'timeline'];
      
      const result = mergeKeywords(current, incoming);
      expect(result.mergedArray).toEqual(['business', 'chart', 'design', 'diagram', 'timeline']);
      expect(result.mergedString).toBe('business, chart, design, diagram, timeline');
      expect(result.addedCount).toBe(2); // diagram, timeline
      expect(result.isCapped).toBe(false);
      expect(result.isOverStockLimit).toBe(false);
    });

    it('handles case-insensitive duplicate deduplication', () => {
      const current = 'Business, INFOGRAPHIC';
      const incoming = ['business', 'Infographic', 'vector'];
      
      const result = mergeKeywords(current, incoming);
      expect(result.mergedArray).toEqual(['business', 'infographic', 'vector']);
      expect(result.addedCount).toBe(1); // only 'vector' was new
    });

    it('enforces maxLimit cap strictly and preserves existing words in append mode', () => {
      const current = Array.from({ length: 48 }, (_, i) => `word${i}`);
      const incoming = ['new1', 'new2', 'new3', 'new4'];
      
      const result = mergeKeywords(current, incoming, 50);
      expect(result.mergedArray.length).toBe(50);
      expect(result.isCapped).toBe(true);
      expect(result.addedCount).toBe(2);
      // All 48 initial words are still preserved
      for (let i = 0; i < 48; i++) {
        expect(result.mergedArray).toContain(`word${i}`);
      }
    });

    it('flags isOverStockLimit when merged count exceeds 50', () => {
      const current = Array.from({ length: 45 }, (_, i) => `word${i}`);
      const incoming = Array.from({ length: 15 }, (_, i) => `extra${i}`);

      const result = mergeKeywords(current, incoming, 100);
      expect(result.count).toBe(60);
      expect(result.isOverStockLimit).toBe(true);
      expect(result.isCapped).toBe(false);
    });

    it('supports replace mode correctly', () => {
      const current = 'old1, old2, old3';
      const incoming = ['brandnew1', 'brandnew2'];

      const result = mergeKeywords(current, incoming, 100, 'replace');
      expect(result.mergedArray).toEqual(['brandnew1', 'brandnew2']);
      expect(result.mergedArray).not.toContain('old1');
      expect(result.isOverStockLimit).toBe(false);
    });
  });

  describe('calculateCoOccurringKeywords (UT-LIB-KW-RECIPE-01)', () => {
    const recipeImages: PortfolioReferenceImage[] = [
      {
        id: 'img1',
        title: 'Semi Circle Infographic',
        keywords: 'semi, circle, infographic, diagram, steps',
        totalDownloads: 50,
        totalEarnings: 80.0
      },
      {
        id: 'img2',
        title: 'Semi Timeline Chart',
        keywords: 'semi, timeline, infographic, roadmap',
        totalDownloads: 30,
        totalEarnings: 45.0
      },
      {
        id: 'img3',
        title: 'Unrelated Corporate Vector',
        keywords: 'finance, business, corporate',
        totalDownloads: 10,
        totalEarnings: 15.0
      }
    ];

    it('calculates top co-occurring keywords ranked by joint earnings and frequency', () => {
      const result = calculateCoOccurringKeywords(recipeImages, 'semi', 5);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(r => r.keyword === 'semi')).toBe(false); // primary is excluded

      // "infographic" is present in both semi images (img1 + img2 = 80 + 45 = 125.0)
      const infographic = result.find(r => r.keyword === 'infographic');
      expect(infographic).toBeDefined();
      expect(infographic?.count).toBe(2);
      expect(infographic?.totalEarnings).toBe(125.0);

      // "circle" is in img1 ($80.0)
      const circle = result.find(r => r.keyword === 'circle');
      expect(circle).toBeDefined();
      expect(circle?.totalEarnings).toBe(80.0);
    });

    it('returns empty array when images or primaryKeyword is empty', () => {
      expect(calculateCoOccurringKeywords([], 'semi')).toEqual([]);
      expect(calculateCoOccurringKeywords(recipeImages, '')).toEqual([]);
    });
  });
});
