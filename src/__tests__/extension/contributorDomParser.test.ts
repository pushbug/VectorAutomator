import { describe, it, expect } from 'vitest';
import { parseContributorHtml, parseTsvString } from '@/lib/contributorParser';

describe('UT-EXT-CONTRIBUTOR-DOM-01: Adobe Contributor Portfolio Parser', () => {
  it('correctly extracts asId, title, and downloads from real Adobe Contributor HTML card', () => {
    const sampleHtml = `
      <div data-t="portfolio-page-assets-list">
        <div title="10 Important historical event timeline infographic brochure." class="left">
          <div class="margin-small content-thumbnail-wrapper" data-t="portfolio-single-asset-wrapper">
            <div class="content-thumbnail grey alabaster v-align-wrapper border-radius-4">
              <img src="https://as2.ftcdn.net/jpg/05/69/02/95/220_F_569029521_nvb43XQC5cbHQVo5saCEfXxjjGpPZf8d.jpg" class="content-thumbnail__img c-align" alt="">
            </div>
            <div class="padding-medium premium-type-box flex flex-justify-space-between">
              <div class="container-inline-block vertical-align-top flex-even">
                <div class="grey mountain-mist-text text-up text-small">downloads</div>
                <span class="text-medium light">1,410</span>
              </div>
            </div>
          </div>
        </div>
        <div title="Workflow lines infographic. The pie chart is divided into 6 parts." class="left">
          <div class="margin-small content-thumbnail-wrapper" data-t="portfolio-single-asset-wrapper">
            <div class="content-thumbnail grey alabaster v-align-wrapper border-radius-4">
              <img src="https://as2.ftcdn.net/jpg/06/36/37/61/220_F_636376104_D23xAzwQxqzftwPKegxYHtrR33zKpwPw.jpg" class="content-thumbnail__img c-align" alt="">
            </div>
            <div class="padding-medium premium-type-box flex flex-justify-space-between">
              <div class="container-inline-block vertical-align-top flex-even">
                <div class="grey mountain-mist-text text-up text-small">downloads</div>
                <span class="text-medium light">1,399</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const items = parseContributorHtml(sampleHtml);
    expect(items).toHaveLength(2);

    expect(items[0]).toEqual({
      asId: '569029521',
      title: '10 Important historical event timeline infographic brochure.',
      downloads: 1410,
      thumbnailUrl: 'https://as2.ftcdn.net/jpg/05/69/02/95/220_F_569029521_nvb43XQC5cbHQVo5saCEfXxjjGpPZf8d.jpg',
    });

    expect(items[1]).toEqual({
      asId: '636376104',
      title: 'Workflow lines infographic. The pie chart is divided into 6 parts.',
      downloads: 1399,
      thumbnailUrl: 'https://as2.ftcdn.net/jpg/06/36/37/61/220_F_636376104_D23xAzwQxqzftwPKegxYHtrR33zKpwPw.jpg',
    });
  });

  it('handles cards with 0 downloads or without download badge gracefully', () => {
    const htmlWithZero = `
      <div title="New brand modern abstract background." class="left">
        <img src="https://as2.ftcdn.net/jpg/09/99/88/77/220_F_999887766_abc.jpg" />
        <span class="text-medium">0</span>
      </div>
    `;
    const items = parseContributorHtml(htmlWithZero);
    expect(items).toHaveLength(1);
    expect(items[0].asId).toBe('999887766');
    expect(items[0].title).toBe('New brand modern abstract background.');
    expect(items[0].downloads).toBe(0);
  });

  it('deduplicates duplicate asset IDs in the same DOM tree', () => {
    const duplicateHtml = `
      <div title="Test Title 1" class="left">
        <img src="https://as2.ftcdn.net/jpg/01/23/45/67/220_F_123456789_xxx.jpg" />
      </div>
      <div title="Test Title 2" class="left">
        <img src="https://as2.ftcdn.net/jpg/01/23/45/67/220_F_123456789_xxx.jpg" />
      </div>
    `;
    const items = parseContributorHtml(duplicateHtml);
    expect(items).toHaveLength(1);
    expect(items[0].asId).toBe('123456789');
  });

  it('UT-EXT-CONTRIBUTOR-NOMINATE-01: accurately distinguishes between nominate-eligible and non-eligible assets from real Adobe Contributor DOM', () => {
    // Exact user HTML snippet containing 1 non-eligible (buyout_toggle__hidden) and 2 eligible (buyout_toggle)
    const userHtml = `
      <div data-t="portfolio-page-assets-list">
        <!-- 1. NOT ELIGIBLE -->
        <div title="Vertical Infographics 10 options" class="left">
          <div class="margin-small content-thumbnail-wrapper" data-t="portfolio-single-asset-wrapper">
            <div class="white border-radius-4 border border-solid container-relative bon-jour-border">
              <div class="cursor-pointer">
                <div class="content-thumbnail grey alabaster v-align-wrapper border-radius-4">
                  <img src="https://as1.ftcdn.net/jpg/15/34/90/24/220_F_1534902442_PIoO73vDrX3DgCEbRimfu4gAceFcJZWO.jpg" class="content-thumbnail__img c-align" alt="">
                </div>
                <div class="padding-medium premium-type-box flex flex-justify-space-between">
                  <div class="container-inline-block vertical-align-top flex-even">
                    <div class="grey mountain-mist-text text-up text-small">downloads</div>
                    <span class="text-medium light">18</span>
                  </div>
                  <div class="container-inline-block flex-even buyout_toggle__hidden padding-left-xlarge">
                    <div class="grey mountain-mist-text text-up text-small right-align">nominate</div>
                    <div class="vi3c6W_flex" style="min-height:32px;justify-content:space-between;align-items:center"></div>
                    <div class="vi3c6W_flex" style="min-height:32px;justify-content:space-between;align-items:center"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. ELIGIBLE (1 Year ON, Perpetual ON) -->
        <div title="5 Days of week project plan infographic" class="left">
          <div class="margin-small content-thumbnail-wrapper" data-t="portfolio-single-asset-wrapper">
            <div class="white border-radius-4 border border-solid container-relative bon-jour-border">
              <div class="cursor-pointer">
                <div class="content-thumbnail grey alabaster v-align-wrapper border-radius-4">
                  <img src="https://as1.ftcdn.net/jpg/11/78/62/20/220_F_1178622093_Np9buOf2iFTmCOjPBOhTG20RLzDdzpsM.jpg" class="content-thumbnail__img c-align" alt="">
                </div>
                <div class="padding-medium premium-type-box flex flex-justify-space-between">
                  <div class="container-inline-block vertical-align-top flex-even">
                    <div class="grey mountain-mist-text text-up text-small">downloads</div>
                    <span class="text-medium light">18</span>
                  </div>
                  <div class="container-inline-block flex-even buyout_toggle padding-left-xlarge">
                    <div class="grey mountain-mist-text text-up text-small right-align">nominate</div>
                    <div class="vi3c6W_flex" style="min-height:32px;justify-content:space-between;align-items:center">
                      <div class="CampaignNominationToggle__StyledText-sc-8olflh-0 hBFqOv">1 Year</div>
                      <label class="El90pa_spectrum-ToggleSwitch">
                        <input data-t="portfolio-single-asset-buyout-toggle" aria-label="1 Year" type="checkbox" role="switch" class="El90pa_spectrum-ToggleSwitch-input" checked="">
                      </label>
                    </div>
                    <div class="vi3c6W_flex" style="min-height:32px;justify-content:space-between;align-items:center">
                      <div class="CampaignNominationToggle__StyledText-sc-8olflh-0 hBFqOv">Perpetual</div>
                      <label class="El90pa_spectrum-ToggleSwitch">
                        <input data-t="portfolio-single-asset-buyout-toggle" aria-label="Perpetual" type="checkbox" role="switch" class="El90pa_spectrum-ToggleSwitch-input" checked="">
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. ELIGIBLE (1 Year ON, Perpetual ON) -->
        <div title="Vertical infographic 5 steps to success" class="left">
          <div class="margin-small content-thumbnail-wrapper" data-t="portfolio-single-asset-wrapper">
            <div class="white border-radius-4 border border-solid container-relative bon-jour-border">
              <div class="cursor-pointer">
                <div class="content-thumbnail grey alabaster v-align-wrapper border-radius-4">
                  <img src="https://as2.ftcdn.net/jpg/10/94/17/27/220_F_1094172751_xiUCHk4wjqSMPXBWNLtTfcrNc3nAKpvk.jpg" class="content-thumbnail__img c-align" alt="">
                </div>
                <div class="padding-medium premium-type-box flex flex-justify-space-between">
                  <div class="container-inline-block vertical-align-top flex-even">
                    <div class="grey mountain-mist-text text-up text-small">downloads</div>
                    <span class="text-medium light">18</span>
                  </div>
                  <div class="container-inline-block flex-even buyout_toggle padding-left-xlarge">
                    <div class="grey mountain-mist-text text-up text-small right-align">nominate</div>
                    <div class="vi3c6W_flex" style="min-height:32px;justify-content:space-between;align-items:center">
                      <div class="CampaignNominationToggle__StyledText-sc-8olflh-0 hBFqOv">1 Year</div>
                      <label class="El90pa_spectrum-ToggleSwitch">
                        <input data-t="portfolio-single-asset-buyout-toggle" aria-label="1 Year" type="checkbox" role="switch" class="El90pa_spectrum-ToggleSwitch-input" checked="">
                      </label>
                    </div>
                    <div class="vi3c6W_flex" style="min-height:32px;justify-content:space-between;align-items:center">
                      <div class="CampaignNominationToggle__StyledText-sc-8olflh-0 hBFqOv">Perpetual</div>
                      <label class="El90pa_spectrum-ToggleSwitch">
                        <input data-t="portfolio-single-asset-buyout-toggle" aria-label="Perpetual" type="checkbox" role="switch" class="El90pa_spectrum-ToggleSwitch-input" checked="">
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Test DOM parsing logic matching content.js
    const parser = new DOMParser();
    const doc = parser.parseFromString(userHtml, 'text/html');
    const imgEls = Array.from(doc.querySelectorAll('img[src*="_F_"]'));
    const cardSet = new Set<Element>();

    imgEls.forEach((img) => {
      const card =
        img.closest('div.bon-jour-border') ||
        img.closest('div[data-t="portfolio-single-asset-wrapper"]') ||
        img.closest('div[title]') ||
        img.closest('.border-radius-4');
      if (card) {
        cardSet.add(card);
      }
    });

    const parsedResults: any[] = [];
    cardSet.forEach((card) => {
      const imgEl = card.querySelector('img[src*="_F_"]') || card.querySelector('img');
      const imgSrc = imgEl?.getAttribute('src') || '';
      const match = imgSrc.match(/_F_(\d+)_/);
      const asId = match ? match[1] : '';

      // Check nomination
      // Note: Must distinguish .buyout_toggle from .buyout_toggle__hidden
      const buyoutSection = card.querySelector('.buyout_toggle:not(.buyout_toggle__hidden), [data-t="portfolio-single-asset-buyout-toggle"]');
      const isNominateEligible = Boolean(buyoutSection);

      parsedResults.push({ asId, isNominateEligible });
    });

    expect(parsedResults).toHaveLength(3);
    expect(parsedResults[0]).toEqual({ asId: '1534902442', isNominateEligible: false });
    expect(parsedResults[1]).toEqual({ asId: '1178622093', isNominateEligible: true });
    expect(parsedResults[2]).toEqual({ asId: '1094172751', isNominateEligible: true });
  });

  it('UT-EXT-CONTRIBUTOR-DOM-NESTED-TITLE-01: extracts full title from outer div[title].left ancestor even when inner wrapper exists', () => {
    const nestedHtml = `
      <div data-t="portfolio-page-assets-list">
        <div title="Modern 3 Options Arrow Timeline Infographic Vector Template for Workflow and Marketing Strategy. Presentation, Report and Plan. Vector illustration." class="left">
          <div class="margin-small content-thumbnail-wrapper" data-t="portfolio-single-asset-wrapper">
            <div class="white border-radius-4 border border-solid container-relative bon-jour-border">
              <div class="cursor-pointer">
                <div class="content-thumbnail grey alabaster v-align-wrapper border-radius-4">
                  <img src="https://as2.ftcdn.net/jpg/21/75/75/91/220_F_2175759142_uhgfr438cqZU8Kw6FCDUkCSJlu8feuKw.jpg" class="content-thumbnail__img c-align" alt="">
                </div>
                <div class="padding-medium premium-type-box flex flex-justify-space-between">
                  <div class="container-inline-block vertical-align-top flex-even">
                    <div class="grey mountain-mist-text text-up text-small">downloads</div>
                    <span class="text-medium light">5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const parser = new DOMParser();
    const doc = parser.parseFromString(nestedHtml, 'text/html');
    const imgEls = Array.from(doc.querySelectorAll('img[src*="_F_"]'));
    const cardSet = new Set<Element>();

    imgEls.forEach((img) => {
      const card =
        img.closest('div[title].left') ||
        img.closest('div[title]') ||
        img.closest('div[data-t="portfolio-single-asset-wrapper"]') ||
        img.closest('div.bon-jour-border') ||
        img.closest('.cursor-pointer')?.parentElement;
      if (card) {
        cardSet.add(card);
      }
    });

    const parsedItems: any[] = [];
    cardSet.forEach((card) => {
      const imgEl = card.querySelector('img[src*="_F_"]') || card.querySelector('img');
      const imgSrc = imgEl?.getAttribute('src') || '';
      const match = imgSrc.match(/_F_(\d+)_/);
      const asId = match ? match[1] : '';

      const title =
        card.getAttribute('title')?.trim() ||
        card.closest('[title]')?.getAttribute('title')?.trim() ||
        imgEl?.closest('[title]')?.getAttribute('title')?.trim() ||
        card.querySelector('[title]')?.getAttribute('title')?.trim() ||
        imgEl?.getAttribute('alt')?.trim() ||
        `Asset ${asId}`;

      parsedItems.push({ asId, title });
    });

    expect(parsedItems).toHaveLength(1);
    expect(parsedItems[0].asId).toBe('2175759142');
    expect(parsedItems[0].title).toBe(
      'Modern 3 Options Arrow Timeline Infographic Vector Template for Workflow and Marketing Strategy. Presentation, Report and Plan. Vector illustration.'
    );
  });

  it('UT-EXT-CONTRIBUTOR-TSV-THUMBNAIL-01: extracts thumbnail URL from 7-column nominate TSV exports accurately', () => {
    const tsvWithNominate = [
      'Asset ID\tTitle\tDownloads\tNominate Eligible\t1 Year\tPerpetual\tThumbnail',
      '2175759142\tModern 3 Options Arrow Timeline Infographic Vector Template\t12\tYes\tON\tON\thttps://as2.ftcdn.net/jpg/21/75/75/91/220_F_2175759142_uhgfr438cqZU8Kw6FCDUkCSJlu8feuKw.jpg',
      '2175759135\t5 Steps Vertical Process Infographic Design\t0\tNo\tOFF\tOFF\thttps://as2.ftcdn.net/jpg/21/75/75/91/220_F_2175759135_HqZFwz3XMhi0p6KX3rweNLWmwDQlrXQH.jpg',
    ].join('\n');

    const items = parseTsvString(tsvWithNominate);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      asId: '2175759142',
      title: 'Modern 3 Options Arrow Timeline Infographic Vector Template',
      downloads: 12,
      thumbnailUrl: 'https://as2.ftcdn.net/jpg/21/75/75/91/220_F_2175759142_uhgfr438cqZU8Kw6FCDUkCSJlu8feuKw.jpg',
    });
    expect(items[1]).toEqual({
      asId: '2175759135',
      title: '5 Steps Vertical Process Infographic Design',
      downloads: 0,
      thumbnailUrl: 'https://as2.ftcdn.net/jpg/21/75/75/91/220_F_2175759135_HqZFwz3XMhi0p6KX3rweNLWmwDQlrXQH.jpg',
    });
  });
});

