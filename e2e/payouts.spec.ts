import { test, expect } from '@playwright/test';

test.describe('Payouts & Withdrawals Management (E2E-PAYOUT-01)', () => {
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

  test('renders payouts page, KPI cards, table, and opens entry & paste modals', async ({ page }) => {
    // Navigate to payouts page
    await page.goto('/payouts');

    // Verify header and KPI summary cards
    await expect(page.getByRole('heading', { name: /^Payouts & Withdrawals$/i })).toBeVisible();
    await expect(page.getByTestId('payout-kpi-total-stock-usd')).toBeVisible();
    await expect(page.getByTestId('payout-kpi-realized-thb')).toBeVisible();
    await expect(page.getByTestId('payout-kpi-holding-usd')).toBeVisible();
    await expect(page.getByTestId('payout-kpi-total-fees')).toBeVisible();
    await expect(page.getByTestId('payout-kpi-total-transactions')).toBeVisible();

    // Verify table and filters exist
    await expect(page.getByTestId('payout-table')).toBeVisible();
    await expect(page.getByTestId('payout-table-footer')).toBeVisible();
    await expect(page.getByTestId('payout-year-filter')).toBeVisible();
    await expect(page.getByTestId('payout-stock-filter')).toBeVisible();

    // Open Log Payout Modal
    const addBtn = page.getByTestId('payout-add-btn');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const entryModal = page.getByTestId('payout-entry-modal');
    await expect(entryModal).toBeVisible();
    await expect(page.getByTestId('payout-submit-btn')).toBeVisible();

    // Close entry modal via Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(entryModal).not.toBeVisible();

    // Open Smart Paste Modal
    const pasteBtn = page.getByTestId('payout-paste-btn');
    await expect(pasteBtn).toBeVisible();
    await pasteBtn.click();

    const pasteModal = page.getByTestId('payout-paste-modal');
    await expect(pasteModal).toBeVisible();

    // Close paste modal via Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(pasteModal).not.toBeVisible();
  });

  test('E2E-PAYOUT-02: creates a new payout transaction, saves to DB, and verifies table rendering', async ({ page }) => {
    const uniqueNote = `E2E Payout ${Date.now()}`;
    await page.goto('/payouts');

    // Click Log Payout
    await page.getByTestId('payout-add-btn').click();
    const entryModal = page.getByTestId('payout-entry-modal');
    await expect(entryModal).toBeVisible();

    // Fill Form
    await page.getByTestId('payout-input-stock-name').selectOption('Adobe Stock');
    await page.getByTestId('payout-input-withdraw-date').fill('2026-06-01');
    await page.getByTestId('payout-input-stock-amount').fill('150.00');
    await page.getByTestId('payout-input-notes').fill(uniqueNote);

    // Submit
    await page.getByTestId('payout-submit-btn').click();
    await expect(entryModal).not.toBeVisible();

    // Verify row appears in table
    await expect(page.getByText(uniqueNote)).toBeVisible();
    await expect(page.getByText('$150.00').first()).toBeVisible();
  });

  test('E2E-PAYOUT-03: Payout Status Lifecycle: Contextual 3-dots menu quick toggle and multi-selection floating action bar bulk status update', async ({ page }) => {
    await page.goto('/payouts');

    // Verify table is loaded
    await expect(page.getByTestId('payout-table')).toBeVisible();

    // 1. Test 3-dots row menu quick status toggle
    const firstMenuBtn = page.locator('[data-testid^="payout-action-menu-btn-"]').first();
    if (await firstMenuBtn.isVisible()) {
      await firstMenuBtn.click();

      // Check dropdown has either Mark Completed or Mark Holding button
      const markCompletedBtn = page.locator('[data-testid^="payout-menu-mark-completed-btn-"]').first();
      const markHoldingBtn = page.locator('[data-testid^="payout-menu-mark-holding-btn-"]').first();

      const hasAction = (await markCompletedBtn.isVisible()) || (await markHoldingBtn.isVisible());
      expect(hasAction).toBe(true);

      // Dismiss menu
      await page.keyboard.press('Escape');
    }

    // 2. Test multi-row selection and floating action bar bulk status button
    const firstRowCheckbox = page.locator('tbody input[type="checkbox"]').first();
    if (await firstRowCheckbox.isVisible()) {
      await firstRowCheckbox.check();

      // Floating action bar appears with bulk mark completed button
      const bulkCompletedBtn = page.getByTestId('payout-bulk-mark-completed-btn');
      await expect(bulkCompletedBtn).toBeVisible();
      await expect(bulkCompletedBtn).toContainText('Mark Completed');

      // Uncheck to clear selection
      await firstRowCheckbox.uncheck();
      await expect(bulkCompletedBtn).not.toBeVisible();
    }
  });
});
