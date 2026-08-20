import { test, expect } from '@playwright/test';

test.describe('Sales & Earnings Management', () => {
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



  test('renders sales page, summary cards, table, and opens entry drawer', async ({ page }) => {

    // Navigate to sales page
    await page.goto('/sales');

    // Verify header and KPI summary cards
    await expect(page.getByRole('heading', { name: /Sales & Earnings Manager/i })).toBeVisible();
    await expect(page.getByTestId('sales-kpi-total-earnings')).toBeVisible();
    await expect(page.getByTestId('sales-kpi-total-downloads')).toBeVisible();

    // Verify sales table exists
    await expect(page.getByTestId('sales-table')).toBeVisible();

    // Test platform filter buttons
    await page.getByRole('button', { name: 'Adobe Stock' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'All Platforms' }).click();
    await page.waitForTimeout(300);

    // Open Record Sale drawer
    const addSaleBtn = page.getByTestId('sales-add-sale-btn');
    await expect(addSaleBtn).toBeVisible();
    await addSaleBtn.click();

    // Verify drawer elements
    const drawer = page.getByTestId('sales-form-drawer');
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId('sales-form-platform-select')).toBeVisible();
    await expect(page.getByTestId('sales-form-downloads-input')).toBeVisible();
    await expect(page.getByTestId('sales-form-earnings-input')).toBeVisible();

    // Close drawer
    await page.getByTestId('sales-form-close-btn').click();
    await expect(drawer).not.toBeVisible();


  });

  test('E2E-SALES-02: opens smart paste modal, verifies live stats, preview summary header, and allows preview/close', async ({ page }) => {
    await page.goto('/sales');

    // Open Smart Paste modal
    const pasteBtn = page.getByTestId('sales-smart-paste-btn');
    await expect(pasteBtn).toBeVisible();
    await pasteBtn.click();

    // Verify modal elements
    const modal = page.getByTestId('smart-paste-modal');
    await expect(modal).toBeVisible();
    await expect(page.getByTestId('smart-paste-date-input')).toBeVisible();
    await expect(page.getByTestId('smart-paste-platform-adobe-stock')).toBeVisible();
    await expect(page.getByTestId('smart-paste-textarea')).toBeVisible();

    // Paste sample Adobe Stock row
    await page.getByTestId('smart-paste-textarea').fill(`
[1929092005](https://stock.adobe.com/stock-photo/id/1929092005)
Vectors
2/27/2026
$207.04
    `);

    // Verify Real-time Live Stats banner
    const liveStats = page.getByTestId('smart-paste-live-stats');
    await expect(liveStats).toBeVisible();
    await expect(liveStats).toContainText('Detected: 1 items');
    await expect(liveStats).toContainText('Estimated: $207.04');

    // Verify parse button text reflects instant stats
    const parseBtn = page.getByTestId('smart-paste-parse-btn');
    await expect(parseBtn).toContainText('Parse & Match 1 Items ($207.04)');
    await parseBtn.click();

    // Verify preview stage shows summary header & parsed row
    await expect(page.getByTestId('smart-paste-summary-date')).toBeVisible();
    await expect(page.getByTestId('smart-paste-summary-revenue')).toBeVisible();
    await expect(page.getByTestId('smart-paste-summary-revenue')).toContainText('$207.04');
    await expect(modal.getByText('#1929092005')).toBeVisible();

    // Close modal
    await page.getByTestId('smart-paste-close-btn').click();
    await expect(modal).not.toBeVisible();
  });

  test('E2E-SALES-03: verifies unlinked artwork filter and pagination controls', async ({ page }) => {
    await page.goto('/sales');

    // Verify sales table exists
    await expect(page.getByTestId('sales-table')).toBeVisible();

    // Verify pagination bar controls exist on All Platforms (when > 100 items exist)
    const prevBtn = page.getByTestId('sales-pagination-prev-btn');
    if (await prevBtn.isVisible()) {
      await expect(page.getByTestId('sales-pagination-next-btn')).toBeVisible();
      await expect(page.getByTestId('sales-pagination-page-input')).toBeVisible();
    }

    // Test Unlinked platform filter button
    const unlinkedFilterBtn = page.getByTestId('sales-platform-filter-unlinked');
    await expect(unlinkedFilterBtn).toBeVisible();
    await unlinkedFilterBtn.click();
    await page.waitForTimeout(300);

    // Switch back to All platforms
    await page.getByTestId('sales-platform-filter-all').click();
    await page.waitForTimeout(300);
  });
});


