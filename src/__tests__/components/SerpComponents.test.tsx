import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SerpSummaryCards } from '@/components/serp/SerpSummaryCards';
import { SerpTable, SerpRankedItem } from '@/components/serp/SerpTable';
import { SmartSerpPasteModal } from '@/components/serp/SmartSerpPasteModal';
import { ArtworkSerpDrawer } from '@/components/serp/ArtworkSerpDrawer';
import { FullSerpModal } from '@/components/serp/FullSerpModal';

describe('SERP UI Components Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('SerpSummaryCards', () => {
    it('renders all 4 summary KPI cards correctly', () => {
      render(
        <SerpSummaryCards
          summary={{
            totalKeywords: 8,
            page1Artworks: 14,
            top10Artworks: 4,
            bestRank: '#2 infographic',
          }}
        />
      );

      expect(screen.getByTestId('serp-kpi-keywords')).toHaveTextContent('8');
      expect(screen.getByTestId('serp-kpi-page1-artworks')).toHaveTextContent('14');
      expect(screen.getByTestId('serp-kpi-top10')).toHaveTextContent('4');
      expect(screen.getByTestId('serp-kpi-best-rank')).toHaveTextContent('#2 infographic');
    });
  });

  describe('SerpTable (UT-UI-SERP-TABLE-01)', () => {
    const mockItems: SerpRankedItem[] = [
      {
        id: 'item-1',
        rank: 2,
        assetId: '502717541',
        title: 'Presentation business infographic template',
        keyword: 'infographic',
        platform: 'Adobe Stock',
        pageNumber: 1,
        searchedAt: '2026-08-24T00:00:00.000Z',
        serpQueryId: 'query-1',
        matchedImageId: 'img-1',
        imageCode: '2410-77',
        imageTitle: 'Presentation business infographic template',
        imageFilePath: '/uploads/2410-77.jpg',
        previousRank: 5,
        rankDelta: 3,
        isNew: false,
        asDownloads: 142,
        totalDownloads: 142,
        totalEarnings: 156.2,
      },
      {
        id: 'item-2',
        rank: 8,
        assetId: '514704380',
        title: 'Timeline process infographic design',
        keyword: 'business',
        platform: 'Adobe Stock',
        pageNumber: 1,
        searchedAt: '2026-08-24T00:00:00.000Z',
        serpQueryId: 'query-2',
        matchedImageId: 'img-2',
        imageCode: '2605-25',
        imageTitle: 'Timeline process infographic design',
        imageFilePath: null,
        previousRank: null,
        rankDelta: null,
        isNew: true,
        asDownloads: 10,
        totalDownloads: 15,
        totalEarnings: 18.0,
      },
    ];

    it('renders ranked items table with delta badges and sales stats', () => {
      const handleSelectArtwork = vi.fn();
      const handleViewFullSerp = vi.fn();

      render(
        <SerpTable
          items={mockItems}
          isLoading={false}
          search=""
          onSearchChange={vi.fn()}
          onSelectArtwork={handleSelectArtwork}
          onViewFullSerp={handleViewFullSerp}
        />
      );

      expect(screen.getByTestId('serp-table')).toBeInTheDocument();
      expect(screen.getByText('2410-77')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('▲ +3')).toBeInTheDocument();
      expect(screen.getByText('142')).toBeInTheDocument();
      expect(screen.getByText('$156.20')).toBeInTheDocument();

      // Check isNew badge
      expect(screen.getByText('★ NEW')).toBeInTheDocument();
    });

    it('triggers artwork drawer and full serp callbacks on click', () => {
      const handleSelectArtwork = vi.fn();
      const handleViewFullSerp = vi.fn();

      render(
        <SerpTable
          items={mockItems}
          isLoading={false}
          search=""
          onSearchChange={vi.fn()}
          onSelectArtwork={handleSelectArtwork}
          onViewFullSerp={handleViewFullSerp}
        />
      );

      // Click on image thumbnail/code to inspect
      fireEvent.click(screen.getByText('2410-77'));
      expect(handleSelectArtwork).toHaveBeenCalledWith('img-1');
    });

    it('triggers delete snapshot callback when clicking delete in more options menu', () => {
      const handleSelectArtwork = vi.fn();
      const handleViewFullSerp = vi.fn();
      const handleDeleteSnapshot = vi.fn();

      render(
        <SerpTable
          items={mockItems}
          isLoading={false}
          search=""
          onSearchChange={vi.fn()}
          onSelectArtwork={handleSelectArtwork}
          onViewFullSerp={handleViewFullSerp}
          onDeleteSnapshot={handleDeleteSnapshot}
        />
      );

      const menuBtn = screen.getByTestId('serp-row-menu-btn-item-1');
      fireEvent.click(menuBtn);

      const deleteBtn = screen.getByTestId('serp-row-delete-btn-item-1');
      fireEvent.click(deleteBtn);

      expect(handleDeleteSnapshot).toHaveBeenCalledWith('query-1', 'infographic', '2026-08-24T00:00:00.000Z');
    });

    it('supports selecting all checkboxes and shows bulk delete bar', () => {
      const handleBulkDelete = vi.fn();

      render(
        <SerpTable
          items={mockItems}
          isLoading={false}
          search=""
          onSearchChange={vi.fn()}
          onSelectArtwork={vi.fn()}
          onViewFullSerp={vi.fn()}
          onDeleteBulkSnapshots={handleBulkDelete}
        />
      );

      const selectAll = screen.getByTestId('serp-select-all-checkbox');
      fireEvent.click(selectAll);

      expect(screen.getByTestId('serp-bulk-floating-bar')).toBeInTheDocument();

      const bulkDeleteBtn = screen.getByTestId('serp-bulk-delete-btn');
      fireEvent.click(bulkDeleteBtn);

      expect(handleBulkDelete).toHaveBeenCalledWith(['query-1', 'query-2']);
    });

    it('opens keyword combobox, filters and selects a keyword', () => {
      const handleKeywordChange = vi.fn();

      render(
        <SerpTable
          items={mockItems}
          isLoading={false}
          search=""
          onSearchChange={vi.fn()}
          onSelectArtwork={vi.fn()}
          onViewFullSerp={vi.fn()}
          trackedKeywords={['infographic', 'business template', 'diagram']}
          onKeywordFilterChange={handleKeywordChange}
        />
      );

      const dropdownBtn = screen.getByTestId('serp-keyword-filter-dropdown-btn');
      expect(dropdownBtn).toBeInTheDocument();
      fireEvent.click(dropdownBtn);

      expect(screen.getByTestId('serp-keyword-filter-popover')).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText('Search keywords...');
      fireEvent.change(searchInput, { target: { value: 'diagram' } });

      const optionBtn = screen.getByTestId('serp-keyword-option-diagram');
      fireEvent.click(optionBtn);

      expect(handleKeywordChange).toHaveBeenCalledWith('diagram');
    });
  });

  describe('SmartSerpPasteModal (UT-UI-SERP-PASTE-MODAL-01)', () => {
    it('detects parsed count and keyword from clipboard text', async () => {
      const handleClose = vi.fn();
      const handleSuccess = vi.fn();

      const rawTsv = [
        'Keyword\tPage\tRank\tAsset ID\tAuthor\tTitle',
        'infographic\t1\t1\t1930409866\tWD 99\tInfographic Template',
        'infographic\t1\t2\t502717541\tkanpisut\tPresentation Infographic',
      ].join('\n');

      render(
        <SmartSerpPasteModal
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      );

      expect(screen.getByTestId('serp-smart-paste-modal')).toBeInTheDocument();

      const textarea = screen.getByTestId('serp-smart-paste-textarea');
      fireEvent.change(textarea, { target: { value: rawTsv } });

      expect(screen.getByText(/2 items parsed/)).toBeInTheDocument();
    });

    it('handles live sync preview and completion', async () => {
      const handleClose = vi.fn();
      const handleSuccess = vi.fn();

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          totalItems: 2,
          myItems: [
            {
              rank: 2,
              assetId: '502717541',
              title: 'Presentation Infographic',
              imageCode: '2410-77',
            },
          ],
        }),
      } as any);

      render(
        <SmartSerpPasteModal
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      );

      const textarea = screen.getByTestId('serp-smart-paste-textarea');
      fireEvent.change(textarea, { target: { value: 'infographic\t1\t2\t502717541\tTest' } });

      const submitBtn = screen.getByTestId('serp-smart-paste-submit-btn');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Snapshot Sync Complete')).toBeInTheDocument();
        expect(screen.getByText('Done & View Dashboard')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Done & View Dashboard'));
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  describe('ArtworkSerpDrawer (UT-UI-SERP-ARTWORK-DRAWER-01)', () => {
    it('fetches and renders artwork keyword progression and snapshot history', async () => {
      const handleClose = vi.fn();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          artwork: {
            id: 'img-1',
            code: '2410-77',
            title: 'Presentation business infographic template',
            filePath: '/uploads/2410-77.jpg',
            asId: '502717541',
            totalDownloads: 142,
            asDownloads: 142,
            totalEarnings: 156.2,
          },
          activeKeywords: [
            {
              keyword: 'infographic',
              currentRank: 2,
              pageNumber: 1,
              lastCheckedAt: '2026-08-24T00:00:00.000Z',
              previousRank: 5,
              rankDelta: 3,
              isNew: false,
              bestRank: 2,
              totalChecks: 3,
            },
          ],
          history: [
            {
              date: '2026-08-24T00:00:00.000Z',
              keyword: 'infographic',
              rank: 2,
              previousRank: 5,
              rankDelta: 3,
              isNew: false,
              pageNumber: 1,
              milestone: 'Top 3 🔥',
              cumulativeDownloads: 142,
              cumulativeEarnings: 156.2,
            },
          ],
        }),
      } as any);

      render(
        <ArtworkSerpDrawer
          imageId="img-1"
          onClose={handleClose}
        />
      );

      expect(screen.getByTestId('artwork-serp-drawer')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('2410-77')).toBeInTheDocument();
        expect(screen.getAllByText('infographic').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('142').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('$156.20').length).toBeGreaterThanOrEqual(1);
      });

      // Test backdrop click closes the drawer
      const backdrop = screen.getByTestId('artwork-serp-backdrop');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('FullSerpModal (UT-UI-FULL-SERP-MODAL-01)', () => {
    it('renders snapshot items, filters by My Artwork and Unknown Author, and closes on backdrop click', async () => {
      const handleClose = vi.fn();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            id: 'q-1',
            keyword: 'infographic',
            platform: 'Adobe Stock',
            searchedAt: '2026-08-24T00:00:00.000Z',
            totalItems: 3,
            items: [
              {
                id: 'item-1',
                rank: 1,
                assetId: '1001',
                title: 'Competitor Infographic',
                author: 'Competitor A',
                isMine: false,
              },
              {
                id: 'item-2',
                rank: 2,
                assetId: '1002',
                title: 'My Presentation Infographic',
                author: null,
                isMine: true,
                matchedImage: { code: '2410-77', title: 'My Presentation Infographic' },
              },
              {
                id: 'item-3',
                rank: 3,
                assetId: '1003',
                title: 'Unknown Competitor Asset',
                author: null,
                isMine: false,
              },
            ],
          },
        }),
      } as any);

      render(<FullSerpModal queryId="q-1" onClose={handleClose} />);

      expect(screen.getByTestId('full-serp-modal')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/Full Ranking Snapshot:/)).toBeInTheDocument();
        expect(screen.getByText('All (3)')).toBeInTheDocument();
        expect(screen.getByText('My Artwork (1)')).toBeInTheDocument();
        expect(screen.getByText('Unknown Author (1)')).toBeInTheDocument();
      });

      // Filter by My Artwork
      const myArtworkBtn = screen.getByTestId('filter-my-artwork-btn');
      fireEvent.click(myArtworkBtn);

      expect(screen.getByText('My Presentation Infographic')).toBeInTheDocument();
      expect(screen.queryByText('Competitor Infographic')).not.toBeInTheDocument();

      // Click backdrop to close
      const modal = screen.getByTestId('full-serp-modal');
      fireEvent.click(modal);
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
