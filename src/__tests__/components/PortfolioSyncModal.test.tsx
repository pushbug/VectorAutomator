import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SmartIdPasteModal } from '@/components/portfolio/SmartIdPasteModal';

describe('UT-UI-PORTFOLIO-SYNC-MODAL-01: SmartIdPasteModal Staged Visual Preview & Bulk Commit', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('does not render when isOpen is false', () => {
    render(
      <SmartIdPasteModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByTestId('smart-id-sync-modal')).not.toBeInTheDocument();
  });

  it('handles analysis dry-run and bulk commit of checked rows', async () => {
    // 1. Mock Preview Response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        preview: true,
        totalParsed: 2,
        exactCount: 1,
        fuzzyCount: 1,
        unmatchedCount: 0,
        rows: [
          {
            asId: '569029521',
            adobeTitle: '10 Important historical event timeline infographic brochure.',
            downloads: 1410,
            thumbnailUrl: 'https://as2.ftcdn.net/img1.jpg',
            status: 'exact',
            confidence: 1.0,
            isOverwrite: false,
            existingAsId: null,
            matchedImage: {
              id: 'img-1',
              code: '2408-01',
              title: '10 Important historical event timeline infographic brochure.',
              filePath: '/uploads/2408-01.jpg',
              asId: null,
              asDownloads: 0,
            },
            candidates: [],
          },
          {
            asId: '636376104',
            adobeTitle: 'Workflow lines infographic template',
            downloads: 1399,
            thumbnailUrl: 'https://as2.ftcdn.net/img2.jpg',
            status: 'fuzzy',
            confidence: 0.85,
            isOverwrite: false,
            existingAsId: null,
            matchedImage: {
              id: 'img-2',
              code: '2408-02',
              title: 'Workflow lines infographic 6 parts',
              filePath: '/uploads/2408-02.jpg',
              asId: null,
              asDownloads: 0,
            },
            candidates: [],
          },
        ],
      }),
    });

    // 2. Mock Commit Response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        committedCount: 1,
      }),
    });

    render(
      <SmartIdPasteModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByTestId('smart-id-sync-modal')).toBeInTheDocument();

    const textarea = screen.getByTestId('sync-paste-textarea');
    fireEvent.change(textarea, {
      target: {
        value: '569029521\t10 Important historical event timeline infographic brochure.\t1410',
      },
    });

    const submitBtn = screen.getByTestId('submit-sync-btn');
    fireEvent.click(submitBtn);

    // Verify transition to preview grid and staged alert banner
    await waitFor(() => {
      expect(screen.getByTestId('sync-preview-grid')).toBeInTheDocument();
      expect(screen.getByTestId('smart-id-staged-alert-banner')).toBeInTheDocument();
    });

    expect(screen.getByText(/569029521/)).toBeInTheDocument();
    expect(screen.getByText('2408-01')).toBeInTheDocument();
    expect(screen.getAllByText(/Exact/).length).toBeGreaterThan(0);
    expect(screen.getByText('Similar (85%)')).toBeInTheDocument();

    // Trigger Bulk Commit
    const applyBulkBtn = screen.getByTestId('apply-bulk-sync-btn');
    fireEvent.click(applyBulkBtn);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/portfolio/paste-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'commit',
        items: [
          {
            imageId: 'img-1',
            asId: '569029521',
          },
        ],
      }),
    });
  });
});

describe('UT-UI-PORTFOLIO-MANUAL-LINK-01: Manual Search and 1-by-1 Commit', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('allows user to manually pick an artwork from local DB and commit single row', async () => {
    // 1. Mock Preview with unmatched row
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        preview: true,
        totalParsed: 1,
        exactCount: 0,
        fuzzyCount: 0,
        unmatchedCount: 1,
        rows: [
          {
            asId: '777888999',
            adobeTitle: 'Custom Creative Illustration',
            downloads: 50,
            thumbnailUrl: 'https://as2.ftcdn.net/custom.jpg',
            status: 'unmatched',
            confidence: 0,
            isOverwrite: false,
            existingAsId: null,
            matchedImage: null,
            candidates: [],
          },
        ],
      }),
    });

    // 2. Mock DB search response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'img-custom',
            code: '2408-99',
            title: 'Custom Creative Illustration Local',
            filePath: '/uploads/custom.jpg',
            asId: null,
            asDownloads: 0,
          },
        ],
      }),
    });

    // 3. Mock single commit response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        committedCount: 1,
      }),
    });

    render(
      <SmartIdPasteModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByTestId('sync-paste-textarea');
    fireEvent.change(textarea, {
      target: {
        value: '777888999\tCustom Creative Illustration\t50',
      },
    });

    fireEvent.click(screen.getByTestId('submit-sync-btn'));

    await waitFor(() => {
      expect(screen.getAllByText(/Unmatched/).length).toBeGreaterThan(0);
    });

    // Click "Pick Artwork" button
    const pickBtn = screen.getByTestId('pick-artwork-btn');
    fireEvent.click(pickBtn);

    // Verify search box appears and trigger search selection
    await waitFor(() => {
      expect(screen.getByText(/Search Local DB/)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('2408-99')).toBeInTheDocument();
      expect(screen.getByText('Custom Creative Illustration Local')).toBeInTheDocument();
    });

    // Click candidate select button
    fireEvent.click(screen.getByTestId('select-search-candidate-btn'));

    // Now row should have matchedImage and Commit button
    await waitFor(() => {
      expect(screen.getByText('Commit')).toBeInTheDocument();
    });

    // Commit single row
    fireEvent.click(screen.getByText('Commit'));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/portfolio/paste-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'commit',
        items: [
          {
            imageId: 'img-custom',
            asId: '777888999',
          },
        ],
      }),
    });
  });

  it('allows user to unmatch a candidate and click Import as New to open Quick Import Dialog and create placeholder', async () => {
    // 1. Mock Preview with a fuzzy matched row
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        preview: true,
        totalParsed: 1,
        exactCount: 0,
        fuzzyCount: 1,
        unmatchedCount: 0,
        rows: [
          {
            asId: '345672354',
            adobeTitle: 'hacker anonymous criminal security internet network.',
            downloads: 100,
            thumbnailUrl: 'https://as2.ftcdn.net/hacker.jpg',
            status: 'fuzzy',
            confidence: 0.67,
            isOverwrite: true,
            existingAsId: '175524050',
            matchedImage: {
              id: 'img-1710-01',
              code: '1710-01',
              title: 'hacker criminal security internet',
              filePath: '/uploads/1710-01.jpg',
              asId: '175524050',
              asDownloads: 50,
            },
            candidates: [],
          },
        ],
      }),
    });

    // 2. Mock auto-code generation response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        nextCode: '2608-01',
      }),
    });

    // 3. Mock create_placeholder commit response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        committedCount: 1,
        createdItems: [
          {
            id: 'img-new-01',
            code: '2608-01',
            title: 'hacker anonymous criminal security internet network.',
            filePath: '',
            asId: '345672354',
            asDownloads: 0,
          },
        ],
      }),
    });

    render(
      <SmartIdPasteModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByTestId('sync-paste-textarea');
    fireEvent.change(textarea, {
      target: {
        value: '345672354\thacker anonymous criminal security internet network.\t100',
      },
    });

    fireEvent.click(screen.getByTestId('submit-sync-btn'));

    await waitFor(() => {
      expect(screen.getByText('Similar (67%)')).toBeInTheDocument();
      expect(screen.getByText('1710-01')).toBeInTheDocument();
    });

    // Click "Unmatch" button to detach 1710-01
    const unmatchBtn = screen.getByTestId('unmatch-row-btn');
    fireEvent.click(unmatchBtn);

    // Row should transition to Unmatched state
    await waitFor(() => {
      expect(screen.getByText('No direct match in DB')).toBeInTheDocument();
      expect(screen.getByTestId('create-placeholder-btn')).toBeInTheDocument();
    });

    // Click "+ Import as New" to open Quick Import Dialog
    const importNewBtn = screen.getByTestId('create-placeholder-btn');
    fireEvent.click(importNewBtn);

    // Quick Import Dialog should appear
    await waitFor(() => {
      expect(screen.getByTestId('quick-import-dialog')).toBeInTheDocument();
      expect(screen.getByText('Import as New Artwork')).toBeInTheDocument();
      expect(screen.getByTestId('quick-import-date-picker-trigger')).toBeInTheDocument();
      expect(screen.getByTestId('quick-import-code-input')).toHaveValue('2608-01');
    });

    // Fill Title, Keywords and Category
    const keywordsInput = screen.getByTestId('quick-import-keywords-input');
    fireEvent.change(keywordsInput, { target: { value: 'hacker, security, internet' } });

    const categoryInput = screen.getByTestId('quick-import-category-input');
    fireEvent.change(categoryInput, { target: { value: 'Technology' } });

    // Confirm Quick Import
    const confirmBtn = screen.getByTestId('confirm-quick-import-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(screen.getByText('2608-01')).toBeInTheDocument();
      expect(screen.getAllByText(/Already Synced/).length).toBeGreaterThan(0);
      expect(screen.queryByText('No direct match in DB')).not.toBeInTheDocument();
    });

    const lastCall = (global.fetch as any).mock.calls[(global.fetch as any).mock.calls.length - 1];
    expect(lastCall[0]).toBe('/api/portfolio/paste-sync');
    expect(lastCall[1].method).toBe('POST');
    const parsedBody = JSON.parse(lastCall[1].body);
    expect(parsedBody).toEqual({
      action: 'commit',
      items: [
        {
          action: 'create_placeholder',
          title: 'hacker anonymous criminal security internet network.',
          asId: '345672354',
          date: expect.any(String),
          code: '2608-01',
          keywords: 'hacker, security, internet',
          category: 'Technology',
        },
      ],
    });
  });

  it('renders SingleDatePicker popover smoothly in Quick Import Dialog without clipping', async () => {
    // 1. Mock Preview with unmatched row
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        preview: true,
        totalParsed: 1,
        exactCount: 0,
        fuzzyCount: 0,
        unmatchedCount: 1,
        rows: [
          {
            asId: '999888777',
            adobeTitle: 'Global Network Vector',
            downloads: 12,
            thumbnailUrl: '',
            status: 'unmatched',
            confidence: 0,
            isOverwrite: false,
            existingAsId: null,
            matchedImage: null,
            candidates: [],
          },
        ],
      }),
    });

    // 2. Mock auto-code fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ nextCode: '2608-50' }),
    });

    render(
      <SmartIdPasteModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByTestId('sync-paste-textarea');
    fireEvent.change(textarea, {
      target: { value: '999888777\tGlobal Network Vector\t12' },
    });
    fireEvent.click(screen.getByTestId('submit-sync-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('create-placeholder-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('create-placeholder-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('quick-import-dialog')).toBeInTheDocument();
    });

    // Click DatePicker Trigger
    const trigger = screen.getByTestId('quick-import-date-picker-trigger');
    fireEvent.click(trigger);

    // Popover should be visible in document
    await waitFor(() => {
      expect(screen.getByTestId('quick-import-date-picker-popover')).toBeInTheDocument();
      expect(screen.getByTestId('quick-import-date-picker-done-btn')).toBeInTheDocument();
    });
  });

  it('UT-UI-SMART-ID-UNSAVED-01: triggers discard confirmation dialog when closing with uncommitted staged rows', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        preview: true,
        totalParsed: 1,
        exactCount: 1,
        fuzzyCount: 0,
        unmatchedCount: 0,
        rows: [
          {
            asId: '111222333',
            adobeTitle: 'Business Process Flow',
            downloads: 10,
            thumbnailUrl: '',
            status: 'exact',
            confidence: 1.0,
            isAlreadySynced: false,
            isOverwrite: false,
            existingAsId: null,
            matchedImage: {
              id: 'img-1',
              code: '2608-01',
              title: 'Business Process Flow',
              filePath: '/uploads/2608-01.jpg',
              asId: null,
              asDownloads: 0,
            },
            candidates: [],
          },
        ],
      }),
    });

    render(
      <SmartIdPasteModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByTestId('sync-paste-textarea');
    fireEvent.change(textarea, {
      target: { value: '111222333\tBusiness Process Flow\t10' },
    });
    fireEvent.click(screen.getByTestId('submit-sync-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('apply-bulk-sync-btn')).toBeInTheDocument();
    });

    // Try closing via close button in header
    const closeBtn = screen.getByTestId('close-sync-modal-btn');
    fireEvent.click(closeBtn);

    // Discard confirmation dialog should appear instead of immediate close
    expect(screen.getByTestId('smart-id-discard-dialog')).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();

    // Click Discard & Exit
    const discardBtn = screen.getByTestId('smart-id-discard-confirm-btn');
    fireEvent.click(discardBtn);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('UT-UI-SMART-ID-UNSAVED-SAVE-01: clicking Save & Close in discard dialog triggers bulk commit', async () => {
    // 1. Mock dry-run analyze response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        preview: true,
        totalParsed: 1,
        exactCount: 1,
        fuzzyCount: 0,
        unmatchedCount: 0,
        rows: [
          {
            asId: '777888999',
            adobeTitle: 'Cyber Security Abstract',
            downloads: 5,
            thumbnailUrl: '',
            status: 'exact',
            confidence: 1.0,
            isAlreadySynced: false,
            isOverwrite: false,
            existingAsId: null,
            matchedImage: {
              id: 'img-cyber',
              code: '2608-99',
              title: 'Cyber Security Abstract',
              filePath: '/uploads/2608-99.jpg',
              asId: null,
              asDownloads: 0,
            },
            candidates: [],
          },
        ],
      }),
    });

    // 2. Mock commit response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        committedCount: 1,
        items: [{ asId: '777888999', imageId: 'img-cyber' }],
      }),
    });

    render(
      <SmartIdPasteModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const textarea = screen.getByTestId('sync-paste-textarea');
    fireEvent.change(textarea, {
      target: { value: '777888999\tCyber Security Abstract\t5' },
    });
    fireEvent.click(screen.getByTestId('submit-sync-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('apply-bulk-sync-btn')).toBeInTheDocument();
    });

    // Trigger close to show discard modal
    const closeBtn = screen.getByTestId('close-sync-modal-btn');
    fireEvent.click(closeBtn);

    expect(screen.getByTestId('smart-id-discard-dialog')).toBeInTheDocument();

    // Click Save & Close
    const saveBtn = screen.getByTestId('smart-id-discard-save-btn');
    fireEvent.click(saveBtn);

    // Should call commit fetch with action: 'commit'
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/portfolio/paste-sync',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"action":"commit"'),
        })
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});



