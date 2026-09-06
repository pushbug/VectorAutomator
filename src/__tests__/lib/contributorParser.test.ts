import { describe, it, expect } from 'vitest';
import {
  parseTsvString,
  detectContributorPlatform,
  parseShutterstockHtml,
  cleanSuffixes,
  normalizeTitle,
  computeSimilarity,
} from '@/lib/contributorParser';

describe('UT-PARSER-SHUTTERSTOCK-CATALOG-01: Shutterstock Contributor Catalog Parser', () => {
  it('detects platform as Shutterstock when header or content contains Shutterstock markers', () => {
    const tsvShutterstock = [
      'Shutterstock ID\tTitle / Filename\tStatus\tMedia Type\tThumbnail URL',
      '2837128969\tMinimalist Milestone Infographic Banner.eps\tApproved\tIllustration\thttps://image.shutterstock.com/image-vector/test-250nw-2837128969.jpg',
    ].join('\n');

    expect(detectContributorPlatform(tsvShutterstock)).toBe('Shutterstock');
    expect(detectContributorPlatform('Asset ID\tTitle\tDownloads\tNominate')).toBe('Adobe Stock');
    expect(detectContributorPlatform('random text with no stock cues')).toBe('Adobe Stock');
  });

  it('correctly parses Shutterstock TSV export with 5 columns into ContributorItem records', () => {
    const tsv = [
      'Shutterstock ID\tTitle / Filename\tStatus\tMedia Type\tThumbnail URL',
      '2837128969\tMinimalist Milestone Infographic Banner with Arrow to Goal for Corporate Marketing Report Presentation Banner and Plan Vector illustration.eps\tApproved\tIllustration\thttps://image.shutterstock.com/image-vector/minimalist-milestone-infographic-banner-arrow-250nw-2837128969.jpg',
      '2836146623\tBusiness Infographic Template with 5 Steps Hexagon Circle for Workflow and Presentation Plan Report and Banner Vector illustration.eps\tApproved\tIllustration\thttps://image.shutterstock.com/image-vector/business-infographic-template-5-steps-250nw-2836146623.jpg',
      '2831847607\t282.eps\tApproved\tIllustration\thttps://image.shutterstock.com/image-vector/3-steps-circle-loop-process-250nw-2831847607.jpg',
    ].join('\n');

    const items = parseTsvString(tsv);

    expect(items).toHaveLength(3);

    expect(items[0]).toEqual({
      asId: '2837128969',
      ssId: '2837128969',
      platform: 'Shutterstock',
      title: 'Minimalist Milestone Infographic Banner with Arrow to Goal for Corporate Marketing Report Presentation Banner and Plan Vector illustration.eps',
      downloads: 0,
      status: 'Approved',
      mediaType: 'Illustration',
      thumbnailUrl: 'https://image.shutterstock.com/image-vector/minimalist-milestone-infographic-banner-arrow-250nw-2837128969.jpg',
    });

    expect(items[2]).toEqual({
      asId: '2831847607',
      ssId: '2831847607',
      platform: 'Shutterstock',
      title: '282.eps',
      downloads: 0,
      status: 'Approved',
      mediaType: 'Illustration',
      thumbnailUrl: 'https://image.shutterstock.com/image-vector/3-steps-circle-loop-process-250nw-2831847607.jpg',
    });
  });

  it('correctly parses raw Shutterstock Contributor HTML cards from live DOM snapshot', () => {
    const html = `
      <div class="MuiBox-root css-1ph2nze">
        <div class="MuiPaper-root MuiCard-root css-rq1v45" data-testid="asset-card" aria-checked="true">
          <input class="PrivateSwitchBase-input" type="checkbox" data-testid="asset-checkbox" aria-label="select asset Minimalist Milestone Infographic Banner with Arrow to Goal.eps">
          <img class="MuiCardMedia-root MuiCardMedia-media" src="https://image.shutterstock.com/image-vector/minimalist-milestone-250nw-2837128969.jpg" data-testid="card-media-Minimalist Milestone Infographic Banner with Arrow to Goal.eps">
          <div class="MuiCardContent-root">
            <div class="MuiTypography-root MuiTypography-bodyStaticMd">2837128969 - Minimalist M...stration.eps</div>
            <p class="MuiTypography-root MuiTypography-bodyStaticXs">Approved</p>
            <p class="MuiTypography-root MuiTypography-bodyStaticXs">Illustration</p>
          </div>
        </div>
        <div class="MuiPaper-root MuiCard-root css-1enqk8l" data-testid="asset-card" aria-checked="false">
          <input class="PrivateSwitchBase-input" type="checkbox" data-testid="asset-checkbox" aria-label="select asset 282.eps">
          <img class="MuiCardMedia-root MuiCardMedia-media" src="https://image.shutterstock.com/image-vector/loop-process-250nw-2831847607.jpg" data-testid="card-media-282.eps">
          <div class="MuiCardContent-root">
            <div class="MuiTypography-root MuiTypography-bodyStaticMd">2831847607 - 282.eps</div>
            <p class="MuiTypography-root MuiTypography-bodyStaticXs">Approved</p>
            <p class="MuiTypography-root MuiTypography-bodyStaticXs">Illustration</p>
          </div>
        </div>
      </div>
    `;

    const items = parseShutterstockHtml(html);
    expect(items).toHaveLength(2);

    expect(items[0].ssId).toBe('2837128969');
    expect(items[0].title).toBe('Minimalist Milestone Infographic Banner with Arrow to Goal.eps');
    expect(items[0].status).toBe('Approved');
    expect(items[0].platform).toBe('Shutterstock');

    expect(items[1].ssId).toBe('2831847607');
    expect(items[1].title).toBe('282.eps');
    expect(items[1].status).toBe('Approved');
    expect(items[1].platform).toBe('Shutterstock');
  });

  it('maintains backwards compatibility for Adobe Stock TSV parsing', () => {
    const adobeTsv = [
      'Asset ID\tTitle\tDownloads\tNominate Eligible\t1 Year\tPerpetual\tThumbnail',
      '972184113\tModern Abstract Vector Template\t42\tYes\tON\tON\thttps://as1.ftcdn.net/jpg/09/72/18/41/220_F_972184113_test.jpg',
    ].join('\n');

    const items = parseTsvString(adobeTsv);
    expect(items).toHaveLength(1);
    expect(items[0].asId).toBe('972184113');
    expect(detectContributorPlatform(adobeTsv)).toBe('Adobe Stock');
    expect(items[0].downloads).toBe(42);
  });
});
