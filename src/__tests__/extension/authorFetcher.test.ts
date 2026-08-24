import { describe, it, expect } from 'vitest';
import { extractAuthorFromHtml, getHumanJitterDelay, getTargetItemsForEnrichment } from '@/lib/serpAuthorEnricher';

describe('serpAuthorEnricher & Jitter Engine', () => {
  const sampleDetailHtml = `
    <div id="details-wrapper" class="details-wrapper motmot open">
      <div id="details" class="js-details container-relative" data-content_id="507970140">
        <div class="js-actions-panel-container" data-content-id="507970140">
          <div class="details-margin-bottom">
            <h2 class="no-margin js-details-title" data-t="detail-panel-content-title">diverse coworkers</h2>
            <div class="no-margin text-sregular">
              <span class="grey gravel-text" data-t="detail-panel-content-author-by-label">โดย</span>
              <span class="blue science-text" data-t="detail-panel-content-author-name">
                <a class="blue science-text js-contributor-link" href="/th/contributor/204881684/nampix?load_type=author&prev_url=detail">
                  NAMPIX
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  it('extracts author name from exact user sample details HTML', () => {
    const author = extractAuthorFromHtml(sampleDetailHtml);
    expect(author).toBe('NAMPIX');
  });

  it('extracts author name from standalone contributor link tag', () => {
    const html = '<a class="js-contributor-link" href="/contributor/123/studio-creative">Studio Creative</a>';
    const author = extractAuthorFromHtml(html);
    expect(author).toBe('Studio Creative');
  });

  it('falls back to slug in contributor URL if link text is empty', () => {
    const html = '<a class="js-contributor-link" href="/th/contributor/204881684/creative_master_art"></a>';
    const author = extractAuthorFromHtml(html);
    expect(author).toBe('creative master art');
  });

  it('handles empty or malformed HTML gracefully', () => {
    expect(extractAuthorFromHtml('')).toBe('');
    expect(extractAuthorFromHtml('<div>no author here</div>')).toBe('');
  });

  it('generates randomized human jitter delay within bounds', () => {
    for (let i = 0; i < 20; i++) {
      const delay = getHumanJitterDelay(500, 1200);
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(1200);
    }
  });

  it('slices items correctly according to selected depth', () => {
    const dummyItems = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
    expect(getTargetItemsForEnrichment(dummyItems, 'none')).toHaveLength(0);
    expect(getTargetItemsForEnrichment(dummyItems, 'top10')).toHaveLength(10);
    expect(getTargetItemsForEnrichment(dummyItems, 'top20')).toHaveLength(20);
    expect(getTargetItemsForEnrichment(dummyItems, 'all')).toHaveLength(100);
  });
});
