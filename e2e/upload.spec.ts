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
    await keywordsInput.fill('user, edited, keywords');

    // Save metadata
    const saveBtn = page.getByTestId('save-metadata-btn');
    await saveBtn.click();

    // Verify download buttons become enabled
    const downloadJpgBtn = page.getByTestId('download-jpg-btn');
    await expect(downloadJpgBtn).not.toBeDisabled();
  });
});
