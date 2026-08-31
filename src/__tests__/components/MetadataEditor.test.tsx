import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetadataEditor } from '@/components/upload/MetadataEditor';
import { Asset } from '@/context/AssetContext';

describe('MetadataEditor Component (UT-UI-METADATA-KEYWORD-GATE-01)', () => {
  const baseAsset: Asset = {
    id: 'asset-1',
    baseName: '2608-01',
    title: 'Test Title',
    keywords: 'one, two, three',
    status: 'idle',
  };

  it('renders normal counter and enabled Save button when keywords <= 50', () => {
    render(
      <MetadataEditor
        activeAsset={baseAsset}
        onUpdateActiveAsset={vi.fn()}
        onEmbedExifForAsset={vi.fn()}
      />
    );

    expect(screen.getByText('3/50')).toBeInTheDocument();
    expect(screen.queryByTestId('metadata-keyword-limit-warning')).not.toBeInTheDocument();
    expect(screen.getByTestId('save-metadata-btn')).not.toBeDisabled();
  });

  it('renders red warning and disables Save button when keywords > 50', () => {
    const fiftyFiveWords = Array.from({ length: 55 }, (_, i) => `word${i}`).join(', ');
    const overloadedAsset = { ...baseAsset, keywords: fiftyFiveWords };

    render(
      <MetadataEditor
        activeAsset={overloadedAsset}
        onUpdateActiveAsset={vi.fn()}
        onEmbedExifForAsset={vi.fn()}
      />
    );

    expect(screen.getByText('55/50')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-keyword-limit-warning')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-keyword-limit-warning')).toHaveTextContent('Exceeds 50 keywords limit');
    expect(screen.getByTestId('save-metadata-btn')).toBeDisabled();
    expect(screen.getByTestId('save-metadata-btn')).toHaveTextContent('Exceeds 50 Keywords (Remove 5 to Save)');
  });

  it('allows removing keyword pills to reduce count below 50', () => {
    const onUpdateMock = vi.fn();
    render(
      <MetadataEditor
        activeAsset={baseAsset}
        onUpdateActiveAsset={onUpdateMock}
        onEmbedExifForAsset={vi.fn()}
      />
    );

    // Find and click the delete button for keyword 'two'
    const deleteBtn = screen.getByTestId('metadata-keyword-remove-btn-two');
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);
    expect(onUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      keywords: expect.not.stringContaining('two')
    }));
  });

  it('UT-UI-METADATA-TITLE-VALIDATION-01: shows red border on title textarea when save is clicked without title and clears on typing', () => {
    const onEmbedMock = vi.fn();
    const onUpdateMock = vi.fn();
    const emptyTitleAsset = { ...baseAsset, title: '' };

    const { rerender } = render(
      <MetadataEditor
        activeAsset={emptyTitleAsset}
        onUpdateActiveAsset={onUpdateMock}
        onEmbedExifForAsset={onEmbedMock}
      />
    );

    // Initial state: no red border
    expect(screen.getByTestId('metadata-title-input')).not.toHaveClass('border-destructive');

    // Click Save Metadata
    fireEvent.click(screen.getByTestId('save-metadata-btn'));

    // Should NOT call embed and SHOULD show red border on textarea
    expect(onEmbedMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('metadata-title-input')).toHaveClass('border-destructive');

    // Type a title
    fireEvent.change(screen.getByTestId('metadata-title-input'), { target: { value: 'New Vector Title' } });
    expect(onUpdateMock).toHaveBeenCalledWith({ title: 'New Vector Title' });

    // Rerender with updated title
    rerender(
      <MetadataEditor
        activeAsset={{ ...emptyTitleAsset, title: 'New Vector Title' }}
        onUpdateActiveAsset={onUpdateMock}
        onEmbedExifForAsset={onEmbedMock}
      />
    );

    // Red border should disappear
    expect(screen.getByTestId('metadata-title-input')).not.toHaveClass('border-destructive');

    // Click Save Metadata again
    fireEvent.click(screen.getByTestId('save-metadata-btn'));
    expect(onEmbedMock).toHaveBeenCalledWith('asset-1');
  });

  it('UT-UI-METADATA-EDITOR-SORT-01: supports numbered row list view, metric badges, and dynamic sorting', () => {
    const onUpdateMock = vi.fn();
    const metricsAsset: Asset = {
      id: 'asset-metrics',
      baseName: '2608-02',
      title: 'Infographic Vector',
      keywords: 'banana, apple, cherry',
      status: 'idle',
    };

    const keywordMetricsMap = {
      banana: { totalDownloads: 100, totalEarnings: 50.0 },
      apple: { totalDownloads: 500, totalEarnings: 250.0, isTopFive: true },
      cherry: { totalDownloads: 300, totalEarnings: 120.0 }
    };

    render(
      <MetadataEditor
        activeAsset={metricsAsset}
        onUpdateActiveAsset={onUpdateMock}
        onEmbedExifForAsset={vi.fn()}
        keywordMetricsMap={keywordMetricsMap}
      />
    );

    // Row List View sorted by 'downloads' descending by default (apple -> cherry -> banana)
    expect(screen.getByTestId('metadata-keyword-row-apple')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-keyword-row-cherry')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-keyword-row-banana')).toBeInTheDocument();

    // Verify metrics in row view
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();

    // Test Sort: Alphabetical (A-Z) -> apple, banana, cherry
    fireEvent.click(screen.getByTestId('metadata-keywords-sort-alpha-btn'));
    const rowsAfterAlpha = screen.getAllByTestId(/metadata-keyword-row-/);
    expect(rowsAfterAlpha[0]).toHaveAttribute('data-testid', 'metadata-keyword-row-apple');
    expect(rowsAfterAlpha[1]).toHaveAttribute('data-testid', 'metadata-keyword-row-banana');
    expect(rowsAfterAlpha[2]).toHaveAttribute('data-testid', 'metadata-keyword-row-cherry');

    // Test Sort: Original -> banana, apple, cherry
    fireEvent.click(screen.getByTestId('metadata-keywords-sort-orig-btn'));
    const rowsAfterOrig = screen.getAllByTestId(/metadata-keyword-row-/);
    expect(rowsAfterOrig[0]).toHaveAttribute('data-testid', 'metadata-keyword-row-banana');
    expect(rowsAfterOrig[1]).toHaveAttribute('data-testid', 'metadata-keyword-row-apple');
    expect(rowsAfterOrig[2]).toHaveAttribute('data-testid', 'metadata-keyword-row-cherry');

    // Test Sort: Revenue ($) -> apple ($250), cherry ($120), banana ($50)
    fireEvent.click(screen.getByTestId('metadata-keywords-sort-rev-btn'));
    const rowsAfterRev = screen.getAllByTestId(/metadata-keyword-row-/);
    expect(rowsAfterRev[0]).toHaveAttribute('data-testid', 'metadata-keyword-row-apple');
    expect(rowsAfterRev[1]).toHaveAttribute('data-testid', 'metadata-keyword-row-cherry');
    expect(rowsAfterRev[2]).toHaveAttribute('data-testid', 'metadata-keyword-row-banana');

    // Remove banana
    fireEvent.click(screen.getByTestId('metadata-keyword-remove-btn-banana'));
    expect(onUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      keywords: 'apple, cherry'
    }));
  });

  it('UT-UI-METADATA-EDITOR-TIE-01: handles tie-breaking fallback to alphabetical, zero/missing metrics, and ascending/descending toggles', () => {
    const onUpdateMock = vi.fn();
    const tieAsset: Asset = {
      id: 'asset-tie',
      baseName: '2608-03',
      title: 'Tie-break Test',
      keywords: 'zebra, beta, alpha, unknown_keyword',
      status: 'idle',
    };

    const keywordMetricsMap = {
      alpha: { totalDownloads: 100, totalEarnings: 50.0 },
      beta: { totalDownloads: 100, totalEarnings: 50.0 }, // Tied with alpha
      zebra: { totalDownloads: 200, totalEarnings: 10.0 },
      // unknown_keyword is missing from map -> defaults to 0 downloads / $0 earnings
    };

    render(
      <MetadataEditor
        activeAsset={tieAsset}
        onUpdateActiveAsset={onUpdateMock}
        onEmbedExifForAsset={vi.fn()}
        keywordMetricsMap={keywordMetricsMap}
      />
    );

    // Default: Sort by Downloads (descending) -> zebra (200) -> alpha (100) -> beta (100) -> unknown_keyword (0)
    // alpha and beta have same downloads (100) -> tie-breaks alphabetically (alpha before beta)
    const defaultRows = screen.getAllByTestId(/metadata-keyword-row-/);
    expect(defaultRows[0]).toHaveAttribute('data-testid', 'metadata-keyword-row-zebra');
    expect(defaultRows[1]).toHaveAttribute('data-testid', 'metadata-keyword-row-alpha');
    expect(defaultRows[2]).toHaveAttribute('data-testid', 'metadata-keyword-row-beta');
    expect(defaultRows[3]).toHaveAttribute('data-testid', 'metadata-keyword-row-unknown_keyword');

    // Click Downloads sort button again to toggle Ascending (Low to High)
    fireEvent.click(screen.getByTestId('metadata-keywords-sort-dl-btn'));
    const ascDlRows = screen.getAllByTestId(/metadata-keyword-row-/);
    expect(ascDlRows[0]).toHaveAttribute('data-testid', 'metadata-keyword-row-unknown_keyword');
    expect(ascDlRows[1]).toHaveAttribute('data-testid', 'metadata-keyword-row-alpha');
    expect(ascDlRows[2]).toHaveAttribute('data-testid', 'metadata-keyword-row-beta');
    expect(ascDlRows[3]).toHaveAttribute('data-testid', 'metadata-keyword-row-zebra');

    // Test Sort by Revenue ($) -> alpha ($50) -> beta ($50) -> zebra ($10) -> unknown_keyword ($0)
    fireEvent.click(screen.getByTestId('metadata-keywords-sort-rev-btn'));
    const revRows = screen.getAllByTestId(/metadata-keyword-row-/);
    expect(revRows[0]).toHaveAttribute('data-testid', 'metadata-keyword-row-alpha');
    expect(revRows[1]).toHaveAttribute('data-testid', 'metadata-keyword-row-beta');
    expect(revRows[2]).toHaveAttribute('data-testid', 'metadata-keyword-row-zebra');
    expect(revRows[3]).toHaveAttribute('data-testid', 'metadata-keyword-row-unknown_keyword');

    // Test Sort by Alphabetical (A-Z)
    fireEvent.click(screen.getByTestId('metadata-keywords-sort-alpha-btn'));
    const alphaAscRows = screen.getAllByTestId(/metadata-keyword-row-/);
    expect(alphaAscRows[0]).toHaveAttribute('data-testid', 'metadata-keyword-row-alpha');
    expect(alphaAscRows[1]).toHaveAttribute('data-testid', 'metadata-keyword-row-beta');
    expect(alphaAscRows[2]).toHaveAttribute('data-testid', 'metadata-keyword-row-unknown_keyword');
    expect(alphaAscRows[3]).toHaveAttribute('data-testid', 'metadata-keyword-row-zebra');

    // Click A-Z again to toggle Z-A
    fireEvent.click(screen.getByTestId('metadata-keywords-sort-alpha-btn'));
    const alphaDescRows = screen.getAllByTestId(/metadata-keyword-row-/);
    expect(alphaDescRows[0]).toHaveAttribute('data-testid', 'metadata-keyword-row-zebra');
    expect(alphaDescRows[1]).toHaveAttribute('data-testid', 'metadata-keyword-row-unknown_keyword');
    expect(alphaDescRows[2]).toHaveAttribute('data-testid', 'metadata-keyword-row-beta');
    expect(alphaDescRows[3]).toHaveAttribute('data-testid', 'metadata-keyword-row-alpha');
  });

  it('UT-UI-METADATA-KEYWORD-REORDER-01: supports drag-and-drop reordering in Original mode and suppresses drag handles in other modes', () => {
    const onUpdateMock = vi.fn();
    const testAsset: Asset = {
      id: 'asset-drag-test',
      baseName: '2608-04',
      title: 'Drag Reorder Test',
      keywords: 'first, second, third, fourth',
      status: 'idle',
    };

    render(
      <MetadataEditor
        activeAsset={testAsset}
        onUpdateActiveAsset={onUpdateMock}
        onEmbedExifForAsset={vi.fn()}
      />
    );

    // By default sortBy is 'downloads', drag handle should NOT be visible
    expect(screen.queryByTestId('metadata-keyword-drag-handle-first')).not.toBeInTheDocument();

    // Switch to Original mode
    fireEvent.click(screen.getByTestId('metadata-keywords-sort-orig-btn'));

    // In Original mode, drag handles should be rendered
    const dragHandleFirst = screen.getByTestId('metadata-keyword-drag-handle-first');
    const dragHandleThird = screen.getByTestId('metadata-keyword-drag-handle-third');
    expect(dragHandleFirst).toBeInTheDocument();
    expect(dragHandleThird).toBeInTheDocument();

    const rowFirst = screen.getByTestId('metadata-keyword-row-first');
    const rowThird = screen.getByTestId('metadata-keyword-row-third');

    expect(rowFirst).toHaveAttribute('draggable', 'true');

    // Simulate drag start on 'first' (index 0)
    fireEvent.dragStart(rowFirst, {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: 'move'
      }
    });

    // Simulate drag over 'third' (index 2)
    fireEvent.dragOver(rowThird, {
      dataTransfer: {
        dropEffect: 'move'
      }
    });

    // Simulate drop on 'third' (index 2)
    fireEvent.drop(rowThird, {
      dataTransfer: {
        getData: vi.fn()
      }
    });

    // Expected order after moving index 0 to index 2: second, third, first, fourth
    expect(onUpdateMock).toHaveBeenCalledWith({
      keywords: 'second, third, first, fourth'
    });

    // Test dropping on the same index (index 0 to index 0)
    onUpdateMock.mockClear();
    fireEvent.dragStart(rowFirst, {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' }
    });
    fireEvent.drop(rowFirst, {
      dataTransfer: { getData: vi.fn() }
    });
    expect(onUpdateMock).not.toHaveBeenCalled();
  });
});

