import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PayoutSummaryCards } from '@/components/payouts/PayoutSummaryCards';
import { PayoutTable, PayoutRecord } from '@/components/payouts/PayoutTable';
import { PayoutEntryModal } from '@/components/payouts/PayoutEntryModal';
import { PayoutPasteModal } from '@/components/payouts/PayoutPasteModal';
import { PayoutBatchModal } from '@/components/payouts/PayoutBatchModal';

describe('Payout UI Components (UT-UI-PAYOUT-01)', () => {
  describe('PayoutSummaryCards', () => {
    it('renders all 4 summary KPI cards with formatted values', () => {
      render(
        <PayoutSummaryCards
          totalNetThb={114595.77}
          holdingUsd={539.26}
          totalFeeUsd={8.78}
          totalTransactions={48}
        />
      );

      expect(screen.getByTestId('payout-kpi-realized-thb')).toHaveTextContent('฿114,595.77');
      expect(screen.getByTestId('payout-kpi-holding-usd')).toHaveTextContent('$539.26');
      expect(screen.getByTestId('payout-kpi-total-fees')).toHaveTextContent('$8.78');
      expect(screen.getByTestId('payout-kpi-total-transactions')).toHaveTextContent('48 Items');
    });

    it('renders zero / fallback values when stats are empty', () => {
      render(
        <PayoutSummaryCards
          totalNetThb={0}
          holdingUsd={0}
          totalFeeUsd={0}
          totalTransactions={0}
        />
      );

      expect(screen.getByTestId('payout-kpi-realized-thb')).toHaveTextContent('฿0.00');
      expect(screen.getByTestId('payout-kpi-holding-usd')).toHaveTextContent('$0.00');
      expect(screen.getByTestId('payout-kpi-total-fees')).toHaveTextContent('$0.00');
      expect(screen.getByTestId('payout-kpi-total-transactions')).toHaveTextContent('0 Items');
    });
  });

  describe('PayoutTable', () => {
    const mockRecords: PayoutRecord[] = [
      {
        id: 'p-1',
        stockWithdrawDate: '2023-09-03T00:00:00.000Z',
        stockName: 'Adobe Stock',
        stockAmountUsd: 2667.41,
        platformDate: '2023-09-09T00:00:00.000Z',
        platformName: 'Payoneer',
        platformAmountUsd: 2664.41,
        feeUsd: 3.00,
        bankReceivedDate: '2023-09-10T00:00:00.000Z',
        bankName: 'Kasikornbank',
        exchangeRate: 34.72,
        netIncomeThb: 92508.32,
        status: 'completed',
        taxYear: 2023,
        leadTimeDays: 7,
        notes: 'Rate 35.45 1 วัน',
      },
      {
        id: 'p-2',
        stockWithdrawDate: '2024-01-15T00:00:00.000Z',
        stockName: 'Vecteezy',
        stockAmountUsd: 45.68,
        platformDate: '2024-01-15T00:00:00.000Z',
        platformName: 'Payoneer',
        platformAmountUsd: 41.68,
        feeUsd: 4.00,
        status: 'in_platform',
        taxYear: 2024,
      },
    ];

    it('renders table rows, year pills, and triggers callbacks', () => {
      const onYearChange = vi.fn();
      const onStatusChange = vi.fn();
      const onStockChange = vi.fn();
      const onSearchChange = vi.fn();
      const onSortChange = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onBulkDelete = vi.fn();
      const onOpenBundleModal = vi.fn();
      const onPageChange = vi.fn();

      render(
        <PayoutTable
          records={mockRecords}
          total={2}
          page={1}
          totalPages={1}
          limit={50}
          onPageChange={onPageChange}
          selectedYear="all"
          onYearChange={onYearChange}
          availableYears={[2024, 2023]}
          selectedStock="all"
          onStockChange={onStockChange}
          searchQuery=""
          onSearchChange={onSearchChange}
          sortBy="stockWithdrawDate"
          sortOrder="desc"
          onSortChange={onSortChange}
          onEdit={onEdit}
          onDelete={onDelete}
          onBulkDelete={onBulkDelete}
          onOpenBundleModal={onOpenBundleModal}
        />
      );

      expect(screen.getAllByText('Adobe Stock').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Vecteezy').length).toBeGreaterThan(0);
      expect(screen.getByText('฿92,508.32')).toBeInTheDocument();

      // Click year pill
      const btn2024 = screen.getByText('2024');
      fireEvent.click(btn2024);
      expect(onYearChange).toHaveBeenCalledWith('2024');
    });

    it('opens 3-dots action menu and handles edit and delete triggers', () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      render(
        <PayoutTable
          records={mockRecords}
          total={2}
          page={1}
          totalPages={1}
          limit={50}
          onPageChange={vi.fn()}
          selectedYear="all"
          onYearChange={vi.fn()}
          availableYears={[2024, 2023]}
          selectedStock="all"
          onStockChange={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
          sortBy="stockWithdrawDate"
          sortOrder="desc"
          onSortChange={vi.fn()}
          onEdit={onEdit}
          onDelete={onDelete}
          onBulkDelete={vi.fn()}
          onOpenBundleModal={vi.fn()}
        />
      );

      const menuBtn = screen.getByTestId('payout-action-menu-btn-p-1');
      fireEvent.click(menuBtn);

      const editBtn = screen.getByTestId('payout-edit-btn-p-1');
      expect(editBtn).toBeInTheDocument();
      fireEvent.click(editBtn);
      expect(onEdit).toHaveBeenCalledWith(mockRecords[0]);
    });
  });

  describe('PayoutEntryModal', () => {
    it('performs 2-way currency calculation when changing exchange rate', () => {
      const onSubmit = vi.fn();
      const onClose = vi.fn();

      render(
        <PayoutEntryModal
          isOpen={true}
          onClose={onClose}
          onSubmit={onSubmit}
          initialData={{
            stockWithdrawDate: '2023-09-03',
            stockName: 'Adobe Stock',
            stockAmountUsd: 2664.41,
            platformAmountUsd: 2664.41,
            platformName: 'Payoneer',
          }}
        />
      );

      const rateInput = screen.getByPlaceholderText('34.50');
      fireEvent.change(rateInput, { target: { value: '35.00' } });

      const thbInput = screen.getByLabelText('Net Income (THB ฿)') as HTMLInputElement;
      expect(thbInput.value).toBe('93254.35');
    });
  });

  describe('PayoutPasteModal', () => {
    it('parses pasted Google Sheet TSV and updates live preview bar', () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <PayoutPasteModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      const sampleTsv = `01/09/23\tShutterStock\t548.04\t07/09/23\tPayOneer\t539.26\t-\t-\t
03/09/23\tAdobeStock\t2,667.41\t09/09/23\tPayOneer\t2,664.41\t34.72\t114,595.77\tRate 35.45`;

      const textarea = screen.getByPlaceholderText(/01\/09\/23/);
      fireEvent.change(textarea, { target: { value: sampleTsv } });

      expect(screen.getByText('Detected Rows')).toBeInTheDocument();
      expect(screen.getByText('Ready to Ingest')).toBeInTheDocument();
      expect(screen.getByText('Import 2 Records')).toBeInTheDocument();
    });
  });

  describe('PayoutBatchModal', () => {
    it('calculates proportional split across selected records', () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      const items = [
        {
          id: 'p-1',
          stockName: 'Adobe Stock',
          stockWithdrawDate: '2023-09-03',
          stockAmountUsd: 2664.41,
          platformAmountUsd: 2664.41,
        },
        {
          id: 'p-2',
          stockName: 'Vecteezy',
          stockWithdrawDate: '2023-09-13',
          stockAmountUsd: 41.68,
          platformAmountUsd: 41.68,
        },
      ];

      render(
        <PayoutBatchModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
          selectedItems={items}
        />
      );

      const rateInput = screen.getByPlaceholderText('34.50');
      fireEvent.change(rateInput, { target: { value: '35.00' } });

      expect(screen.getByText('฿93,254.35')).toBeInTheDocument();
      expect(screen.getByText('฿1,458.80')).toBeInTheDocument();
    });
  });
});
