import { describe, it, expect } from 'vitest';

describe('Adobe Stock DOM Parser Logic', () => {
  // Exact sample HTML snippet provided by the user
  const userSampleHtml = `
    <div id="mosaic-container" class="padding-xlarge container--focus">
      <div class="list-thumbs-container">
        <div id="search-results" class="clear-fix" data-mosaic-initialized="true" style="width: 100%;">
          <div class="search-result-cell small-bottom-spacing js-search-result-cell ftl-thumb-mosaic js-hover-container" data-content-id="507970140" data-ingest-content-id="507970140" data-t="search-result-cell" data-comp-url="https://stock.adobe.com/th/Download/Watermarked/507970140" data-ingest-position="1,1">
            <div class="thumb-frame">
              <a name="507970140" class="js-search-result-thumbnail non-js-link" href="https://stock.adobe.com/th/images/diverse-coworkers-working-together/507970140" data-content-id="507970140">
                <meta itemprop="name" content="diverse coworkers working together in boardroom, brainstorming, discussing and analyzing and planning business strategy.">
                <meta itemprop="thumbnailUrl" content="https://t4.ftcdn.net/jpg/05/07/97/01/360_F_507970140_mWRJUOHJcwCe20pGEYIpNjF8qUAvqjYd.jpg">
                <picture>
                  <img src="https://t4.ftcdn.net/jpg/05/07/97/01/360_F_507970140_mWRJUOHJcwCe20pGEYIpNjF8qUAvqjYd.jpg" alt="diverse coworkers working together">
                </picture>
              </a>
            </div>
          </div>

          <div class="search-result-cell small-bottom-spacing js-search-result-cell ftl-thumb-mosaic js-hover-container" data-content-id="295563207" data-ingest-content-id="295563207" data-t="search-result-cell">
            <div class="thumb-frame">
              <a name="295563207" class="js-search-result-thumbnail non-js-link" href="https://stock.adobe.com/th/images/double-exposure-image-of-many-business-people/295563207" data-content-id="295563207">
                <meta itemprop="name" content="Double exposure image of many business people conference group meeting.">
                <meta itemprop="thumbnailUrl" content="https://t3.ftcdn.net/jpg/02/95/56/32/360_F_295563207_VnAoiTHgS9bk2BNwzuFiaAHnaL3uM2Wh.jpg">
                <picture>
                  <img src="https://t3.ftcdn.net/jpg/02/95/56/32/360_F_295563207_VnAoiTHgS9bk2BNwzuFiaAHnaL3uM2Wh.jpg" alt="Double exposure image">
                </picture>
              </a>
            </div>
          </div>

          <!-- Lazy Loaded Item Example from user HTML -->
          <div class="search-result-cell small-bottom-spacing js-search-result-cell ftl-thumb-mosaic" data-content-id="255859812">
            <div class="thumb-frame">
              <a name="255859812" class="js-search-result-thumbnail non-js-link" href="https://stock.adobe.com/th/images/co-working-business-team/255859812">
                <meta itemprop="name" content="Co-working Business Team Consulting meeting Planning Strategy">
                <picture>
                  <img src="/v1/pics/placeholders/spacer.gif" data-lazy="https://t3.ftcdn.net/jpg/02/55/85/98/360_F_255859812_Z3HUMQtpP48HVaiWBTR8IbUPlPxOuBxK.jpg" alt="Co-working Business Team">
                </picture>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  function parseHtml(htmlStr: string, pageNumber = 1, query = 'business') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, 'text/html');
    const cellEls = doc.querySelectorAll('.search-result-cell, [data-content-id]');
    const items: Array<{
      rank: number;
      assetId: string;
      title: string;
      thumbnailUrl: string;
      detailUrl: string;
    }> = [];
    const seenIds = new Set<string>();

    cellEls.forEach((cell) => {
      let assetId = cell.getAttribute('data-content-id') || cell.getAttribute('data-ingest-content-id');
      const linkEl = cell.querySelector('a.js-search-result-thumbnail, a[href*="/images/"], a[data-content-id]') as HTMLAnchorElement | null;

      if (!assetId && linkEl) {
        assetId = linkEl.getAttribute('data-content-id') || linkEl.getAttribute('name');
      }

      if (!assetId || seenIds.has(assetId)) {
        return;
      }
      seenIds.add(assetId);

      const metaTitle = cell.querySelector('meta[itemprop="name"]')?.getAttribute('content');
      const imgEl = cell.querySelector('img') as HTMLImageElement | null;
      const title = metaTitle || imgEl?.alt || linkEl?.title || `Asset #${assetId}`;

      const metaThumb = cell.querySelector('meta[itemprop="thumbnailUrl"]')?.getAttribute('content');
      const lazyThumb = imgEl?.getAttribute('data-lazy');
      const srcThumb = imgEl?.getAttribute('src');
      const thumbnailUrl = metaThumb || lazyThumb || (srcThumb && !srcThumb.includes('spacer.gif') ? srcThumb : '');

      const detailUrl = linkEl?.getAttribute('href') || `https://stock.adobe.com/images/${assetId}`;
      const rank = (pageNumber - 1) * 100 + items.length + 1;

      items.push({
        rank,
        assetId,
        title: title.trim(),
        thumbnailUrl: thumbnailUrl || '',
        detailUrl,
      });
    });

    return {
      keyword: query,
      pageNumber,
      totalItems: items.length,
      items,
    };
  }

  it('correctly extracts Page 1 Asset IDs, Titles, and Ranks from user HTML', () => {
    const res = parseHtml(userSampleHtml, 1, 'business');
    expect(res.totalItems).toBe(3);
    expect(res.items[0]).toEqual({
      rank: 1,
      assetId: '507970140',
      title: 'diverse coworkers working together in boardroom, brainstorming, discussing and analyzing and planning business strategy.',
      thumbnailUrl: 'https://t4.ftcdn.net/jpg/05/07/97/01/360_F_507970140_mWRJUOHJcwCe20pGEYIpNjF8qUAvqjYd.jpg',
      detailUrl: 'https://stock.adobe.com/th/images/diverse-coworkers-working-together/507970140',
    });
    expect(res.items[1].assetId).toBe('295563207');
    expect(res.items[1].rank).toBe(2);
  });

  it('extracts lazy-loaded image thumbnail from data-lazy attribute', () => {
    const res = parseHtml(userSampleHtml, 1, 'business');
    const lazyItem = res.items.find((i) => i.assetId === '255859812');
    expect(lazyItem).toBeDefined();
    expect(lazyItem?.thumbnailUrl).toBe('https://t3.ftcdn.net/jpg/02/55/85/98/360_F_255859812_Z3HUMQtpP48HVaiWBTR8IbUPlPxOuBxK.jpg');
  });

  it('calculates Page 2 global rank offset accurately', () => {
    const res = parseHtml(userSampleHtml, 2, 'business');
    expect(res.items[0].rank).toBe(101);
    expect(res.items[1].rank).toBe(102);
    expect(res.items[2].rank).toBe(103);
  });
});
