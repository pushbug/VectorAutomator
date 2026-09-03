import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from '@/app/page';

const mockDashboardResponse = {
  summary: {
    totalVectors: 150,
    monthlyVectors: 35,
    pendingCount: 2,
    totalDownloads: 420,
    currentMonthEarnings: 189.5,
    currentMonthDownloads: 80,
    latestCode: '2608-35',
  },
  monthlyGoal: {
    target: 50,
    current: 35,
    percentage: 70,
    daysRemaining: 15,
    currentMonthName: 'August 2026',
  },
  recentUploads: [
    {
      id: 'recent-1',
      code: '2608-35',
      title: 'Vector Flowchart Infographic',
      filePath: '/uploads/2608-35.jpg',
      status: 'uploaded',
      totalDownloads: 5,
      ssDownloads: 3,
      asDownloads: 2,
      keywords: 'flowchart, vector, business',
      createdAt: new Date().toISOString(),
    },
  ],
  topPerformers: [
    {
      id: 'top-1',
      code: '2608-01',
      title: 'Corporate Timeline Milestone',
      filePath: '/uploads/2608-01.jpg',
      status: 'published',
      totalDownloads: 210,
      ssDownloads: 150,
      asDownloads: 60,
      keywords: 'timeline, corporate, milestone',
      createdAt: new Date().toISOString(),
    },
  ],
};

describe('Dashboard HomePage Component (UT-UI-DASH-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDashboardResponse,
    } as Response);
  });

  it('renders all KPI summary cards with expected metrics and formatting', async () => {
    render(<HomePage />);

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    });

    // Check KPI cards
    const totalVectorsKpi = screen.getByTestId('dash-kpi-total-vectors');
    expect(totalVectorsKpi).toHaveTextContent('150');

    const monthlyKpi = screen.getByTestId('dash-kpi-monthly-vectors');
    expect(monthlyKpi).toHaveTextContent('35');

    const downloadsKpi = screen.getByTestId('dash-kpi-total-downloads');
    expect(downloadsKpi).toHaveTextContent('420');

    const earningsKpi = screen.getByTestId('dash-kpi-month-earnings');
    expect(earningsKpi).toHaveTextContent('$189.50');

    // Check Latest Code and Pending pill in header
    expect(screen.getAllByText('2608-35').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2 pending queue')).toBeInTheDocument();
  });

  it('renders monthly goal pace card and quick action links correctly', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    });

    // Monthly pace progress
    expect(screen.getByText('35 / 50 (70%)')).toBeInTheDocument();
    expect(screen.getByText('15 days left')).toBeInTheDocument();

    // Quick Action Hub Links
    const uploadLink = screen.getByTestId('dash-action-upload');
    expect(uploadLink).toHaveAttribute('href', '/upload');

    const portfolioLink = screen.getByTestId('dash-action-portfolio');
    expect(portfolioLink).toHaveAttribute('href', '/portfolio');

    const salesLink = screen.getByTestId('dash-action-sales');
    expect(salesLink).toHaveAttribute('href', '/sales');
  });

  it('renders recent uploads and top performers with keyword copy trigger', async () => {
    // Mock navigator.clipboard
    const mockWriteText = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Recent Ingestion')).toBeInTheDocument();
    });

    expect(screen.getByText('Vector Flowchart Infographic')).toBeInTheDocument();
    expect(screen.getByText('Corporate Timeline Milestone')).toBeInTheDocument();

    // Trigger copy keyword button
    const copyBtn = screen.getByTitle('Copy keywords for new work');
    fireEvent.click(copyBtn);

    expect(mockWriteText).toHaveBeenCalledWith('timeline, corporate, milestone');
  });

  it('renders error state and allows retry', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Dashboard')).toBeInTheDocument();
    });

    // Setup successful fetch for retry
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardResponse,
    } as Response);

    const retryBtn = screen.getByText('Try Again');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    });
  });

  it('opens monthly goal modal, validates input, and updates goal with preset selection', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('dash-goal-edit-btn')).toBeInTheDocument();
    });

    // 1. Open modal
    fireEvent.click(screen.getByTestId('dash-goal-edit-btn'));
    expect(screen.getByTestId('dash-goal-modal')).toBeInTheDocument();

    // 2. Select preset 100
    const preset100Btn = screen.getByTestId('dash-goal-preset-100');
    fireEvent.click(preset100Btn);

    const goalInput = screen.getByTestId('dash-goal-input') as HTMLInputElement;
    expect(goalInput.value).toBe('100');

    // 3. Test invalid input validation
    fireEvent.change(goalInput, { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('dash-goal-save-btn'));
    expect(screen.getByText(/Please enter an integer between 1 and 100,000/i)).toBeInTheDocument();

    // 4. Change to valid 100 and submit
    fireEvent.change(goalInput, { target: { value: '100' } });

    // Mock successful PATCH /api/settings and subsequent dashboard re-fetch
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (typeof url === 'string' && url.includes('/api/settings') && opts?.method === 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, monthlyVectorGoal: 100 }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          ...mockDashboardResponse,
          monthlyGoal: {
            ...mockDashboardResponse.monthlyGoal,
            target: 100,
            percentage: 35,
          },
        }),
      } as Response);
    });

    fireEvent.click(screen.getByTestId('dash-goal-save-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('dash-goal-modal')).not.toBeInTheDocument();
    });

    // Verify optimistic / re-fetched target rendered in UI
    expect(screen.getByText('35 / 100 (35%)')).toBeInTheDocument();
  });

  it('closes monthly goal modal when cancel button is clicked', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByTestId('dash-goal-edit-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('dash-goal-edit-btn'));
    expect(screen.getByTestId('dash-goal-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('dash-goal-cancel-btn'));
    expect(screen.queryByTestId('dash-goal-modal')).not.toBeInTheDocument();
  });
});
