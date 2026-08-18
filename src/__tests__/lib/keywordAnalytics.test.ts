import { describe, it, expect } from 'vitest';
import {
  parseKeywordsString,
  aggregateKeywordTokens,
  mergeKeywords,
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
});
