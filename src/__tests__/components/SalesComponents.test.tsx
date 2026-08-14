import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SalesSummaryCards } from '@/components/sales/SalesSummaryCards';
import { SalesTable, SaleItem } from '@/components/sales/SalesTable';

describe('Sales Components (UT-UI-SALES-01)', () => {
  describe('SalesSummaryCards', () => {
    it('renders all 4 summary KPI cards with formatted values', () => {
      render(
        <SalesSummaryCards
          totalEarnings={1234.56}
          totalDownloads={4500}
          topPlatform="Shutterstock"
          totalRecords={18}
        />
      );

      expect(screen.getByTestId('sales-kpi-total-earnings')).toHaveTextContent('$1,234.56');
      expect(screen.getByTestId('sales-kpi-total-downloads')).toHaveTextContent('4,500');
      expect(screen.getByTestId('sales-kpi-top-platform')).toHaveTextContent('Shutterstock');
      expect(screen.getByTestId('sales-kpi-total-records')).toHaveTextContent('18');
    });

    it('renders zero / fallback values when stats are empty', () => {
      render(
        <SalesSummaryCards
          totalEarnings={0}
          totalDownloads={0}
          topPlatform=""
          totalRecords={0}
        />
      );

      expect(screen.getByTestId('sales-kpi-total-earnings')).toHaveTextContent('$0.00');
      expect(screen.getByTestId('sales-kpi-total-downloads')).toHaveTextContent('0');
      expect(screen.getByTestId('sales-kpi-top-platform')).toHaveTextContent('-');
      expect(screen.getByTestId('sales-kpi-total-records')).toHaveTextContent('0');
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

    it('renders transaction rows with platform badges and earnings', () => {
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
      expect(screen.getAllByText('Shutterstock').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('$12.50')).toBeInTheDocument();
      expect(screen.getByText('2608-2')).toBeInTheDocument();
      expect(screen.getAllByText('Adobe Stock').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('$6.80')).toBeInTheDocument();
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

    it('triggers onDelete with sale ID when row delete button is clicked', () => {
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

      const deleteButtons = screen.getAllByTestId('sales-row-delete-btn');
      expect(deleteButtons).toHaveLength(2);
      fireEvent.click(deleteButtons[0]);
      expect(handleDelete).toHaveBeenCalledWith('sale-1');
    });
  });
});
