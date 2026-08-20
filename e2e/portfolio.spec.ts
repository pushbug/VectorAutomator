import { test, expect } from '@playwright/test';

test.describe('Portfolio Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const removePortals = () => {
        document.querySelectorAll('nextjs-portal').forEach((p) => p.remove());
      };
      removePortals();
      const observer = new MutationObserver(removePortals);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  });



  test('renders portfolio layout and allows filtering and updates', async ({ page }) => {

    // Navigate to portfolio
    await page.goto('/portfolio');

    // Verify main layout is present
    await expect(page.getByTestId('portfolio-layout')).toBeVisible();

    // Verify filter components are visible
    const searchInput = page.getByTestId('portfolio-search-input');
    await expect(searchInput).toBeVisible();
    await expect(page.getByTestId('portfolio-sort-select')).toBeVisible();
    await expect(page.getByTestId('portfolio-date-picker-trigger')).toBeVisible();

    // Test typing in search and clicking Clear button
    await searchInput.fill('Infographic');
    const searchClearBtn = page.getByTestId('portfolio-search-clear-btn');
    await expect(searchClearBtn).toBeVisible();
    await searchClearBtn.click();
    await expect(searchInput).toHaveValue('');
    await expect(searchClearBtn).not.toBeVisible();

    // Test opening and closing the Add Image slide-over drawer
    await expect(page.getByTestId('portfolio-add-btn')).toBeVisible();
    await page.getByTestId('portfolio-add-btn').click();
    await expect(page.getByTestId('portfolio-add-drawer')).toBeVisible();
    await page.getByTestId('portfolio-add-close-btn').click();

    await expect(page.getByTestId('portfolio-add-drawer')).not.toBeVisible();

    // Test opening and using the interactive date range picker popover
    await page.getByTestId('portfolio-date-picker-trigger').click();
    await expect(page.getByTestId('portfolio-date-picker-popover')).toBeVisible();
    await page.getByText('Today').click();
    await page.getByTestId('calendar-done-btn').click();
    await expect(page.getByTestId('portfolio-date-picker-popover')).not.toBeVisible();

    // Test interacting with the sort select
    const sortSelect = page.getByTestId('portfolio-sort-select');
    await sortSelect.selectOption('totalDownloads-desc');

    // Wait for network requests (basic stabilization)
    await page.waitForTimeout(500);

    // If grid items exist, click the first one and update it
    const gridItems = page.getByTestId('portfolio-grid-item');
    if (await gridItems.count() > 0) {
      await gridItems.first().click();

      // Verify the detail panel opens
      const detailPanel = page.getByTestId('portfolio-detail-panel');
      await expect(detailPanel).toBeVisible();

      // Test opening Log Sale drawer from Portfolio Detail
      const logSaleBtn = page.getByTestId('portfolio-detail-log-sale-btn');
      if (await logSaleBtn.isVisible()) {
        await logSaleBtn.click();
        await expect(page.getByTestId('sales-form-drawer')).toBeVisible();
        await page.getByTestId('sales-form-close-btn').click({ force: true });
        await expect(page.getByTestId('sales-form-drawer')).not.toBeVisible();
      }
    }
  });

  test('handles Image Code in drawer and shows Delete confirmation modal in detail panel', async ({ page }) => {
    await page.goto('/portfolio');
    await expect(page.getByTestId('portfolio-layout')).toBeVisible();
    await expect(page.getByText('Loading...')).not.toBeVisible();

    // Open Add Image drawer
    await page.getByTestId('portfolio-add-btn').click();
    await expect(page.getByTestId('portfolio-add-drawer')).toBeVisible();

    // Verify Image Code input exists
    const codeInput = page.getByTestId('portfolio-add-code-input');
    await expect(codeInput).toBeVisible();

    // Type a custom code
    await codeInput.fill('2608-999');
    await expect(codeInput).toHaveValue('2608-999');

    // Close drawer
    await page.getByTestId('portfolio-add-close-btn').click();

    await expect(page.getByTestId('portfolio-add-drawer')).not.toBeVisible();
    await page.waitForTimeout(300);

    // If grid items exist, test delete confirmation modal
    const gridItems = page.getByTestId('portfolio-grid-item');
    if (await gridItems.count() > 0) {
      await gridItems.first().click();
      const detailPanel = page.getByTestId('portfolio-detail-panel');
      await expect(detailPanel).toBeVisible();

      // Click Delete Image button
      const deleteBtn = page.getByTestId('portfolio-delete-btn');
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click();

      // Confirm dialog should appear
      const confirmDialog = page.getByTestId('delete-confirm-dialog');
      await expect(confirmDialog).toBeVisible();
      await expect(page.getByTestId('delete-confirm-btn')).toBeVisible();
      const cancelBtn = page.getByTestId('delete-cancel-btn');
      await expect(cancelBtn).toBeVisible();

      // Cancel deletion
      await cancelBtn.click({ force: true });
      await expect(confirmDialog).not.toBeVisible();
    }
  });
});

