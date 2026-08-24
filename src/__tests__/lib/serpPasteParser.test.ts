import { describe, it, expect } from 'vitest';
import { parseSerpClipboardText } from '@/lib/serpPasteParser';

describe('parseSerpClipboardText', () => {
  it('parses empty or whitespace input gracefully', () => {
    const res = parseSerpClipboardText('');
    expect(res.items).toHaveLength(0);
    expect(res.totalItems).toBe(0);
    expect(res.keyword).toBe('untitled');
    expect(res.pageNumber).toBe(1);
  });

  it('parses JSON format array with page and rank offsets', () => {
    const jsonStr = JSON.stringify([
      {
        keyword: 'infographic 2',
        page: 2,
        rank: 101,
        assetId: '684583478',
        title: '2 step infographic template vector element',
        author: 'Haris',
        thumbnailUrl: 'https://t4.ftcdn.net/jpg/06/84/58/34/360_F_684583478.jpg',
        detailUrl: 'https://stock.adobe.com/th/images/.../684583478',
      },
      {
        keyword: 'infographic 2',
        page: 2,
        rank: 102,
        assetId: '507970140',
        title: 'diverse coworkers working together in boardroom',
        author: 'John Doe',
      },
    ]);

    const res = parseSerpClipboardText(jsonStr);
    expect(res.keyword).toBe('infographic 2');
    expect(res.pageNumber).toBe(2);
    expect(res.totalItems).toBe(2);
    expect(res.items[0]).toEqual({
      rank: 101,
      assetId: '684583478',
      title: '2 step infographic template vector element',
      author: 'Haris',
      thumbnailUrl: 'https://t4.ftcdn.net/jpg/06/84/58/34/360_F_684583478.jpg',
      detailUrl: 'https://stock.adobe.com/th/images/.../684583478',
    });
    expect(res.items[1].rank).toBe(102);
  });

  it('parses TSV formatted table lines from extension export', () => {
    const tsvData = [
      'Keyword\tPage\tRank\tAsset ID\tTitle\tThumbnail\tDetail URL\tAuthor',
      'business\t1\t1\t507970140\tdiverse coworkers working together\thttps://t4.ftcdn.net/507970140.jpg\thttps://stock.adobe.com/507970140\tStudio A',
      'business\t1\t2\t295563207\tDouble exposure image of business people\thttps://t3.ftcdn.net/295563207.jpg\thttps://stock.adobe.com/295563207\tStudio B',
    ].join('\n');

    const res = parseSerpClipboardText(tsvData);
    expect(res.keyword).toBe('business');
    expect(res.pageNumber).toBe(1);
    expect(res.totalItems).toBe(2);
    expect(res.items[0].assetId).toBe('507970140');
    expect(res.items[0].rank).toBe(1);
    expect(res.items[0].title).toBe('diverse coworkers working together');
    expect(res.items[0].author).toBe('Studio A');
    expect(res.items[1].assetId).toBe('295563207');
    expect(res.items[1].rank).toBe(2);
  });

  it('parses Page 2 TSV correctly calculating rank offsets', () => {
    const tsvPage2 = [
      'Keyword\tPage\tRank\tAsset ID\tTitle\tThumbnail\tDetail URL\tAuthor',
      'infographic 2\t2\t101\t684583478\t2 step infographic template\thttps://t4.ftcdn.net/684583478.jpg\thttps://stock.adobe.com/684583478\tHaris',
    ].join('\n');

    const res = parseSerpClipboardText(tsvPage2);
    expect(res.keyword).toBe('infographic 2');
    expect(res.pageNumber).toBe(2);
    expect(res.items[0].rank).toBe(101);
  });

  it('parses CSV lines with commas and quotation marks', () => {
    const csvData = [
      'Rank,Asset ID,Title,Thumbnail,Detail URL,Author',
      '1,507970140,"diverse coworkers, brainstorming and planning",https://t4.ftcdn.net/507970140.jpg,https://stock.adobe.com/507970140,Studio A',
      '2,295563207,"Double exposure, city office",https://t3.ftcdn.net/295563207.jpg,https://stock.adobe.com/295563207,Studio B',
    ].join('\n');

    const res = parseSerpClipboardText(csvData, 'business_csv');
    expect(res.keyword).toBe('business_csv');
    expect(res.totalItems).toBe(2);
    expect(res.items[0].assetId).toBe('507970140');
    expect(res.items[0].title).toBe('diverse coworkers, brainstorming and planning');
    expect(res.items[1].assetId).toBe('295563207');
  });

  it('parses clean TSV layout without URL columns (Keyword, Page, Rank, AssetId, Author, Title)', () => {
    const cleanTsv = [
      'Keyword\tPage\tRank\tAsset ID\tAuthor\tTitle',
      'cost\t1\t1\t157502998\t\tBusinessman calculator and cost',
      'cost\t1\t2\t528459639\tCagkan\tCost increase and inflation concept',
      'cost\t1\t3\t551408989\ttippapatt\tCost and quality control strategy',
    ].join('\n');

    const res = parseSerpClipboardText(cleanTsv);
    expect(res.keyword).toBe('cost');
    expect(res.pageNumber).toBe(1);
    expect(res.totalItems).toBe(3);
    expect(res.items[0].assetId).toBe('157502998');
    expect(res.items[0].author).toBeUndefined(); // empty author
    expect(res.items[0].title).toBe('Businessman calculator and cost');
    expect(res.items[0].thumbnailUrl).toBeUndefined();
    expect(res.items[0].detailUrl).toBeUndefined();
    expect(res.items[1].author).toBe('Cagkan');
    expect(res.items[1].title).toBe('Cost increase and inflation concept');
    expect(res.items[2].author).toBe('tippapatt');
  });
});
