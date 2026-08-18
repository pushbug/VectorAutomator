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
    const removeButtons = screen.getAllByRole('button');
    const deleteBtn = removeButtons.find(b => b.closest('span')?.textContent?.includes('two'));
    expect(deleteBtn).toBeDefined();
    if (deleteBtn) {
      fireEvent.click(deleteBtn);
      expect(onUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
        keywords: expect.not.stringContaining('two')
      }));
    }
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
});
