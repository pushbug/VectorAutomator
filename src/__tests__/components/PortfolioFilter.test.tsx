import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PortfolioFilter } from '@/components/portfolio/PortfolioFilter';

describe('PortfolioFilter Component (UT-UI-PORTFOLIO-SEARCH-FIELD-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search scope select with default value "all" and correct placeholder', () => {
    const handleFilterChange = vi.fn();
    render(<PortfolioFilter onFilterChange={handleFilterChange} />);

    const select = screen.getByTestId('portfolio-search-field-select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe('all');

    const input = screen.getByTestId('portfolio-search-input') as HTMLInputElement;
    expect(input.placeholder).toContain('Search across all fields');
  });

  it('updates dynamic placeholder and triggers callback when changing search scope', () => {
    const handleFilterChange = vi.fn();
    render(<PortfolioFilter onFilterChange={handleFilterChange} />);

    // Initial debounce trigger
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(handleFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ searchField: 'all', search: '' })
    );

    // Change to 'keywords'
    const select = screen.getByTestId('portfolio-search-field-select');
    fireEvent.change(select, { target: { value: 'keywords' } });

    const input = screen.getByTestId('portfolio-search-input') as HTMLInputElement;
    expect(input.placeholder).toContain('Search keywords');

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(handleFilterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchField: 'keywords', search: '' })
    );
  });

  it('propagates search query alongside selected searchField', () => {
    const handleFilterChange = vi.fn();
    render(<PortfolioFilter onFilterChange={handleFilterChange} />);

    const select = screen.getByTestId('portfolio-search-field-select');
    fireEvent.change(select, { target: { value: 'code' } });

    const input = screen.getByTestId('portfolio-search-input');
    fireEvent.change(input, { target: { value: '2608-35' } });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(handleFilterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: '2608-35',
        searchField: 'code',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    );
  });

  it('supports clearing search text and reflects in filter callback', () => {
    const handleFilterChange = vi.fn();
    render(<PortfolioFilter onFilterChange={handleFilterChange} />);

    const input = screen.getByTestId('portfolio-search-input');
    fireEvent.change(input, { target: { value: '3' } });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    const clearBtn = screen.getByTestId('portfolio-search-clear-btn');
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect((input as HTMLInputElement).value).toBe('');
    expect(handleFilterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: '' })
    );
  });
});
