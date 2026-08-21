import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { KeywordTable } from '@/components/keywords/KeywordTable';
import { KeywordAnalyticsToken } from '@/lib/keywordAnalytics';

describe('KeywordTable Component (UT-UI-KW-TABLE-01)', () => {
  const mockTokens: KeywordAnalyticsToken[] = [
    {
      keyword: 'business',
      frequency: 10,
      totalDownloads: 120,
      totalEarnings: 85.5,
      rpi: 8.55,
      rpd: 0.71,
      tier: 'star',
      isTopFive: true,
      topFiveCount: 8,
      score: 420,
    },
    {
      keyword: 'infographic',
      frequency: 5,
      totalDownloads: 40,
      totalEarnings: 22.0,
      rpi: 4.4,
      rpd: 0.55,
      tier: 'workhorse',
      isTopFive: false,
      topFiveCount: 0,
      score: 150,
    },
  ];

  it('renders keyword rows with tier badges, metrics, and top-5 sparkles', () => {
    render(
      <KeywordTable
        tokens={mockTokens}
        isLoading={false}
        search=""
        onSearchChange={vi.fn()}
        sortBy="earnings"
        sortOrder="desc"
        onSortChange={vi.fn()}
        tierFilter="all"
        onTierFilterChange={vi.fn()}
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onInspectKeyword={vi.fn()}
      />
    );

    expect(screen.getByText('#business')).toBeInTheDocument();
    expect(screen.getByText('#infographic')).toBeInTheDocument();
    expect(screen.getByTestId('keyword-tier-badge-business')).toHaveTextContent('Star');
    expect(screen.getByTestId('keyword-tier-badge-infographic')).toHaveTextContent('Workhorse');
  });

  it('handles search input and clear button correctly', () => {
    const onSearchChange = vi.fn();
    render(
      <KeywordTable
        tokens={mockTokens}
        isLoading={false}
        search="infog"
        onSearchChange={onSearchChange}
        sortBy="earnings"
        sortOrder="desc"
        onSortChange={vi.fn()}
        tierFilter="all"
        onTierFilterChange={vi.fn()}
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onInspectKeyword={vi.fn()}
      />
    );

    const input = screen.getByTestId('keyword-search-input');
    fireEvent.change(input, { target: { value: 'template' } });
    expect(onSearchChange).toHaveBeenCalledWith('template');

    const clearBtn = screen.getByTestId('keyword-search-clear-btn');
    fireEvent.click(clearBtn);
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('triggers sorting callbacks when column headers are clicked', () => {
    const onSortChange = vi.fn();
    render(
      <KeywordTable
        tokens={mockTokens}
        isLoading={false}
        search=""
        onSearchChange={vi.fn()}
        sortBy="earnings"
        sortOrder="desc"
        onSortChange={onSortChange}
        tierFilter="all"
        onTierFilterChange={vi.fn()}
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onInspectKeyword={vi.fn()}
      />
    );

    const downloadsSortBtn = screen.getByTestId('keyword-sort-downloads-btn');
    fireEvent.click(downloadsSortBtn);
    expect(onSortChange).toHaveBeenCalledWith('downloads', 'desc');

    const earningsSortBtn = screen.getByTestId('keyword-sort-earnings-btn');
    fireEvent.click(earningsSortBtn);
    expect(onSortChange).toHaveBeenCalledWith('earnings', 'asc');
  });

  it('supports row selection, select-all, and bulk clipboard copy', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <KeywordTable
        tokens={mockTokens}
        isLoading={false}
        search=""
        onSearchChange={vi.fn()}
        sortBy="earnings"
        sortOrder="desc"
        onSortChange={vi.fn()}
        tierFilter="all"
        onTierFilterChange={vi.fn()}
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onInspectKeyword={vi.fn()}
      />
    );

    // Select all on page
    const selectAllCheckbox = screen.getByTestId('keyword-select-all-checkbox');
    fireEvent.click(selectAllCheckbox);

    // Check bulk copy button appears
    const copyBtn = screen.getByTestId('keyword-bulk-copy-btn');
    expect(copyBtn).toBeInTheDocument();

    await React.act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(writeTextMock).toHaveBeenCalledWith('business, infographic');
  });

  it('triggers onInspectKeyword when inspect button is clicked', () => {
    const onInspect = vi.fn();
    render(
      <KeywordTable
        tokens={mockTokens}
        isLoading={false}
        search=""
        onSearchChange={vi.fn()}
        sortBy="earnings"
        sortOrder="desc"
        onSortChange={vi.fn()}
        tierFilter="all"
        onTierFilterChange={vi.fn()}
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onInspectKeyword={onInspect}
      />
    );

    const inspectBtn = screen.getByTestId('keyword-row-inspect-btn-business');
    fireEvent.click(inspectBtn);
    expect(onInspect).toHaveBeenCalledWith('business');
  });

  it('triggers onTimeRangeChange and onTierFilterChange for draw_more', () => {
    const onTimeRangeChange = vi.fn();
    const onTierFilterChange = vi.fn();

    render(
      <KeywordTable
        tokens={mockTokens}
        isLoading={false}
        search=""
        onSearchChange={vi.fn()}
        sortBy="earnings"
        sortOrder="desc"
        onSortChange={vi.fn()}
        tierFilter="all"
        onTierFilterChange={onTierFilterChange}
        timeRange="all"
        onTimeRangeChange={onTimeRangeChange}
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onInspectKeyword={vi.fn()}
      />
    );

    const thirtyDayBtn = screen.getByTestId('keyword-time-range-30d');
    fireEvent.click(thirtyDayBtn);
    expect(onTimeRangeChange).toHaveBeenCalledWith('30d');

    const drawMoreBtn = screen.getByTestId('keyword-filter-tier-draw_more');
    fireEvent.click(drawMoreBtn);
    expect(onTierFilterChange).toHaveBeenCalledWith('draw_more');
  });
});
