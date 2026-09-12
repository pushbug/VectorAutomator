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
    it('renders all 5 summary KPI cards with formatted values', () => {
      render(
        <PayoutSummaryCards
          totalStockUsd={2713.09}
          totalNetThb={114595.77}
          holdingUsd={539.26}
          totalFeeUsd={8.78}
          totalTransactions={48}
        />
      );

      expect(screen.getByTestId('payout-kpi-total-stock-usd')).toHaveTextContent('$2,713.09');
      expect(screen.getByTestId('payout-kpi-realized-thb')).toHaveTextContent('฿114,595.77');
      expect(screen.getByTestId('payout-kpi-holding-usd')).toHaveTextContent('$539.26');
      expect(screen.getByTestId('payout-kpi-total-fees')).toHaveTextContent('$8.78');
      expect(screen.getByTestId('payout-kpi-total-transactions')).toHaveTextContent('48 Items');
    });

    it('renders zero / fallback values when stats are empty', () => {
      render(
        <PayoutSummaryCards
          totalStockUsd={0}
          totalNetThb={0}
          holdingUsd={0}
          totalFeeUsd={0}
          totalTransactions={0}
        />
      );

      expect(screen.getByTestId('payout-kpi-total-stock-usd')).toHaveTextContent('$0.00');
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

      // Click status column header to sort
      const statusHeader = screen.getByText('Thai Bank');
      fireEvent.click(statusHeader);
      expect(onSortChange).toHaveBeenCalledWith('status');
    });

    it('opens 3-dots action menu and handles edit, delete, and status quick toggles', () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onStatusChange = vi.fn();

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
          onStatusChange={onStatusChange}
        />
      );

      // p-1 is 'completed', so menu should offer 'Mark Holding'
      const menuBtn1 = screen.getByTestId('payout-action-menu-btn-p-1');
      fireEvent.click(menuBtn1);

      const holdingBtn = screen.getByTestId('payout-menu-mark-holding-btn-p-1');
      expect(holdingBtn).toBeInTheDocument();
      fireEvent.click(holdingBtn);
      expect(onStatusChange).toHaveBeenCalledWith('p-1', 'in_platform');

      // p-2 is 'in_platform', so menu should offer 'Mark Completed' and 'Edit'
      const menuBtn2 = screen.getByTestId('payout-action-menu-btn-p-2');
      fireEvent.click(menuBtn2);

      const editBtn = screen.getByTestId('payout-edit-btn-p-2');
      expect(editBtn).toBeInTheDocument();
      fireEvent.click(editBtn);
      expect(onEdit).toHaveBeenCalledWith(mockRecords[1]);

      // Re-open to click Mark Completed
      fireEvent.click(menuBtn2);
      const completedBtn = screen.getByTestId('payout-menu-mark-completed-btn-p-2');
      expect(completedBtn).toBeInTheDocument();
      fireEvent.click(completedBtn);
      expect(onStatusChange).toHaveBeenCalledWith('p-2', 'completed');
    });

    it('handles bulk mark completed for selected transactions', () => {
      const onBulkStatusChange = vi.fn();

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
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onBulkDelete={vi.fn()}
          onOpenBundleModal={vi.fn()}
          onBulkStatusChange={onBulkStatusChange}
        />
      );

      // Select both rows
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);

      const bulkCompletedBtn = screen.getByTestId('payout-bulk-mark-completed-btn');
      expect(bulkCompletedBtn).toHaveTextContent('Mark Completed (2)');
      fireEvent.click(bulkCompletedBtn);

      expect(onBulkStatusChange).toHaveBeenCalledWith(['p-1', 'p-2'], 'completed');
    });

    it('displays Completed badge for records with completed status even when bankReceivedDate is null', () => {
      const recordsWithoutBankDate: PayoutRecord[] = [
        {
          id: 'p-completed-no-date',
          stockWithdrawDate: '2018-09-08T00:00:00.000Z',
          stockName: 'Adobe Stock',
          stockAmountUsd: 120.05,
          platformName: 'PayPal',
          status: 'completed',
          bankName: 'Bangkok Bank (BBL)',
          bankReceivedDate: null,
        },
      ];

      render(
        <PayoutTable
          records={recordsWithoutBankDate}
          total={1}
          page={1}
          totalPages={1}
          limit={50}
          onPageChange={vi.fn()}
          selectedYear="all"
          onYearChange={vi.fn()}
          availableYears={[2018]}
          selectedStock="all"
          onStockChange={vi.fn()}
          searchQuery=""
          onSearchChange={vi.fn()}
          sortBy="stockWithdrawDate"
          sortOrder="desc"
          onSortChange={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onBulkDelete={vi.fn()}
          onOpenBundleModal={vi.fn()}
        />
      );

      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.queryByText('Holding')).not.toBeInTheDocument();
    });

    it('renders table footer totals when summaryTotals is provided', () => {
      render(
        <PayoutTable
          records={mockRecords}
          total={2}
          summaryTotals={{
            totalStockUsd: 2713.09,
            totalPlatformUsd: 2706.09,
            totalFeeUsd: 7.00,
            totalNetThb: 92508.32,
          }}
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
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onBulkDelete={vi.fn()}
          onOpenBundleModal={vi.fn()}
        />
      );

      const footer = screen.getByTestId('payout-table-footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveTextContent('$2,713.09');
      expect(footer).toHaveTextContent('$2,706.09');
      expect(footer).toHaveTextContent('-$7.00');
      expect(footer).toHaveTextContent('฿92,508.32');
      expect(footer).toHaveTextContent('Total (2 transactions)');
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

    it('supports status override selection and submission', () => {
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
            status: 'completed',
          }}
        />
      );

      const statusSelect = screen.getByTestId('payout-input-status') as HTMLSelectElement;
      expect(statusSelect.value).toBe('completed');
      fireEvent.change(statusSelect, { target: { value: 'in_platform' } });
      expect(statusSelect.value).toBe('in_platform');

      const submitBtn = screen.getByTestId('payout-submit-btn');
      fireEvent.click(submitBtn);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_platform',
        })
      );
    });

    it('does not force Bangkok Bank when editing record with null bankName', () => {
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
            bankName: null,
          }}
        />
      );

      const bankSelect = screen.getByTestId('payout-input-bank-name') as HTMLSelectElement;
      expect(bankSelect.value).toBe('');
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
