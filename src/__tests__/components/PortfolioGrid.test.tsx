import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

  it('UT-UI-PORTFOLIO-DETAIL-EARNINGS-01: renders total revenue and platform breakdown correctly', async () => {
    const { PortfolioDetail } = await import('@/components/portfolio/PortfolioDetail');
    const mockImageWithStats = {
      id: 'img1',
      code: '2408-71',
      title: 'Infographic Banner',
      keywords: 'infographic, vector',
      status: 'uploaded',
      filePath: '/path/to/img1.jpg',
      ssId: '2509573381',
      asId: '949535178',
      vzId: null,
      ssDownloads: 0,
      asDownloads: 4,
      totalDownloads: 4,
      totalEarnings: 6.41,
      platformBreakdown: {
        'Adobe Stock': { downloads: 4, earnings: 6.41 },
        'Shutterstock': { downloads: 0, earnings: 0.0 },
      },
      createdAt: '2024-08-30T00:00:00.000Z',
    };

    render(
      <PortfolioDetail
        image={mockImageWithStats}
        onClose={vi.fn()}
      />
    );

    expect(screen.getAllByText('$6.41')).toHaveLength(2);
    expect(screen.getAllByText('4')).toHaveLength(2);
    expect(screen.getByText('#949535178')).toBeInTheDocument();
  });

  it('UT-UI-PORTFOLIO-DETAIL-COPY-PLATFORM-01: copies platform asset ID to clipboard when clicking copy button next to platform badge', async () => {
    const { PortfolioDetail } = await import('@/components/portfolio/PortfolioDetail');
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const mockImage = {
      id: 'img1',
      code: '2408-71',
      title: 'Infographic Banner',
      keywords: 'infographic, vector',
      status: 'uploaded',
      filePath: '/path/to/img1.jpg',
      asId: '175524050',
      ssId: null,
      vzId: null,
      ssDownloads: 0,
      asDownloads: 4,
      totalDownloads: 4,
      totalEarnings: 0,
      platformBreakdown: {
        'Adobe Stock': { downloads: 4, earnings: 0 },
        'Shutterstock': { downloads: 0, earnings: 0 },
      },
      createdAt: '2024-08-30T00:00:00.000Z',
    };

    render(
      <PortfolioDetail
        image={mockImage}
        onClose={vi.fn()}
      />
    );

    // Adobe Stock has ID '175524050' -> copy button should exist and copy ID
    const copyAdobeBtn = screen.getByTestId('portfolio-copy-platform-id-adobe-stock-btn');
    expect(copyAdobeBtn).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(copyAdobeBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith('175524050');

    // Shutterstock has ssId: null -> copy button should not be rendered
    expect(screen.queryByTestId('portfolio-copy-platform-id-shutterstock-btn')).not.toBeInTheDocument();
  });

  it('UT-UI-PORTFOLIO-SUMMARY-01: renders portfolio dashboard summary bar with artworks count, downloads, and revenue', async () => {
    // Mock global fetch for PortfolioPage
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: mockImages,
        meta: { total: 125, totalPages: 2, page: 1, limit: 100 },
        summary: {
          totalImages: 125,
          totalDownloads: 450,
          totalEarnings: 285.5,
        },
      }),
    });

    const PortfolioPage = (await import('@/app/portfolio/page')).default;
    render(<PortfolioPage />);

    expect(await screen.findByTestId('portfolio-summary-bar')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-summary-count')).toHaveTextContent('125');
    expect(screen.getByTestId('portfolio-summary-downloads')).toHaveTextContent('450');
    expect(screen.getByTestId('portfolio-summary-earnings')).toHaveTextContent('$285.50');
  });

  it('UT-UI-PORTFOLIO-MULTISELECT-01: supports multi-select checkboxes without triggering image detail onSelect', () => {
    const handleSelect = vi.fn();
    const handleToggleSelect = vi.fn();

    render(
      <PortfolioGrid
        images={mockImages}
        selectedId={null}
        selectedImageIds={['img1']}
        onSelect={handleSelect}
        onToggleSelect={handleToggleSelect}
        isLoading={false}
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
      />
    );

    const checkbox = screen.getByTestId('portfolio-checkbox-img1') as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox.checked).toBe(true);

    // Click checkbox -> should call handleToggleSelect('img1') and NOT handleSelect
    fireEvent.click(checkbox);
    expect(handleToggleSelect).toHaveBeenCalledWith('img1');
    expect(handleSelect).not.toHaveBeenCalled();

    // Click item container -> should call handleSelect
    const gridItem = screen.getByTestId('portfolio-grid-item');
    fireEvent.click(gridItem);
    expect(handleSelect).toHaveBeenCalledWith(mockImages[0]);
  });
});

