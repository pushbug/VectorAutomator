import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { KeywordDetailDrawer } from '@/components/keywords/KeywordDetailDrawer';

describe('KeywordDetailDrawer Component (UT-UI-KW-DRAWER-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockArtworks = [
    {
      id: 'img1',
      code: '2608-01',
      title: '5 Steps Business Infographic',
      filePath: '/files/2608-01.jpg',
      totalDownloads: 12,
      totalEarnings: 24.5,
      createdAt: new Date().toISOString(),
      stats: [{ platform: 'Adobe Stock', downloads: 12, earnings: 24.5 }],
    },
  ];

  it('fetches linked artworks by keyword searchField on open and renders items', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockArtworks }),
    } as any);

    render(
      <KeywordDetailDrawer
        keyword="infographic"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('keyword-detail-drawer')).toBeInTheDocument();
    expect(screen.getByText('#infographic')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('5 Steps Business Infographic')).toBeInTheDocument();
      expect(screen.getByText('2608-01')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/portfolio?search=infographic&searchField=exactKeyword')
    );
  });

  it('UT-UI-KW-RECIPE-01: renders Winning Tag Combinations recipe card and supports copy', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'img1',
            code: '2608-01',
            title: '5 Steps Business Infographic',
            keywords: 'infographic, timeline, business, roadmap',
            filePath: '/files/2608-01.jpg',
            totalDownloads: 12,
            totalEarnings: 24.5,
            stats: [{ platform: 'Adobe Stock', earnings: 24.5 }],
          },
        ],
      }),
    } as any);

    render(
      <KeywordDetailDrawer
        keyword="infographic"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('keyword-drawer-winning-tags')).toBeInTheDocument();
      expect(screen.getByText(/Winning Tag Combinations/i)).toBeInTheDocument();
      expect(screen.getByText('#timeline')).toBeInTheDocument();
      expect(screen.getByText('#business')).toBeInTheDocument();
    });

    const copyRecipeBtn = screen.getByTestId('keyword-drawer-copy-recipe-btn');
    await React.act(async () => {
      fireEvent.click(copyRecipeBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('infographic'));
  });

  it('triggers onClose when close button is clicked', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
      } as any);

    const onClose = vi.fn();
    render(
      <KeywordDetailDrawer
        keyword="infographic"
        isOpen={true}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByTestId('keyword-detail-close-btn');
    await React.act(async () => {
      fireEvent.click(closeBtn);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <KeywordDetailDrawer
        keyword="infographic"
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
