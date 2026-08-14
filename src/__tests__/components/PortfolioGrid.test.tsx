import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';

const mockImages = [
  {
    id: 'img1',
    code: '2608-01',
    title: 'Test Artwork 1',
    keywords: 'kw1, kw2',
    status: 'uploaded',
    filePath: '/path/to/img1.jpg',
    ssId: null,
    asId: null,
    ssDownloads: 10,
    asDownloads: 5,
    totalDownloads: 15,
    totalEarnings: 4.5,
    createdAt: '2026-08-01T00:00:00.000Z',
  },
];

describe('PortfolioGrid Component', () => {
  it('UT-UI-PAGE-01: should render pagination with page jump input and clamp values', () => {
    const handlePageChange = vi.fn();
    const handleSelect = vi.fn();

    render(
      <PortfolioGrid
        images={mockImages}
        selectedId={null}
        onSelect={handleSelect}
        isLoading={false}
        page={5}
        totalPages={29}
        onPageChange={handlePageChange}
      />
    );

    const pageInput = screen.getByTestId('portfolio-page-input') as HTMLInputElement;
    expect(pageInput).toBeInTheDocument();
    expect(pageInput.value).toBe('5');
    expect(screen.getByText('of 29')).toBeInTheDocument();

    // Type 15 and press Enter / blur
    fireEvent.change(pageInput, { target: { value: '15' } });
    fireEvent.keyDown(pageInput, { key: 'Enter' });
    fireEvent.blur(pageInput);
    expect(handlePageChange).toHaveBeenCalledWith(15);

    // Type out of bounds value (999) -> should clamp to totalPages (29)
    fireEvent.change(pageInput, { target: { value: '999' } });
    fireEvent.blur(pageInput);
    expect(handlePageChange).toHaveBeenCalledWith(29);

    // Type 0 -> should clamp to 1
    fireEvent.change(pageInput, { target: { value: '0' } });
    fireEvent.blur(pageInput);
    expect(handlePageChange).toHaveBeenCalledWith(1);
  });
});
