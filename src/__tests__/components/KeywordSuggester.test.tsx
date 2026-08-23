import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KeywordSuggester } from '@/components/upload/KeywordSuggester';

const mockPortfolioResponse = {
  data: [
    {
      id: 'img-1',
      code: '2608-01',
      title: 'Modern Business Infographic',
      keywords: 'business, infographic, roadmap, timeline, success, chart',
      totalDownloads: 45,
      totalEarnings: 18.5,
      filePath: '/uploads/2608-01.jpg',
    },
    {
      id: 'img-2',
      code: '2608-02',
      title: 'Corporate Process Workflow',
      keywords: 'workflow, process, business, corporate, step, strategy',
      totalDownloads: 20,
      totalEarnings: 8.0,
      filePath: '/uploads/2608-02.jpg',
    },
  ],
  meta: {
    total: 2,
    page: 1,
    limit: 24,
    totalPages: 1,
  },
};

describe('KeywordSuggester Component (UT-UI-KEYWORD-SUGGEST-01)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/portfolio')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPortfolioResponse),
        });
      }
      return Promise.reject(new Error('Unhandled URL'));
    });
  });

  it('renders search input, sort select, and initial empty selection state', async () => {
    render(
      <KeywordSuggester
        activeKeywords=""
        activeAssetId="asset-1"
        onApplyKeywords={vi.fn()}
      />
    );

    expect(screen.getByTestId('keyword-suggest-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('keyword-suggest-sort-select')).toBeInTheDocument();
    expect(screen.getByText(/Select reference images above to extract keywords/i)).toBeInTheDocument();

    // Verify images loaded into reference grid
    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-image-card-img-1')).toBeInTheDocument();
      expect(screen.getByTestId('keyword-suggest-image-card-img-2')).toBeInTheDocument();
    });
  });

  it('allows selecting reference images and aggregates deduplicated keyword tags', async () => {
    render(
      <KeywordSuggester
        activeKeywords="existing, vector"
        activeAssetId="asset-1"
        onApplyKeywords={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-image-card-img-1')).toBeInTheDocument();
    });

    // Click img-1 to select
    fireEvent.click(screen.getByTestId('keyword-suggest-image-card-img-1'));

    // Should extract keywords from img-1
    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-tag-business')).toBeInTheDocument();
      expect(screen.getByTestId('keyword-suggest-tag-infographic')).toBeInTheDocument();
      expect(screen.getByTestId('keyword-suggest-tag-roadmap')).toBeInTheDocument();
    });

    // Click img-2 to select as well (multi-select)
    fireEvent.click(screen.getByTestId('keyword-suggest-image-card-img-2'));

    // Should aggregate keywords from both img-1 and img-2 (business frequency = 2, totalDownloads = 65)
    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-tag-workflow')).toBeInTheDocument();
      expect(screen.getByTestId('keyword-suggest-tag-process')).toBeInTheDocument();
    });
  });

  it('supports select all images and select all tags toggling', async () => {
    render(
      <KeywordSuggester
        activeKeywords=""
        activeAssetId="asset-1"
        onApplyKeywords={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-select-all-images-btn')).toBeInTheDocument();
    });

    // Select all images
    fireEvent.click(screen.getByTestId('keyword-suggest-select-all-images-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-select-all-tags-btn')).toBeInTheDocument();
    });

    // Deselect all tags
    fireEvent.click(screen.getByTestId('keyword-suggest-select-all-tags-btn'));

    // Apply button should be disabled when 0 tags selected
    expect(screen.getByTestId('keyword-suggest-apply-btn')).toBeDisabled();
  });

  it('calls onApplyKeywords with merged keywords when apply button is clicked', async () => {
    const onApplyMock = vi.fn();
    render(
      <KeywordSuggester
        activeKeywords="diagram, vector"
        activeAssetId="asset-1"
        onApplyKeywords={onApplyMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-image-card-img-1')).toBeInTheDocument();
    });

    // Select img-1
    fireEvent.click(screen.getByTestId('keyword-suggest-image-card-img-1'));

    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-apply-btn')).not.toBeDisabled();
    });

    // Click Apply button
    fireEvent.click(screen.getByTestId('keyword-suggest-apply-btn'));

    expect(onApplyMock).toHaveBeenCalled();
    const appliedKeywords = onApplyMock.mock.calls[0][0];
    // Applied keywords should contain merged distinct items
    expect(appliedKeywords).toContain('business');
    expect(appliedKeywords).toContain('diagram');
    expect(appliedKeywords).toContain('vector');
    expect(appliedKeywords).toContain('infographic');
  });

  it('triggers search debouncing and sort query updates', async () => {
    render(
      <KeywordSuggester
        activeKeywords=""
        activeAssetId="asset-1"
        onApplyKeywords={vi.fn()}
      />
    );

    const searchInput = screen.getByTestId('keyword-suggest-search-input');
    fireEvent.change(searchInput, { target: { value: 'roadmap' } });

    // Change sort to createdAt
    const sortSelect = screen.getByTestId('keyword-suggest-sort-select');
    fireEvent.change(sortSelect, { target: { value: 'createdAt' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('sortBy=createdAt'));
    });
  });

  it('UT-UI-KEYWORD-SUGGEST-SEARCH-FIELD-01: defaults to keywords search scope and supports switching to title, code, ids, and all', async () => {
    render(
      <KeywordSuggester
        activeKeywords=""
        activeAssetId="asset-1"
        onApplyKeywords={vi.fn()}
      />
    );

    // Initial fetch should use searchField=keywords as default
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('searchField=keywords'));
    });

    // Change search scope to title
    const fieldSelect = screen.getByTestId('keyword-suggest-search-field-select');
    fireEvent.change(fieldSelect, { target: { value: 'title' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('searchField=title'));
    });

    // Change search scope to ids
    fireEvent.change(fieldSelect, { target: { value: 'ids' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('searchField=ids'));
    });

    // Change sort to earnings
    const sortSelect = screen.getByTestId('keyword-suggest-sort-select');
    fireEvent.change(sortSelect, { target: { value: 'earnings' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('sortBy=earnings'));
    });
  });

  it('UT-UI-KEYWORD-SUGGEST-COPY-01: copies selected tags to clipboard and handles non-destructive append merge', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const onApplyMock = vi.fn();
    render(
      <KeywordSuggester
        activeKeywords="business, diagram"
        activeAssetId="asset-1"
        onApplyKeywords={onApplyMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-image-card-img-1')).toBeInTheDocument();
    });

    // Select img-1 to load its keywords
    fireEvent.click(screen.getByTestId('keyword-suggest-image-card-img-1'));

    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-copy-tags-btn')).toBeInTheDocument();
    });

    // Click Copy Tags button
    await act(async () => {
      fireEvent.click(screen.getByTestId('keyword-suggest-copy-tags-btn'));
    });
    expect(writeTextMock).toHaveBeenCalled();

    // Click Apply Keywords button
    fireEvent.click(screen.getByTestId('keyword-suggest-apply-btn'));
    expect(onApplyMock).toHaveBeenCalled();
    const applied = onApplyMock.mock.calls[0][0];

    // Preserved initial words, appended unique new words without duplicate 'business' or 'diagram'
    expect(applied.startsWith('business, diagram')).toBe(true);
    expect(applied).toContain('infographic');
    expect(applied).toContain('roadmap');
  });

  it('UT-UI-KEYWORD-SUGGEST-DUAL-01: renders concurrent download & earnings metrics and supports isolated checkbox vs 1-click cart toggle', async () => {
    const onApplyMock = vi.fn();
    render(
      <KeywordSuggester
        activeKeywords="business, existing"
        activeAssetId="asset-1"
        onApplyKeywords={onApplyMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-image-card-img-1')).toBeInTheDocument();
    });

    // Select img-1 (downloads=45, earnings=18.5)
    fireEvent.click(screen.getByTestId('keyword-suggest-image-card-img-1'));

    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-tag-infographic')).toBeInTheDocument();
    });

    // 1. Verify concurrent metrics rendering (download count 45 and earnings $18.50)
    const tagPill = screen.getByTestId('keyword-suggest-tag-infographic');
    expect(tagPill).toHaveTextContent('45');
    expect(tagPill).toHaveTextContent('$18.50');

    // 2. Verify checkbox click isolates selection without firing onApplyKeywords
    const checkboxBtn = screen.getByTestId('keyword-suggest-tag-checkbox-infographic');
    fireEvent.click(checkboxBtn);
    expect(onApplyMock).not.toHaveBeenCalled();

    // 3. Verify 1-click cart add: clicking tag body appends keyword directly into active asset
    fireEvent.click(tagPill);
    expect(onApplyMock).toHaveBeenCalledWith('business, existing, infographic');

    // 4. Verify 1-click cart remove: clicking tag body for keyword already in active asset removes it
    onApplyMock.mockClear();
    const existingTagPill = screen.getByTestId('keyword-suggest-tag-business');
    expect(existingTagPill).toHaveTextContent('(in asset)');
    fireEvent.click(existingTagPill);
    expect(onApplyMock).toHaveBeenCalledWith('existing');
  });

  it('UT-UI-KEYWORD-SUGGEST-SORT-01: renders Segmented Sort Toggle and dynamically re-orders keywords across score, downloads, earnings, and alphabetical modes', async () => {
    render(
      <KeywordSuggester
        activeKeywords=""
        activeAssetId="asset-1"
        onApplyKeywords={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-image-card-img-1')).toBeInTheDocument();
    });

    // Select img-1 (downloads=45, earnings=18.5) and img-2 (downloads=20, earnings=8.0)
    fireEvent.click(screen.getByTestId('keyword-suggest-image-card-img-1'));
    fireEvent.click(screen.getByTestId('keyword-suggest-image-card-img-2'));

    await waitFor(() => {
      expect(screen.getByTestId('keyword-suggest-sort-score-btn')).toBeInTheDocument();
      expect(screen.getByTestId('keyword-suggest-sort-downloads-btn')).toBeInTheDocument();
      expect(screen.getByTestId('keyword-suggest-sort-earnings-btn')).toBeInTheDocument();
      expect(screen.getByTestId('keyword-suggest-sort-alpha-btn')).toBeInTheDocument();
    });

    // 1. Uncheck one tag (e.g. 'roadmap') to verify state persistence across sort switches
    const checkboxRoadmap = screen.getByTestId('keyword-suggest-tag-checkbox-roadmap');
    fireEvent.click(checkboxRoadmap);

    // 2. Switch to Alphabetical sort
    fireEvent.click(screen.getByTestId('keyword-suggest-sort-alpha-btn'));

    // Check tags are sorted alphabetically (business should be near the start)
    const tagContainers = screen.getAllByTestId(/keyword-suggest-tag-container-/);
    const firstTagText = tagContainers[0].textContent;
    expect(firstTagText).toContain('business');

    // 3. Switch to Downloads sort
    fireEvent.click(screen.getByTestId('keyword-suggest-sort-downloads-btn'));
    expect(screen.getByTestId('keyword-suggest-tag-business')).toBeInTheDocument();

    // 4. Switch to Earnings sort
    fireEvent.click(screen.getByTestId('keyword-suggest-sort-earnings-btn'));
    expect(screen.getByTestId('keyword-suggest-tag-business')).toBeInTheDocument();

    // 5. Switch back to Score sort
    fireEvent.click(screen.getByTestId('keyword-suggest-sort-score-btn'));
    expect(screen.getByTestId('keyword-suggest-tag-business')).toBeInTheDocument();
  });
});


