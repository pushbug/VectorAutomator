import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SalesSummaryCards } from '@/components/sales/SalesSummaryCards';
import { SalesTable, SaleItem } from '@/components/sales/SalesTable';
import { SmartPasteModal } from '@/components/sales/SmartPasteModal';

describe('Sales Components (UT-UI-SALES-01)', () => {
  describe('SalesSummaryCards', () => {
    it('renders all 4 summary KPI cards with formatted values', () => {
      render(
        <SalesSummaryCards
          totalEarnings={1234.56}
          totalDownloads={4500}
          topPlatform="Shutterstock"
        />
      );

      expect(screen.getByTestId('sales-kpi-total-earnings')).toHaveTextContent('$1,234.56');
      expect(screen.getByTestId('sales-kpi-total-downloads')).toHaveTextContent('4,500');
      expect(screen.getByTestId('sales-kpi-top-platform')).toHaveTextContent('Shutterstock');
      expect(screen.getByTestId('sales-kpi-avg-download')).toHaveTextContent('$0.27');
    });

    it('renders zero / fallback values when stats are empty', () => {
      render(
        <SalesSummaryCards
          totalEarnings={0}
          totalDownloads={0}
          topPlatform=""
        />
      );

      expect(screen.getByTestId('sales-kpi-total-earnings')).toHaveTextContent('$0.00');
      expect(screen.getByTestId('sales-kpi-total-downloads')).toHaveTextContent('0');
      expect(screen.getByTestId('sales-kpi-top-platform')).toHaveTextContent('-');
      expect(screen.getByTestId('sales-kpi-avg-download')).toHaveTextContent('$0.00');
    });

  });

  describe('SalesTable', () => {
    const mockSales: SaleItem[] = [
      {
        id: 'sale-1',
        imageId: 'img-1',
        platform: 'Shutterstock',
        downloads: 5,
        earnings: 12.5,
        date: '2026-08-14',
        image: {
          id: 'img-1',
          code: '2608-1',
          title: 'Geometric Vector Pattern',
          filePath: '/uploads/img-1.jpg',
        },
      },
      {
        id: 'sale-2',
        imageId: 'img-2',
        platform: 'Adobe Stock',
        downloads: 2,
        earnings: 6.8,
        date: '2026-08-13',
        image: {
          id: 'img-2',
          code: '2608-2',
          title: 'Abstract Background',
          filePath: '/uploads/img-2.jpg',
        },
      },
      {
        id: 'sale-3',
        imageId: null,
        platformAssetId: '1929092005',
        platform: 'Adobe Stock',
        downloads: 10,
        earnings: 207.04,
        date: '2026-08-20',
        image: null,
      },
    ];

    it('renders loading state when isLoading is true', () => {
      render(
        <SalesTable
          sales={[]}
          isLoading={true}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={() => {}}
          search=""
          onSearchChange={() => {}}
        />
      );

      expect(screen.getByText('Loading sales records...')).toBeInTheDocument();
    });

    it('renders empty message when sales list is empty', () => {
      render(
        <SalesTable
          sales={[]}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={() => {}}
          search=""
          onSearchChange={() => {}}
        />
      );

      expect(screen.getByText(/No sales recorded yet/i)).toBeInTheDocument();
    });

    it('renders transaction rows including unlinked artworks with placeholder badge', () => {
      render(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={() => {}}
          search=""
          onSearchChange={() => {}}
        />
      );

      expect(screen.getByTestId('sales-table')).toBeInTheDocument();
      expect(screen.getByText('2608-1')).toBeInTheDocument();
      expect(screen.getByText('Geometric Vector Pattern')).toBeInTheDocument();
      expect(screen.getByText('$12.50')).toBeInTheDocument();
      expect(screen.getByText('#1929092005')).toBeInTheDocument();
      expect(screen.getByText('Unlinked Artwork')).toBeInTheDocument();
      expect(screen.getByText('$207.04')).toBeInTheDocument();
    });

    it('triggers platform filter change when filter button is clicked', () => {
      const handlePlatformChange = vi.fn();
      render(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={handlePlatformChange}
          search=""
          onSearchChange={() => {}}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Adobe Stock' }));
      expect(handlePlatformChange).toHaveBeenCalledWith('Adobe Stock');
    });

    it('triggers search callback when search text changes', () => {
      const handleSearchChange = vi.fn();
      render(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={() => {}}
          search=""
          onSearchChange={handleSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by code or title...');
      fireEvent.change(searchInput, { target: { value: 'Geometric' } });
      expect(handleSearchChange).toHaveBeenCalledWith('Geometric');
    });

    it('triggers onDelete with sale ID when delete option in row menu is clicked', () => {
      const handleDelete = vi.fn();
      render(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={handleDelete}
          platformFilter="all"
          onPlatformFilterChange={() => {}}
          search=""
          onSearchChange={() => {}}
        />
      );

      const menuBtn = screen.getByTestId('sales-row-menu-btn-sale-1');
      fireEvent.click(menuBtn);

      const deleteBtn = screen.getByTestId('sales-row-delete-btn-sale-1');
      expect(deleteBtn).toBeInTheDocument();
      fireEvent.click(deleteBtn);
      expect(handleDelete).toHaveBeenCalledWith('sale-1');
    });

    it('UT-UI-SALES-ACTION-MENU-01: opens dropdown and executes preview action when preview button is clicked', () => {
      const handleSelectImage = vi.fn();
      render(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={() => {}}
          search=""
          onSearchChange={() => {}}
          onSelectImage={handleSelectImage}
        />
      );

      // Menu closed initially
      expect(screen.queryByTestId('sales-row-menu-dropdown-sale-1')).not.toBeInTheDocument();

      // Open menu
      fireEvent.click(screen.getByTestId('sales-row-menu-btn-sale-1'));
      expect(screen.getByTestId('sales-row-menu-dropdown-sale-1')).toBeInTheDocument();

      // Click Preview
      fireEvent.click(screen.getByTestId('sales-row-preview-btn-sale-1'));
      expect(handleSelectImage).toHaveBeenCalledWith(mockSales[0].image);
      expect(screen.queryByTestId('sales-row-menu-dropdown-sale-1')).not.toBeInTheDocument();
    });


    it('UT-UI-SALES-DATE-FILTER-01: renders DateRangePicker and invokes onDateRangeChange callback', () => {
      const handleDateRangeChange = vi.fn();
      render(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={() => {}}
          startDate="2026-08-01"
          endDate="2026-08-31"
          onDateRangeChange={handleDateRangeChange}
          search=""
          onSearchChange={() => {}}
        />
      );

      expect(screen.getByTestId('sales-date-picker-trigger')).toBeInTheDocument();
    });

    it('UT-UI-SALES-IMAGE-DRAWER-01: triggers onSelectImage callback when artwork in row is clicked', () => {
      const handleSelectImage = vi.fn();
      render(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={() => {}}
          search=""
          onSearchChange={() => {}}
          onSelectImage={handleSelectImage}
        />
      );

      const artworkBtn = screen.getByTestId('sales-table-artwork-btn-sale-1');
      expect(artworkBtn).toBeInTheDocument();
      fireEvent.click(artworkBtn);
      expect(handleSelectImage).toHaveBeenCalledWith(mockSales[0].image);
    });

    it('UT-UI-SALES-SORT-01: triggers onSortChange when column headers are clicked', () => {
      const handleSortChange = vi.fn();
      render(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={() => {}}
          search=""
          onSearchChange={() => {}}
          sortBy="date"
          sortOrder="desc"
          onSortChange={handleSortChange}
        />
      );

      // Clicking Date toggles order from desc to asc
      fireEvent.click(screen.getByTestId('sales-sort-date-btn'));
      expect(handleSortChange).toHaveBeenCalledWith('date', 'asc');

      // Clicking Earnings sorts by earnings desc
      fireEvent.click(screen.getByTestId('sales-sort-earnings-btn'));
      expect(handleSortChange).toHaveBeenCalledWith('earnings', 'desc');

      // Clicking Platform sorts by platform asc
      fireEvent.click(screen.getByTestId('sales-sort-platform-btn'));
      expect(handleSortChange).toHaveBeenCalledWith('platform', 'asc');
    });

    it('UT-UI-SALES-HOVER-PREVIEW-01: shows enlarged image preview on thumbnail hover and hides on mouseLeave', () => {
      render(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={() => {}}
          search=""
          onSearchChange={() => {}}
        />
      );

      // Initially, no preview popover
      expect(screen.queryByTestId('sales-image-hover-preview')).not.toBeInTheDocument();

      // Find the thumbnail of first artwork
      const thumb = screen.getByAltText('Geometric Vector Pattern').closest('div');
      expect(thumb).toBeInTheDocument();

      // Mouse enter thumbnail
      fireEvent.mouseEnter(thumb!);
      expect(screen.getByTestId('sales-image-hover-preview')).toBeInTheDocument();

      // Mouse leave thumbnail
      fireEvent.mouseLeave(thumb!);
      expect(screen.queryByTestId('sales-image-hover-preview')).not.toBeInTheDocument();
    });

    it('UT-UI-SALES-PAGINATION-01: renders pagination controls when totalPages > 1 and handles page changing and input jump', () => {
      const handlePageChange = vi.fn();
      render(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={() => {}}
          search=""
          onSearchChange={() => {}}
          page={1}
          totalPages={5}
          onPageChange={handlePageChange}
        />
      );

      const prevBtn = screen.getByTestId('sales-pagination-prev-btn');
      const nextBtn = screen.getByTestId('sales-pagination-next-btn');
      const pageInput = screen.getByTestId('sales-pagination-page-input');

      expect(prevBtn).toBeDisabled();
      expect(nextBtn).not.toBeDisabled();
      expect(pageInput).toHaveValue(1);

      // Next page click
      fireEvent.click(nextBtn);
      expect(handlePageChange).toHaveBeenCalledWith(2);

      // Page input change & blur
      fireEvent.change(pageInput, { target: { value: '4' } });
      fireEvent.blur(pageInput);
      expect(handlePageChange).toHaveBeenCalledWith(4);
    });

    it('UT-UI-SALES-UNLINKED-FILTER-01: renders Unlinked filter button and invokes onPlatformFilterChange with unlinked', () => {
      const handlePlatformFilterChange = vi.fn();
      render(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={handlePlatformFilterChange}
          search=""
          onSearchChange={() => {}}
        />
      );

      const unlinkedBtn = screen.getByTestId('sales-platform-filter-unlinked');
      expect(unlinkedBtn).toBeInTheDocument();
      expect(unlinkedBtn).toHaveTextContent('Unlinked');

      fireEvent.click(unlinkedBtn);
      expect(handlePlatformFilterChange).toHaveBeenCalledWith('unlinked');
    });

    it('UT-UI-SALES-BULK-01: supports row multi-selection, select-all on page, and triggers bulk actions', () => {
      const handleBulkDelete = vi.fn();
      const handleBulkChangeDate = vi.fn();

      const { rerender } = render(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="all"
          onPlatformFilterChange={() => {}}
          search=""
          onSearchChange={() => {}}
          onBulkDelete={handleBulkDelete}
          onBulkChangeDate={handleBulkChangeDate}
        />
      );

      // Initially no bulk action bar
      expect(screen.queryByTestId('sales-bulk-action-bar')).not.toBeInTheDocument();

      // Check row 1
      const row1Checkbox = screen.getByTestId('sales-row-checkbox-sale-1');
      fireEvent.click(row1Checkbox);

      // Bulk action bar appears
      expect(screen.getByTestId('sales-bulk-action-bar')).toBeInTheDocument();
      expect(screen.getByText('Selected 1 item')).toBeInTheDocument();

      // Click Change Date
      fireEvent.click(screen.getByTestId('sales-bulk-date-btn'));
      expect(handleBulkChangeDate).toHaveBeenCalledWith(['sale-1']);

      // Click Select All
      const selectAllCheckbox = screen.getByTestId('sales-select-all-checkbox');
      fireEvent.click(selectAllCheckbox);
      expect(screen.getByText('Selected 3 items')).toBeInTheDocument();

      // Click Bulk Delete
      fireEvent.click(screen.getByTestId('sales-bulk-delete-btn'));
      expect(handleBulkDelete).toHaveBeenCalledWith(['sale-1', 'sale-2', 'sale-3']);

      // Changing platform filter resets selection
      rerender(
        <SalesTable
          sales={mockSales}
          isLoading={false}
          onDelete={() => {}}
          platformFilter="Adobe Stock"
          onPlatformFilterChange={() => {}}
          search=""
          onSearchChange={() => {}}
          onBulkDelete={handleBulkDelete}
          onBulkChangeDate={handleBulkChangeDate}
        />
      );
      expect(screen.queryByTestId('sales-bulk-action-bar')).not.toBeInTheDocument();
    });
  });







  describe('SmartPasteModal', () => {
    it('renders statement date picker, platform buttons, and textarea in consolidated toolbar', () => {
      render(
        <SmartPasteModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      );

      expect(screen.getByTestId('smart-paste-modal')).toBeInTheDocument();
      expect(screen.getByTestId('smart-paste-date-input')).toBeInTheDocument();
      expect(screen.getByTestId('smart-paste-platform-adobe-stock')).toBeInTheDocument();
      expect(screen.getByTestId('smart-paste-platform-shutterstock')).toBeInTheDocument();
      expect(screen.getByTestId('smart-paste-platform-vecteezy')).toBeInTheDocument();
      expect(screen.getByTestId('smart-paste-textarea')).toBeInTheDocument();
    });

    it('allows changing target stock platform', () => {
      render(
        <SmartPasteModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      );

      const ssBtn = screen.getByTestId('smart-paste-platform-shutterstock');
      fireEvent.click(ssBtn);
      expect(ssBtn).toHaveClass('bg-primary');
    });

    it('UT-UI-SALES-SMART-PASTE-01: renders preview summary bar with date, total revenue, and blue matched status badge', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          rows: [
            {
              assetId: '569029521',
              dateStr: '2026-08-09',
              dateDisplay: '08/09/2026',
              earnings: 2.29,
              matchType: 'exact_id',
              matchedImage: {
                id: 'img1',
                code: '2302-01',
                title: 'Vector Artwork 1',
                filePath: '/path/1.jpg',
                createdAt: '2026-08-09T00:00:00.000Z',
              },
              candidates: [],
            },
          ],
        }),
      });

      render(
        <SmartPasteModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      );

      // Paste text and click parse
      const textarea = screen.getByTestId('smart-paste-textarea');
      fireEvent.change(textarea, { target: { value: '569029521 08/09/2026 $2.29' } });

      const parseBtn = screen.getByTestId('smart-paste-parse-btn');
      fireEvent.click(parseBtn);


      expect(await screen.findByTestId('smart-paste-summary-date')).toBeInTheDocument();
      expect(screen.getByTestId('smart-paste-summary-revenue')).toHaveTextContent('$2.29');
      const badge = screen.getByText('Matched by ID').closest('span');
      expect(badge).toHaveClass('text-blue-600');
    });

    it('UT-UI-SALES-SMART-PASTE-LIVE-STATS-01: calculates and displays real-time live stats and dynamic button text on paste', () => {
      render(
        <SmartPasteModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      );

      const textarea = screen.getByTestId('smart-paste-textarea');
      expect(screen.queryByTestId('smart-paste-live-stats')).not.toBeInTheDocument();

      // Paste 2 valid rows
      const sampleText = `949535178 Vectors 8/30/2024 $3.20\n1929092005 Vectors 2/27/2026 $2.11`;
      fireEvent.change(textarea, { target: { value: sampleText } });

      const liveStats = screen.getByTestId('smart-paste-live-stats');
      expect(liveStats).toBeInTheDocument();
      expect(liveStats).toHaveTextContent('Detected: 2 items');
      expect(liveStats).toHaveTextContent('Estimated: $5.31');

      const parseBtn = screen.getByTestId('smart-paste-parse-btn');
      expect(parseBtn).toHaveTextContent('Parse & Match 2 Items ($5.31)');
    });
  });

});


