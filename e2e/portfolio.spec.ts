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

    // Verify main layout and summary bar are present
    await expect(page.getByTestId('portfolio-layout')).toBeVisible();
    await expect(page.getByTestId('portfolio-summary-downloads')).toBeVisible();
    await expect(page.getByTestId('portfolio-summary-earnings')).toBeVisible();

    // Verify filter components are visible
    const searchInput = page.getByTestId('portfolio-search-input');
    await expect(searchInput).toBeVisible();
    await expect(page.getByTestId('portfolio-search-field-select')).toBeVisible();
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

  test('E2E-PF-03: opens Smart ID Matcher modal, enters paste data, and verifies modal controls', async ({ page }) => {
    await page.goto('/portfolio');
    await expect(page.getByTestId('portfolio-layout')).toBeVisible();

    // Verify Sync Adobe IDs button exists
    const syncBtn = page.getByTestId('portfolio-sync-ids-btn');
    await expect(syncBtn).toBeVisible();
    await syncBtn.click();

    // Verify Modal opens
    const modal = page.getByTestId('smart-id-sync-modal');
    await expect(modal).toBeVisible();

    // Verify Textarea and controls exist
    const textarea = page.getByTestId('sync-paste-textarea');
    await expect(textarea).toBeVisible();
    await textarea.fill('569029521\t10 Important historical event timeline infographic brochure.\t1410');

    // Test Cancel button dismisses modal
    const cancelBtn = page.getByTestId('cancel-sync-btn');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    await expect(modal).not.toBeVisible();
  });

  test('E2E-PF-04: opens Smart ID Matcher modal, tests Shutterstock platform toggle and auto-switch on paste', async ({ page }) => {
    await page.goto('/portfolio');
    await expect(page.getByTestId('portfolio-layout')).toBeVisible();

    // 1. Open Smart ID Matcher modal
    const syncBtn = page.getByTestId('portfolio-sync-ids-btn');
    await expect(syncBtn).toBeVisible();
    await syncBtn.click();

    const modal = page.getByTestId('smart-id-sync-modal');
    await expect(modal).toBeVisible();

    // 2. Verify platform toggle exists and defaults to Adobe Stock
    const platformSelect = page.getByTestId('smart-id-paste-platform-select');
    const adobeBtn = page.getByTestId('smart-id-paste-platform-adobe');
    const shutterstockBtn = page.getByTestId('smart-id-paste-platform-shutterstock');

    await expect(platformSelect).toBeVisible();
    await expect(adobeBtn).toBeVisible();
    await expect(shutterstockBtn).toBeVisible();
    await expect(modal.getByText('Smart Adobe Contributor ID Matcher')).toBeVisible();

    // 3. Test manual switch to Shutterstock
    await shutterstockBtn.click();
    await expect(modal.getByText('Smart Shutterstock Contributor ID Matcher')).toBeVisible();

    // 4. Switch back to Adobe and test auto-switch upon pasting Shutterstock TSV
    await adobeBtn.click();
    await expect(modal.getByText('Smart Adobe Contributor ID Matcher')).toBeVisible();

    const textarea = page.getByTestId('sync-paste-textarea');
    await textarea.fill(
      'Shutterstock ID\tTitle / Filename\tStatus\tMedia Type\tThumbnail URL\n2837128969\tMinimalist Milestone Infographic Banner.eps\tApproved\tIllustration\thttps://image.shutterstock.com/thumb.jpg'
    );

    // Auto-detection triggers and switches title to Shutterstock
    await expect(modal.getByText('Smart Shutterstock Contributor ID Matcher')).toBeVisible();

    // 5. Dismiss modal
    const cancelBtn = page.getByTestId('cancel-sync-btn');
    await cancelBtn.click();
    await expect(modal).not.toBeVisible();
  });
});

