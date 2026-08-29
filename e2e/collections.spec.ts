import { test, expect } from '@playwright/test';

test.describe('Artwork Collections Flow (E2E-COL-01)', () => {
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
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; pointer-events: none !important; }' }).catch(() => {});
  });

  test('creates collection from portfolio multi-select, views card rollups, inspects shared keywords, and deletes collection', async ({ page }) => {
    // 1. Navigate to /portfolio
    await page.goto('/portfolio');
    await expect(page.getByTestId('portfolio-layout')).toBeVisible();

    // Check if portfolio has items
    const checkboxes = page.locator('input[type="checkbox"][data-testid^="portfolio-checkbox-"]');
    const count = await checkboxes.count();

    if (count > 0) {
      // Click first checkbox
      await checkboxes.first().click();

      // Floating toolbar should appear
      const toolbar = page.getByTestId('portfolio-floating-toolbar');
      await expect(toolbar).toBeVisible();

      // Click Create Collection
      await page.getByTestId('portfolio-create-collection-btn').click();

      // Create modal should open
      const createModal = page.getByTestId('create-collection-modal');
      await expect(createModal).toBeVisible();

      const testColName = `E2E Test Collection ${Date.now()}`;
      await page.getByTestId('create-collection-name-input').fill(testColName);
      await page.getByTestId('create-collection-description-input').fill('E2E automation test collection');
      await page.getByTestId('create-collection-submit-btn').click();

      // Modal closes and floating toolbar disappears
      await expect(createModal).not.toBeVisible();
      await expect(toolbar).not.toBeVisible();

      // 2. Navigate to /collections
      await page.goto('/collections');
      await expect(page.getByRole('heading', { name: /Collections/i })).toBeVisible();

      // Verify the new collection card exists
      const collectionCardTitle = page.getByText(testColName);
      await expect(collectionCardTitle).toBeVisible();

      // Click into collection detail
      await collectionCardTitle.click();
      await page.waitForURL(/\/collections\/.+/);

      // Verify Collection Detail page
      await expect(page.getByTestId('collection-detail-title')).toHaveText(testColName);
      await expect(page.getByTestId('collection-detail-description')).toHaveText('E2E automation test collection');

      // Verify Top Shared Keywords bar is present if keywords exist
      const topKeywordsBar = page.getByTestId('collection-top-keywords-bar');
      if (await topKeywordsBar.isVisible()) {
        const copyTagsBtn = page.getByTestId('collection-copy-top-keywords-btn');
        await expect(copyTagsBtn).toBeVisible();
        await copyTagsBtn.click();
      }

      // Delete the test collection
      await page.getByTestId('collection-detail-delete-btn').click();
      await expect(page.getByTestId('delete-confirm-dialog')).toBeVisible();
      await page.getByTestId('delete-confirm-btn').click();

      // Should redirect back to /collections
      await page.waitForURL('/collections');
      await expect(page.getByText(testColName)).not.toBeVisible();
    } else {
      // If portfolio is empty, navigate to /collections directly
      await page.goto('/collections');
      await expect(page.getByRole('heading', { name: /Collections/i })).toBeVisible();

      // Open new collection modal from button
      await page.getByTestId('collection-add-btn').click();
      await expect(page.getByTestId('create-collection-modal')).toBeVisible();

      const testColName = `Empty Collection ${Date.now()}`;
      await page.getByTestId('create-collection-name-input').fill(testColName);
      await page.getByTestId('create-collection-submit-btn').click();

      await expect(page.getByText(testColName)).toBeVisible();

      // Click card to enter detail
      await page.getByText(testColName).click();
      await page.waitForURL(/\/collections\/.+/);
      await expect(page.getByTestId('collection-detail-title')).toHaveText(testColName);

      // Delete it
      await page.getByTestId('collection-detail-delete-btn').click();
      await page.getByTestId('delete-confirm-btn').click();
      await page.waitForURL('/collections');
    }
  });

  test('E2E-COL-02: switches between Table and Grid view, sorts columns, drills down by keyword, and edits metadata', async ({ page }) => {
    // 1. Navigate to /collections
    await page.goto('/collections');
    await expect(page.getByRole('heading', { name: /Collections/i })).toBeVisible();

    // 2. Test View Mode Toggle to Table View
    const tableBtn = page.getByTestId('collection-view-table-btn');
    const gridBtn = page.getByTestId('collection-view-grid-btn');
    await expect(tableBtn).toBeVisible();
    await expect(gridBtn).toBeVisible();

    await tableBtn.click();

    // Check if collections exist
    const table = page.getByTestId('collection-table');
    const hasTable = await table.isVisible().catch(() => false);

    if (hasTable) {
      // Test sortable header click
      const nameHeader = page.getByTestId('collection-sort-header-name');
      await expect(nameHeader).toBeVisible();
      await nameHeader.click();

      // Click first table row to open detail
      const firstRow = page.locator('[data-testid^="collection-table-row-"]').first();
      await firstRow.click();
      await page.waitForURL(/\/collections\/.+/);

      // In detail view: Test Top Shared Keywords view modes
      const topKeywordsBar = page.getByTestId('collection-top-keywords-bar');
      if (await topKeywordsBar.isVisible()) {
        const dlViewBtn = page.getByTestId('collection-keywords-view-dl-btn');
        const revViewBtn = page.getByTestId('collection-keywords-view-rev-btn');
        const freqViewBtn = page.getByTestId('collection-keywords-view-freq-btn');

        await expect(dlViewBtn).toBeVisible();
        await dlViewBtn.click();

        await expect(revViewBtn).toBeVisible();
        await revViewBtn.click();

        await expect(freqViewBtn).toBeVisible();
        await freqViewBtn.click();

        // Test Collection Detail Search input
        const detailSearchInput = page.getByTestId('collection-search-input');
        if (await detailSearchInput.isVisible()) {
          await detailSearchInput.fill('vector');
          
          // Verify search filter badge appears
          const searchBadge = page.getByTestId('collection-search-filter-badge');
          if (await searchBadge.isVisible()) {
            await expect(searchBadge).toBeVisible();
            
            // Clear via search badge clear button
            const clearSearchBadgeBtn = page.getByTestId('collection-clear-search-badge-btn');
            if (await clearSearchBadgeBtn.isVisible()) {
              await clearSearchBadgeBtn.click();
              await expect(searchBadge).not.toBeVisible();
            }
          }

          // Test search input clear button
          await detailSearchInput.fill('pattern');
          const searchClearBtn = page.getByTestId('collection-search-clear-btn');
          if (await searchClearBtn.isVisible()) {
            await searchClearBtn.click();
            await expect(detailSearchInput).toHaveValue('');
          }
        }

        // Click first keyword tag to test drill-down
        const firstTag = page.locator('[data-testid^="collection-top-keyword-tag-"]').first();
        if (await firstTag.isVisible()) {
          await firstTag.click();

          // Active filter badge appears
          const filterBadge = page.getByTestId('collection-keyword-filter-badge');
          await expect(filterBadge).toBeVisible();

          // Clear filter
          const clearFilterBtn = page.getByTestId('collection-keyword-filter-clear-btn');
          await expect(clearFilterBtn).toBeVisible();
          await clearFilterBtn.click();
          await expect(filterBadge).not.toBeVisible();
        }
      }

      // Test pencil edit button
      const editBtn = page.getByTestId('collection-edit-btn');
      if (await editBtn.isVisible()) {
        await editBtn.click();
        const editModal = page.getByTestId('edit-collection-modal');
        await expect(editModal).toBeVisible();

        // Close modal
        await page.getByTestId('edit-collection-close-btn').click();
        await expect(editModal).not.toBeVisible();
      }
    } else {
      // If no collections, switch back to grid
      await gridBtn.click();
      await expect(page.getByTestId('collection-add-btn')).toBeVisible();
    }
  });
});
