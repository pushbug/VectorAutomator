import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SmartIdPasteModal } from '@/components/portfolio/SmartIdPasteModal';

describe('UT-UI-SMART-PASTE-PLATFORM-01: SmartIdPasteModal Dual-Platform Discrimination & Shutterstock Flow', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders segmented platform toggle, defaults to Adobe Stock, and allows manual switching', () => {
    render(
      <SmartIdPasteModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByTestId('smart-id-paste-modal')).toBeInTheDocument();
    expect(screen.getByTestId('smart-id-paste-platform-select')).toBeInTheDocument();

    const adobeBtn = screen.getByTestId('smart-id-paste-platform-adobe');
    const shutterstockBtn = screen.getByTestId('smart-id-paste-platform-shutterstock');

    expect(adobeBtn).toBeInTheDocument();
    expect(shutterstockBtn).toBeInTheDocument();

    // Default title is Adobe
    expect(screen.getByText('Smart Adobe Contributor ID Matcher')).toBeInTheDocument();

    // Manually click Shutterstock
    fireEvent.click(shutterstockBtn);

    // Title and labels switch to Shutterstock
    expect(screen.getByText('Smart Shutterstock Contributor ID Matcher')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Click 'Copy Table \(TSV\)' in the Shutterstock Contributor extension/)
    ).toBeInTheDocument();

    // Switch back to Adobe
    fireEvent.click(adobeBtn);
    expect(screen.getByText('Smart Adobe Contributor ID Matcher')).toBeInTheDocument();
  });

  it('auto-switches platform from Adobe to Shutterstock upon pasting Shutterstock TSV header signature', () => {
    render(
      <SmartIdPasteModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Smart Adobe Contributor ID Matcher')).toBeInTheDocument();

    const textarea = screen.getByTestId('sync-paste-textarea');
    fireEvent.change(textarea, {
      target: {
        value: 'Shutterstock ID\tTitle / Filename\tStatus\tMedia Type\tThumbnail URL\n228833441\tMinimalist Infographic 282.eps\tApproved\tIllustration\thttps://image.shutterstock.com/thumb.jpg',
      },
    });

    // Auto-detection switches active mode to Shutterstock
    expect(screen.getByText('Smart Shutterstock Contributor ID Matcher')).toBeInTheDocument();
  });

  it('analyzes Shutterstock data with platform param, renders SS ID badge in preview, and commits with ssId', async () => {
    // 1. Mock Preview Response for Shutterstock
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
            asId: '228833441',
            ssId: '228833441',
            platform: 'Shutterstock',
            adobeTitle: 'Minimalist Infographic 282.eps',
            downloads: 0,
            thumbnailUrl: 'https://image.shutterstock.com/thumb.jpg',
            status: 'exact',
            confidence: 1.0,
            isOverwrite: false,
            existingAsId: null,
            matchedImage: {
              id: 'img-shutter-1',
              code: '2408-88',
              title: 'Minimalist Infographic',
              filePath: '282.eps',
              asId: null,
              ssId: null,
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

    // Switch to Shutterstock
    fireEvent.click(screen.getByTestId('smart-id-paste-platform-shutterstock'));

    const textarea = screen.getByTestId('sync-paste-textarea');
    fireEvent.change(textarea, {
      target: {
        value: '228833441\tMinimalist Infographic 282.eps\tApproved\tIllustration\thttps://image.shutterstock.com/thumb.jpg',
      },
    });

    // Click Analyze button using smart-id-paste-analyze-btn
    const analyzeBtn = screen.getByTestId('smart-id-paste-analyze-btn');
    fireEvent.click(analyzeBtn);

    // Verify analyze fetch sent platform: 'Shutterstock'
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/portfolio/paste-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '228833441\tMinimalist Infographic 282.eps\tApproved\tIllustration\thttps://image.shutterstock.com/thumb.jpg',
          platform: 'Shutterstock',
        }),
      });
    });

    // Verify Preview Table shows Shutterstock Contributor Live header and SS ID badge
    await waitFor(() => {
      expect(screen.getByText('Shutterstock Contributor Live')).toBeInTheDocument();
      expect(screen.getByText('SS ID: 228833441')).toBeInTheDocument();
      expect(screen.getByText('2408-88')).toBeInTheDocument();
    });

    // Click bulk commit using smart-id-paste-commit-btn
    const commitBtn = screen.getByTestId('smart-id-paste-commit-btn');
    fireEvent.click(commitBtn);

    // Verify commit fetch sent platform: 'Shutterstock' and ssId
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('/api/portfolio/paste-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          platform: 'Shutterstock',
          items: [
            {
              imageId: 'img-shutter-1',
              asId: '228833441',
              ssId: '228833441',
            },
          ],
        }),
      });
    });
  });
});
