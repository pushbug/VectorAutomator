import { describe, it, expect } from 'vitest';
import { parseContributorHtml } from '@/lib/contributorParser';

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
});
