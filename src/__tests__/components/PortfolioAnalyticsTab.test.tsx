import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioDetail } from '@/components/portfolio/PortfolioDetail';
import { PortfolioAnalyticsTab } from '@/components/portfolio/PortfolioAnalyticsTab';

describe('PortfolioDetail Dual-Tab & Analytics (UT-UI-PF-TAB-01, UT-UI-PF-ANALYTICS-01)', () => {
  const mockImage = {
    id: 'img-101',
    code: '2608-40',
    title: 'Business Infographic Workflow',
    keywords: 'business, workflow, infographic',
    status: 'uploaded',
    filePath: '/uploads/2608-40.jpg',
    ssId: '12345678',
    asId: '2169739652',
    vzId: null,
    ssDownloads: 2,
    asDownloads: 8,
    totalDownloads: 10,
    totalEarnings: 24.5,
    createdAt: '2026-01-15T00:00:00.000Z',
    stats: [
      {
        id: 'stat-1',
        imageId: 'img-101',
        platform: 'Adobe Stock',
        platformAssetId: '2169739652',
        downloads: 5,
        earnings: 12.5,
        date: '2026-08-20T00:00:00.000Z',
      },
      {
        id: 'stat-2',
        imageId: 'img-101',
        platform: 'Adobe Stock',
        platformAssetId: '2169739652',
        downloads: 3,
        earnings: 7.5,
        date: '2026-07-15T00:00:00.000Z',
      },
      {
        id: 'stat-3',
        imageId: 'img-101',
        platform: 'Shutterstock',
        platformAssetId: '12345678',
        downloads: 2,
        earnings: 4.5,
        date: '2026-07-10T00:00:00.000Z',
      },
    ],
  };

  it('UT-UI-PF-TAB-01: renders Details tab by default and switches to Analytics tab on click', () => {
    render(
      <PortfolioDetail
        image={mockImage}
        onClose={vi.fn()}
      />
    );

    // Initial default tab is Details & Info
    expect(screen.getByTestId('portfolio-detail-tab-info')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-detail-tab-analytics')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-detail-title')).toHaveTextContent('Business Infographic Workflow');
    expect(screen.getByTestId('portfolio-detail-keywords')).toHaveTextContent('business, workflow, infographic');

    // Switch to Sales & Analytics Tab
    fireEvent.click(screen.getByTestId('portfolio-detail-tab-analytics'));

    // Verify Tab 2 elements are displayed
    expect(screen.getByTestId('portfolio-analytics-tab-panel')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-analytics-status-badge')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-analytics-trend-chart')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-analytics-sales-table')).toBeInTheDocument();

    // Switch back to Details Tab
    fireEvent.click(screen.getByTestId('portfolio-detail-tab-info'));
    expect(screen.getByTestId('portfolio-detail-title')).toBeInTheDocument();
    expect(screen.queryByTestId('portfolio-analytics-tab-panel')).not.toBeInTheDocument();
  });

  it('UT-UI-PF-ANALYTICS-01: aggregates monthly time-series, renders health badge, and toggles metric', () => {
    const handleLogSale = vi.fn();

    render(
      <PortfolioAnalyticsTab
        image={mockImage}
        onLogSale={handleLogSale}
        portfolioAvgEarnings={5.0}
      />
    );

    // Health badge and lifetime stats
    expect(screen.getByTestId('portfolio-analytics-status-badge')).toHaveTextContent(/Rising Star|Evergreen/);
    expect(screen.getByText('$24.50')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();

    // Sales history table rows (3 transactions)
    const salesTable = screen.getByTestId('portfolio-analytics-sales-table');
    expect(salesTable).toBeInTheDocument();
    expect(salesTable.children.length).toBe(3);

    // Metric toggle: Default Revenue -> switch to Downloads
    const toggle = screen.getByTestId('portfolio-analytics-metric-toggle');
    const downloadsBtn = screen.getByRole('button', { name: 'Downloads' });
    fireEvent.click(downloadsBtn);

    // Trigger Log Sale action button
    const logSaleBtn = screen.getByTestId('portfolio-analytics-log-sale-btn');
    fireEvent.click(logSaleBtn);
    expect(handleLogSale).toHaveBeenCalledWith(mockImage);
  });

  it('handles zero sales gracefully with Untested badge and empty state', () => {
    const zeroSaleImage = {
      id: 'img-empty',
      code: '2608-45',
      title: 'Empty Artwork',
      keywords: 'empty, test',
      status: 'uploaded',
      filePath: '/uploads/2608-45.jpg',
      totalDownloads: 0,
      totalEarnings: 0,
      createdAt: '2026-08-25T00:00:00.000Z',
      stats: [],
    };

    render(
      <PortfolioAnalyticsTab
        image={zeroSaleImage}
      />
    );

    expect(screen.getByTestId('portfolio-analytics-status-badge')).toHaveTextContent('Untested / New');
    expect(screen.getByText('No Trend History Available')).toBeInTheDocument();
    expect(screen.getByText('No individual sales entries recorded yet.')).toBeInTheDocument();
  });

  it('handles single data point gracefully without SVG coordinate errors', () => {
    const singleSaleImage = {
      id: 'img-single',
      code: '2608-50',
      title: 'Single Sale Artwork',
      keywords: 'single, test',
      status: 'uploaded',
      filePath: '/uploads/2608-50.jpg',
      totalDownloads: 1,
      totalEarnings: 2.15,
      createdAt: '2026-08-01T00:00:00.000Z',
      stats: [
        {
          id: 'stat-single-1',
          platform: 'Adobe Stock',
          downloads: 1,
          earnings: 2.15,
          date: '2026-08-10T00:00:00.000Z',
        },
      ],
    };

    render(
      <PortfolioAnalyticsTab
        image={singleSaleImage}
      />
    );

    expect(screen.getByTestId('portfolio-analytics-trend-chart')).toBeInTheDocument();
    expect(screen.getAllByText('$2.15').length).toBeGreaterThanOrEqual(1);
  });

  it('UT-UI-PF-BENCHMARK-01: renders Top 100 and Portfolio Avg benchmark comparison cards and updates on metric toggle', () => {
    render(
      <PortfolioAnalyticsTab
        image={mockImage}
        top100AvgMonthlyEarnings={12.50}
        portfolioAvgMonthlyEarnings={1.50}
        top100AvgMonthlyDownloads={15}
        portfolioAvgMonthlyDownloads={2}
      />
    );

    // Initial render with benchmark comparison cards
    const top100Box = screen.getByTestId('portfolio-analytics-benchmark-top100');
    const portAvgBox = screen.getByTestId('portfolio-analytics-benchmark-portavg');
    expect(top100Box).toBeInTheDocument();
    expect(portAvgBox).toBeInTheDocument();
    expect(top100Box).toHaveTextContent('Top 100 Avg');
    expect(top100Box).toHaveTextContent('$12.50');
    expect(portAvgBox).toHaveTextContent('Port Avg');
    expect(portAvgBox).toHaveTextContent('$1.50');

    // Toggle metric to Downloads and verify benchmark values update
    const downloadsBtn = screen.getByRole('button', { name: 'Downloads' });
    fireEvent.click(downloadsBtn);
    expect(top100Box).toHaveTextContent('15.0');
    expect(portAvgBox).toHaveTextContent('2.0');
  });
});





