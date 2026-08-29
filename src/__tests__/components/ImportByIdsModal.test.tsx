import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportByIdsModal } from '@/components/collections/ImportByIdsModal';

describe('UT-UI-COLLECTION-IMPORT-MODAL-01: ImportByIdsModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders modal dialog with textarea, detected token count, and universal delimiter support', () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    render(
      <ImportByIdsModal
        isOpen={true}
        onClose={handleClose}
        collectionId="col-123"
        collectionName="Adobe Nominate 2026"
        onImportSuccess={handleSuccess}
      />
    );

    expect(screen.getByTestId('collection-import-ids-modal')).toBeInTheDocument();
    expect(screen.getByText('Adobe Nominate 2026')).toBeInTheDocument();

    const textarea = screen.getByTestId('collection-import-ids-textarea');
    expect(textarea).toBeInTheDocument();

    // Type newline, comma, and space separated IDs
    fireEvent.change(textarea, { target: { value: '972184113, 972184114\n2308-81 2302-09' } });

    // Should detect 4 unique items
    expect(screen.getByText(/4 unique items detected/i)).toBeInTheDocument();

    // Submit button should reflect count
    const submitBtn = screen.getByTestId('collection-import-ids-submit-btn');
    expect(submitBtn).toBeEnabled();
    expect(submitBtn).toHaveTextContent(/Import 4 Artworks/i);
  });

  it('submits parsed tokens and invokes onImportSuccess callback', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        matchedCount: 3,
        addedCount: 3,
        alreadyInCollectionCount: 0,
        notFoundCount: 0,
        collectionId: 'col-123',
      }),
    });

    render(
      <ImportByIdsModal
        isOpen={true}
        onClose={handleClose}
        collectionId="col-123"
        collectionName="Adobe Nominate 2026"
        onImportSuccess={handleSuccess}
      />
    );

    const textarea = screen.getByTestId('collection-import-ids-textarea');
    fireEvent.change(textarea, { target: { value: '972184113\n972184114\n972184115' } });

    const submitBtn = screen.getByTestId('collection-import-ids-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/collections/col-123/items',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: ['972184113', '972184114', '972184115'] }),
        })
      );
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          addedCount: 3,
        })
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ImportByIdsModal
        isOpen={false}
        onClose={vi.fn()}
        collectionId="col-123"
        onImportSuccess={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
