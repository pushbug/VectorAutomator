import { test, expect } from '@playwright/test';

test.describe('Keyword Performance & Analytics (E2E-KW-01)', () => {
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

  test('renders keyword insights page, KPI cards, table sorting, tier filters, copy, and inspect drawer', async ({ page }) => {
    // Navigate to /keywords
    await page.goto('/keywords');

    // Verify header
    await expect(page.getByRole('heading', { name: /Keyword Insights & Analytics/i })).toBeVisible();

    // Verify KPI summary cards
    await expect(page.getByTestId('keyword-kpi-total-keywords')).toBeVisible();
    await expect(page.getByTestId('keyword-kpi-tagged-assets')).toBeVisible();
    await expect(page.getByTestId('keyword-kpi-top-earning')).toBeVisible();
    await expect(page.getByTestId('keyword-kpi-top-downloads')).toBeVisible();

    // Verify Keyword Table
    await expect(page.getByTestId('keyword-table')).toBeVisible();

    // Test Search filtering
    const searchInput = page.getByTestId('keyword-search-input');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('business');
    await page.waitForTimeout(300);

    // Clear search
    const clearBtn = page.getByTestId('keyword-search-clear-btn');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(300);
    }

    // Test Time Range Velocity Filter buttons
    const thirtyDayBtn = page.getByTestId('keyword-time-range-30d');
    if (await thirtyDayBtn.isVisible()) {
      await thirtyDayBtn.click();
      await page.waitForTimeout(300);
    }

    const allTimeBtn = page.getByTestId('keyword-time-range-all');
    if (await allTimeBtn.isVisible()) {
      await allTimeBtn.click();
      await page.waitForTimeout(300);
    }

    // Test Tier Filter buttons (including Draw More)
    const drawMoreTierBtn = page.getByTestId('keyword-filter-tier-draw_more');
    if (await drawMoreTierBtn.isVisible()) {
      await drawMoreTierBtn.click();
      await page.waitForTimeout(300);
    }

    const starTierBtn = page.getByTestId('keyword-filter-tier-star');
    if (await starTierBtn.isVisible()) {
      await starTierBtn.click();
      await page.waitForTimeout(300);
    }

    const allTierBtn = page.getByTestId('keyword-filter-tier-all');
    await allTierBtn.click();
    await page.waitForTimeout(300);

    // Test Column Sorting
    await page.getByTestId('keyword-sort-downloads-btn').click();
    await page.waitForTimeout(300);
    await page.getByTestId('keyword-sort-earnings-btn').click();
    await page.waitForTimeout(300);

    // Test Row Selection and Bulk Action Bar
    const selectAllCheckbox = page.getByTestId('keyword-select-all-checkbox');
    await expect(selectAllCheckbox).toBeVisible();
    await selectAllCheckbox.click();

    // If there are rows, verify bulk copy button
    const bulkCopyBtn = page.getByTestId('keyword-bulk-copy-btn');
    if (await bulkCopyBtn.isVisible()) {
      await bulkCopyBtn.click();
      await expect(page.getByText(/Copied Tags!/i)).toBeVisible();
    }

    // Test Inspect Drawer if an inspect button exists
    const firstInspectBtn = page.locator('[data-testid^="keyword-row-inspect-btn-"]').first();
    if (await firstInspectBtn.isVisible()) {
      await firstInspectBtn.click();

      // Verify drawer opens
      const drawer = page.getByTestId('keyword-detail-drawer');
      await expect(drawer).toBeVisible();

      // Verify winning tag recipe if present
      const recipeCard = page.getByTestId('keyword-drawer-winning-tags');
      if (await recipeCard.isVisible()) {
        const copyRecipeBtn = page.getByTestId('keyword-drawer-copy-recipe-btn');
        await copyRecipeBtn.click();
        await expect(page.getByText(/Copied Recipe!/i)).toBeVisible();
      }

      // Close drawer
      const closeBtn = page.getByTestId('keyword-detail-close-btn');
      await expect(closeBtn).toBeVisible();
      await closeBtn.click({ force: true });
      await expect(drawer).not.toBeVisible();
    }

    // Test Guidelines Modal
    const guideBtn = page.getByTestId('keyword-guide-btn');
    await expect(guideBtn).toBeVisible();
    await guideBtn.click();

    const guideModal = page.getByTestId('keyword-guide-modal');
    await expect(guideModal).toBeVisible();
    await expect(guideModal.getByText(/Keyword Performance Tiers/i)).toBeVisible();
    await expect(guideModal.getByText(/Draw More \(ควรวาดเพิ่ม/i)).toBeVisible();
    await expect(guideModal.getByText(/Time Range Velocity/i)).toBeVisible();

    const gotItBtn = page.getByTestId('keyword-guide-got-it-btn');
    await expect(gotItBtn).toBeVisible();
    await gotItBtn.click({ force: true });
    await expect(guideModal).not.toBeVisible();
  });
});
