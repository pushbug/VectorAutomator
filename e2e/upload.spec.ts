import { test, expect } from '@playwright/test';

test.describe('Upload Workflow', () => {
  test('User can upload file, edit metadata, and save', async ({ page }) => {
    // Navigate to the upload page
    await page.goto('/upload');

    // Wait for the dropzone to be visible
    const dropzoneInput = page.getByTestId('dropzone-input');
    await expect(dropzoneInput).toBeAttached();

    // Note: In a real E2E test, you would mock the file upload using setInputFiles
    // and mock the API responses for /api/file/convert and /api/ai/metadata using page.route()
    
    // Example of mocking API:
    await page.route('**/api/file/convert', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'image/jpeg',
        body: Buffer.from('mock image')
      });
    });

    await page.route('**/api/ai/metadata', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ title: 'AI Generated Title', keywords: 'ai, generated, keywords' })
      });
    });

    await page.route('**/api/file/exif', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ archivedFiles: ['/mock/path/test.jpg'] })
      });
    });

    // Upload mock file
    await dropzoneInput.setInputFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock image data')
    });

    // Assert that the item appears in the queue
    const queueItem = page.getByTestId('asset-queue-item-test');
    await expect(queueItem).toBeVisible();

    // Click the item to make it active
    await queueItem.click();

    // Edit metadata
    const titleInput = page.getByTestId('metadata-title-input');
    await titleInput.fill('User Edited Title');
    
    const keywordsInput = page.getByTestId('metadata-keywords-input');
    await keywordsInput.fill('user');
    await keywordsInput.press('Enter');

    // Save metadata
    const saveBtn = page.getByTestId('save-metadata-btn');
    await saveBtn.click();

    // Verify download buttons become enabled
    const downloadJpgBtn = page.getByTestId('download-jpg-btn');
    await expect(downloadJpgBtn).not.toBeDisabled();
  });

  test('E2E-UPL-02: Keyword Suggestion workflow, search scoping, and title validation gate', async ({ page }) => {
    // Mock portfolio search API
    await page.route('**/api/portfolio*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'vec-1',
              code: '2608-01',
              title: 'Infographic 5 Steps Roadmap',
              keywords: 'infographic, roadmap, timeline, business, strategy, success',
              totalDownloads: 42,
              totalEarnings: 84.50,
              filePath: 'public/uploads/2608-01.jpg',
              createdAt: '2026-08-15T10:00:00.000Z',
              stats: [{ platform: 'Adobe', downloads: 42, earnings: 84.50 }]
            }
          ],
          meta: { total: 1, page: 1, limit: 50, totalPages: 1 }
        })
      });
    });

    await page.route('**/api/file/convert', async route => {
      await route.fulfill({ status: 200, contentType: 'image/jpeg', body: Buffer.from('mock') });
    });

    await page.goto('/upload');

    // Verify page header is "Upload & Keyword Suggestion"
    await expect(page.getByRole('heading', { name: 'Upload & Keyword Suggestion' })).toBeVisible();

    // Verify Keyword Suggest panel elements
    const searchInput = page.getByTestId('keyword-suggest-search-input');
    const scopeSelect = page.getByTestId('keyword-suggest-search-field-select');
    const sortSelect = page.getByTestId('keyword-suggest-sort-select');

    await expect(searchInput).toBeVisible();
    await expect(scopeSelect).toHaveValue('keywords');
    await expect(sortSelect).toHaveValue('totalDownloads');

    // Switch search scope
    await scopeSelect.selectOption('title');
    await expect(scopeSelect).toHaveValue('title');

    // Switch sort
    await sortSelect.selectOption('earnings');
    await expect(sortSelect).toHaveValue('earnings');

    // Upload mock file into queue
    const dropzoneInput = page.getByTestId('dropzone-input');
    await dropzoneInput.setInputFiles({
      name: 'banner.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock image')
    });

    const queueItem = page.getByTestId('asset-queue-item-banner');
    await expect(queueItem).toBeVisible();
    await queueItem.click();

    // Test Title validation: Click Save without Title
    const titleInput = page.getByTestId('metadata-title-input');
    const saveBtn = page.getByTestId('save-metadata-btn');
    await saveBtn.click();
    await expect(titleInput).toHaveClass(/border-destructive/);

    // Enter title to clear red border
    await titleInput.fill('Business Strategy Banner');
    await expect(titleInput).not.toHaveClass(/border-destructive/);

    // Select reference image card in KeywordSuggester
    const imageCard = page.getByTestId('keyword-suggest-image-card-vec-1');
    await expect(imageCard).toBeVisible();
    await imageCard.click();

    // Verify Apply button is enabled and click it
    const applyBtn = page.getByTestId('keyword-suggest-apply-btn');
    await expect(applyBtn).toBeEnabled();
    await applyBtn.click();

    // Verify keywords appear in MetadataEditor
    await expect(page.getByText('infographic', { exact: true })).toBeVisible();
    await expect(page.getByText('roadmap', { exact: true })).toBeVisible();
    await expect(page.getByText('strategy', { exact: true })).toBeVisible();
  });
});
