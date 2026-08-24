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

    // Verify transition to preview grid
    await waitFor(() => {
      expect(screen.getByTestId('sync-preview-grid')).toBeInTheDocument();
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
  });
});
