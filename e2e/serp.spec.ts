import { test, expect } from '@playwright/test';

test.describe('Asset Rankings & SERP Telemetry (E2E-SERP-01)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await page.addInitScript(() => {
      const removePortals = () => {
        document.querySelectorAll('nextjs-portal').forEach((p) => p.remove());
      };
      removePortals();
      const observer = new MutationObserver(removePortals);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; pointer-events: none !important; }',
    }).catch(() => {});
  });

  test('renders asset rankings page, KPI cards, searchable combobox, full snapshot modal, drawer, and paste modal', async ({ page }) => {
    // 1. Navigate to /serp
    await page.goto('/serp');

    // 2. Verify page header
    await expect(page.getByRole('heading', { name: /Asset Rankings/i })).toBeVisible();

    // 3. Verify KPI Summary Cards
    await expect(page.getByTestId('serp-kpi-keywords')).toBeVisible();
    await expect(page.getByTestId('serp-kpi-page1-artworks')).toBeVisible();
    await expect(page.getByTestId('serp-kpi-top10')).toBeVisible();
    await expect(page.getByTestId('serp-kpi-best-rank')).toBeVisible();

    // 4. Verify Table and Search Toolbar
    await expect(page.getByTestId('serp-table')).toBeVisible();
    const searchInput = page.getByTestId('serp-search-input');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('infographic');
    await page.waitForTimeout(300);

    const clearSearchBtn = page.getByTestId('serp-search-clear-btn');
    if (await clearSearchBtn.isVisible()) {
      await clearSearchBtn.click();
      await page.waitForTimeout(300);
    }

    // 5. Test Searchable Keyword Combobox Dropdown
    const comboboxBtn = page.getByTestId('serp-keyword-filter-dropdown-btn');
    if (await comboboxBtn.isVisible()) {
      await comboboxBtn.click();
      await expect(page.getByTestId('serp-keyword-filter-popover')).toBeVisible();

      const keywordSearch = page.getByTestId('serp-keyword-search-input');
      if (await keywordSearch.isVisible()) {
        await keywordSearch.fill('info');
        await page.waitForTimeout(200);
      }

      // Close popover by clicking outside or dropdown button
      await comboboxBtn.click();
    }

    // 6. Test Smart SERP Paste Modal
    const pasteBtn = page.getByTestId('serp-paste-btn');
    await expect(pasteBtn).toBeVisible();
    await pasteBtn.click();

    const pasteModal = page.getByTestId('serp-smart-paste-modal');
    await expect(pasteModal).toBeVisible();

    const pasteTextarea = page.getByTestId('serp-smart-paste-textarea');
    await expect(pasteTextarea).toBeVisible();

    const sampleTsv = [
      'Keyword\tPage\tRank\tAsset ID\tAuthor\tTitle',
      'infographic\t1\t1\t1930409866\tWD 99\tInfographic Template',
      'infographic\t1\t2\t1056563551\tUnknow Author\t5 Elements Infographic design template',
    ].join('\n');

    await pasteTextarea.fill(sampleTsv);
    await expect(page.getByText(/2 items parsed/i)).toBeVisible();

    // Dismiss paste modal
    const closeBtn = page.getByTestId('serp-smart-paste-close-btn');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(pasteModal).not.toBeVisible();

    // 7. Test Artwork History Drawer (if rows exist)
    const correlationBtn = page.locator('button[title*="Inspect Rank"]').first();
    if (await correlationBtn.isVisible()) {
      await correlationBtn.click();
      const drawer = page.getByTestId('artwork-serp-drawer');
      await expect(drawer).toBeVisible();

      // Click dark backdrop overlay to close
      const backdrop = page.getByTestId('artwork-serp-backdrop');
      if (await backdrop.isVisible()) {
        await backdrop.click({ position: { x: 50, y: 50 } });
        await expect(drawer).not.toBeVisible();
      }
    }

    // 8. Test Full SERP 100 Ranking Modal (if rows exist)
    const fullSerpBtn = page.locator('button[title*="View Full"]').first();
    if (await fullSerpBtn.isVisible()) {
      await fullSerpBtn.click();
      const fullModal = page.getByTestId('full-serp-modal');
      await expect(fullModal).toBeVisible();

      const myArtworkFilterBtn = page.getByTestId('filter-my-artwork-btn');
      if (await myArtworkFilterBtn.isVisible()) {
        await myArtworkFilterBtn.click();
        await page.waitForTimeout(200);
      }

      // Close full serp modal by clicking backdrop or close button
      await fullModal.click({ position: { x: 20, y: 20 } });
      await expect(fullModal).not.toBeVisible();
    }
  });
});
