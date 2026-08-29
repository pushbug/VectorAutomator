import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CollectionsPage from '@/app/collections/page';
import { CollectionCard } from '@/components/collections/CollectionCard';
import { CollectionTable } from '@/components/collections/CollectionTable';
import { TopSharedKeywordsBar } from '@/components/collections/TopSharedKeywordsBar';
import { CreateCollectionModal } from '@/components/collections/CreateCollectionModal';
import { EditCollectionModal } from '@/components/collections/EditCollectionModal';
import { AddToCollectionModal } from '@/components/collections/AddToCollectionModal';
import CollectionDetailPage from '@/app/collections/[id]/page';

const mockCollection = {
  id: 'col-1',
  name: 'Thai Traditional Gold',
  description: 'Gold luxury vector ornaments and patterns',
  coverId: 'img-1',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
  totalImages: 10,
  totalDownloads: 150,
  totalEarnings: 82.5,
  avgRpi: 8.25,
  coverImage: {
    id: 'img-1',
    filePath: '/path/to/cover.jpg',
    title: 'Thai Pattern 1',
    code: '2608-01',
  },
  previewImages: [
    { id: 'img-1', filePath: '/path/to/cover.jpg', title: 'Thai Pattern 1', code: '2608-01' },
  ],
};

const mockTopKeywords = [
  { keyword: 'thai', frequency: 10, percentage: 100, totalDownloads: 150, totalEarnings: 82.5 },
  { keyword: 'pattern', frequency: 9, percentage: 90, totalDownloads: 140, totalEarnings: 75.0 },
  { keyword: 'gold', frequency: 8, percentage: 80, totalDownloads: 120, totalEarnings: 60.0 },
];

describe('Collections UI Components (UT-UI-COLLECTION-CARDS-01, UT-UI-COLLECTION-DETAIL-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-UI-COLLECTION-CARDS-01: renders collection card with cover image, title, and rollup KPIs', () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <CollectionCard
        collection={mockCollection}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    expect(screen.getByTestId('collection-card-col-1')).toBeInTheDocument();
    expect(screen.getByTestId('collection-card-title-col-1')).toHaveTextContent('Thai Traditional Gold');
    expect(screen.getByTestId('collection-card-downloads-col-1')).toHaveTextContent('150');
    expect(screen.getByTestId('collection-card-earnings-col-1')).toHaveTextContent('$82.50');
    expect(screen.getByTestId('collection-card-rpi-col-1')).toHaveTextContent('$8.25');
    expect(screen.getByText('10 artworks')).toBeInTheDocument();
  });

  it('UT-UI-COLLECTION-DETAIL-01: TopSharedKeywordsBar renders tag chips, view modes, and handles copy to clipboard', async () => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    const handleSelectKeyword = vi.fn();

    render(
      <TopSharedKeywordsBar
        keywords={mockTopKeywords}
        totalImages={10}
        selectedKeyword="thai"
        onSelectKeyword={handleSelectKeyword}
      />
    );

    expect(screen.getByTestId('collection-top-keywords-bar')).toBeInTheDocument();
    expect(screen.getByTestId('collection-top-keyword-tag-thai')).toHaveTextContent('thai');
    expect(screen.getByTestId('collection-top-keyword-tag-pattern')).toHaveTextContent('pattern');
    expect(screen.getByTestId('collection-top-keyword-tag-gold')).toHaveTextContent('gold');

    // Frequency mode (default)
    expect(screen.getByTestId('collection-top-keyword-tag-thai')).toHaveTextContent('10');

    // Switch to Downloads view mode
    const dlBtn = screen.getByTestId('collection-keywords-view-dl-btn');
    fireEvent.click(dlBtn);
    expect(screen.getByTestId('collection-top-keyword-tag-thai')).toHaveTextContent('150');

    // Switch to Revenue view mode
    const revBtn = screen.getByTestId('collection-keywords-view-rev-btn');
    fireEvent.click(revBtn);
    expect(screen.getByTestId('collection-top-keyword-tag-thai')).toHaveTextContent('$82.50');

    // Test tag click
    const patternTag = screen.getByTestId('collection-top-keyword-tag-pattern');
    fireEvent.click(patternTag);
    expect(handleSelectKeyword).toHaveBeenCalledWith('pattern');

    // Test Copy Top Keywords
    const copyBtn = screen.getByTestId('collection-copy-top-keywords-btn');
    expect(copyBtn).toHaveTextContent('Copy Top 3 by Revenue');

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('thai, pattern, gold');
    expect(await screen.findByText('Copied 3 Tags!')).toBeInTheDocument();
  });

  it('UT-UI-COLLECTION-DETAIL-02: TopSharedKeywordsBar invokes onViewModeChange when controlled', () => {
    const handleViewModeChange = vi.fn();
    render(
      <TopSharedKeywordsBar
        keywords={mockTopKeywords}
        totalImages={10}
        selectedKeyword="thai"
        viewMode="frequency"
        onViewModeChange={handleViewModeChange}
      />
    );

    const controlledDlBtn = screen.getByTestId('collection-keywords-view-dl-btn');
    fireEvent.click(controlledDlBtn);
    expect(handleViewModeChange).toHaveBeenCalledWith('downloads');
  });

  it('CreateCollectionModal submits valid collection name and selected image IDs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'col-new', name: 'New Theme' }),
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <CreateCollectionModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        selectedImageIds={['img-1', 'img-2']}
      />
    );

    expect(screen.getByTestId('create-collection-modal')).toBeInTheDocument();
    expect(screen.getByText('Will add 2 selected artworks to this group')).toBeInTheDocument();

    const nameInput = screen.getByTestId('create-collection-name-input');
    fireEvent.change(nameInput, { target: { value: 'New Theme' } });

    const submitBtn = screen.getByTestId('create-collection-submit-btn');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/collections', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        name: 'New Theme',
        imageIds: ['img-1', 'img-2'],
      }),
    }));
  });

  it('AddToCollectionModal loads collections and posts selected items', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/collections?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [mockCollection] }),
        });
      }
      if (url.includes('/items')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, addedCount: 2 }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    await act(async () => {
      render(
        <AddToCollectionModal
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleSuccess}
          selectedImageIds={['img-3', 'img-4']}
        />
      );
    });

    expect(screen.getByTestId('add-to-collection-modal')).toBeInTheDocument();
    expect(await screen.findByText('Thai Traditional Gold (10 items)')).toBeInTheDocument();

    const submitBtn = screen.getByTestId('add-to-collection-submit-btn');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/collections/col-1/items', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        imageIds: ['img-3', 'img-4'],
      }),
    }));
  });

  it('EditCollectionModal pre-fills values and submits PATCH request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'col-1', name: 'Updated Theme', description: 'Updated Description' }),
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <EditCollectionModal
        isOpen={true}
        collection={mockCollection}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    expect(screen.getByTestId('edit-collection-modal')).toBeInTheDocument();

    const nameInput = screen.getByTestId('edit-collection-name-input') as HTMLInputElement;
    expect(nameInput.value).toBe('Thai Traditional Gold');

    fireEvent.change(nameInput, { target: { value: 'Updated Theme' } });

    const descInput = screen.getByTestId('edit-collection-description-input') as HTMLTextAreaElement;
    fireEvent.change(descInput, { target: { value: 'Updated Description' } });

    const submitBtn = screen.getByTestId('edit-collection-submit-btn');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/collections/col-1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Updated Theme',
        description: 'Updated Description',
      }),
    }));
    expect(handleSuccess).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Theme' }));
  });

  it('UT-UI-COLLECTION-TABLE-01: renders collection table with sortable headers, thumbnails, and isolated action clicks', () => {
    const handleSortChange = vi.fn();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <CollectionTable
        collections={[mockCollection]}
        sortBy="updatedAt"
        sortOrder="desc"
        onSortChange={handleSortChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    // Verify table structure and row
    expect(screen.getByTestId('collection-table')).toBeInTheDocument();
    expect(screen.getByTestId('collection-table-row-col-1')).toBeInTheDocument();
    expect(screen.getByText('Thai Traditional Gold')).toBeInTheDocument();
    expect(screen.getByText('Gold luxury vector ornaments and patterns')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // totalImages
    expect(screen.getByText('150')).toBeInTheDocument(); // totalDownloads
    expect(screen.getByText('$82.50')).toBeInTheDocument(); // totalEarnings
    expect(screen.getByText('$8.25')).toBeInTheDocument(); // avgRpi

    // Verify sortable header click
    const nameHeader = screen.getByTestId('collection-sort-header-name');
    fireEvent.click(nameHeader);
    expect(handleSortChange).toHaveBeenCalledWith('name');

    const downloadsHeader = screen.getByTestId('collection-sort-header-totalDownloads');
    fireEvent.click(downloadsHeader);
    expect(handleSortChange).toHaveBeenCalledWith('totalDownloads');

    const earningsHeader = screen.getByTestId('collection-sort-header-totalEarnings');
    fireEvent.click(earningsHeader);
    expect(handleSortChange).toHaveBeenCalledWith('totalEarnings');

    // Verify edit button
    const editBtn = screen.getByTestId('collection-table-edit-btn-col-1');
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockCollection);

    // Verify delete button
    const deleteBtn = screen.getByTestId('collection-table-delete-btn-col-1');
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith('col-1', 'Thai Traditional Gold');
  });

  it('UT-UI-COLLECTIONS-PAGE-01: CollectionsPage renders toolbar, toggles view modes, and handles pagination', async () => {
    const mockCollectionsList = Array.from({ length: 15 }, (_, i) => ({
      ...mockCollection,
      id: `col-${i + 1}`,
      name: `Collection ${i + 1}`,
    }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockCollectionsList, meta: { total: 15 } }),
    });

    await act(async () => {
      render(<CollectionsPage />);
    });

    // Verify header and summary KPIs
    expect(screen.getByRole('heading', { level: 1, name: 'Collections' })).toBeInTheDocument();
    expect(screen.getByTestId('collection-view-grid-btn')).toBeInTheDocument();
    expect(screen.getByTestId('collection-view-table-btn')).toBeInTheDocument();

    // Verify Grid View cards are rendered for first 12 items
    expect(screen.getByTestId('collection-card-col-1')).toBeInTheDocument();
    expect(screen.getByTestId('collection-card-col-12')).toBeInTheDocument();

    // Verify Pagination Capsule is rendered (total 15 items with 12 items/page = 2 pages)
    expect(screen.getByTestId('collection-pagination-next-btn')).toBeInTheDocument();
    expect(screen.getByTestId('collection-pagination-prev-btn')).toBeInTheDocument();

    // Switch to Table View
    const tableBtn = screen.getByTestId('collection-view-table-btn');
    await act(async () => {
      fireEvent.click(tableBtn);
    });

    expect(screen.getByTestId('collection-table')).toBeInTheDocument();
    expect(screen.getByTestId('collection-table-row-col-1')).toBeInTheDocument();

    // Search input resets page and filters
    const searchInput = screen.getByTestId('collection-search-input');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Gold' } });
    });
    expect(searchInput).toHaveValue('Gold');
  });

  it('UT-UI-COLLECTION-DETAIL-03: TopSharedKeywordsBar renders search input, handles typing, and triggers clear', () => {
    const handleSearchChange = vi.fn();
    render(
      <TopSharedKeywordsBar
        keywords={mockTopKeywords}
        totalImages={10}
        searchQuery="Elephant"
        onSearchChange={handleSearchChange}
      />
    );

    const searchInput = screen.getByTestId('collection-search-input');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('Elephant');

    fireEvent.change(searchInput, { target: { value: 'Lotus' } });
    expect(handleSearchChange).toHaveBeenCalledWith('Lotus');

    const clearBtn = screen.getByTestId('collection-search-clear-btn');
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(handleSearchChange).toHaveBeenCalledWith('');
  });

  it('UT-UI-COLLECTION-DETAIL-04: CollectionDetailPage filters artworks by search query across code, title, ID, and keywords', async () => {
    const mockDetailData = {
      id: 'col-1',
      name: 'Thai Traditional Gold',
      description: 'Gold luxury vector ornaments',
      coverId: 'img-1',
      images: [
        { id: 'img-1', code: '2608-01', asId: '1001', ssId: '2001', vzId: '3001', title: 'Golden Elephant Ornament', filePath: '/img1.jpg', keywords: 'thai, elephant, gold', totalDownloads: 50, totalEarnings: 25.0 },
        { id: 'img-2', code: '2608-02', asId: '1002', ssId: '2002', vzId: '3002', title: 'Lotus Flower Pattern', filePath: '/img2.jpg', keywords: 'thai, lotus, flower', totalDownloads: 30, totalEarnings: 15.0 },
        { id: 'img-3', code: '2608-03', asId: '1003', ssId: '2003', vzId: '3003', title: 'Vintage Temple Banner', filePath: '/img3.jpg', keywords: 'thai, temple, vintage', totalDownloads: 20, totalEarnings: 10.0 },
      ],
      topKeywords: mockTopKeywords,
      summary: { totalImages: 3, totalDownloads: 100, totalEarnings: 50.0, avgRpi: 16.67 },
    };

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/collections/col-1')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDetailData,
        });
      }
      if (url.includes('/api/portfolio?limit=1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ summary: {} }),
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    await act(async () => {
      render(<CollectionDetailPage params={Promise.resolve({ id: 'col-1' })} />);
    });

    expect(screen.getByTestId('collection-detail-title')).toHaveTextContent('Thai Traditional Gold');
    expect(screen.getAllByTestId('collection-artwork-item')).toHaveLength(3);

    // Search by title "Elephant"
    const searchInputs = screen.getAllByTestId('collection-search-input');
    const searchInput = searchInputs[searchInputs.length - 1];
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Elephant' } });
    });

    expect(screen.getAllByTestId('collection-artwork-item')).toHaveLength(1);
    expect(screen.getByTestId('collection-search-filter-badge')).toBeInTheDocument();
    expect(screen.getByText('"Elephant"')).toBeInTheDocument();

    // Search by code "2608-02"
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '2608-02' } });
    });
    expect(screen.getAllByTestId('collection-artwork-item')).toHaveLength(1);

    // Search by Adobe ID "1003"
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '1003' } });
    });
    expect(screen.getAllByTestId('collection-artwork-item')).toHaveLength(1);

    // Search by non-existent string -> empty state
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'NonExistentXYZ' } });
    });
    expect(screen.queryAllByTestId('collection-artwork-item')).toHaveLength(0);
    expect(screen.getByText('No artworks match search "NonExistentXYZ"')).toBeInTheDocument();

    // Clear filter
    const clearBtn = screen.getByTestId('collection-empty-clear-filters-btn');
    await act(async () => {
      fireEvent.click(clearBtn);
    });
    expect(screen.getAllByTestId('collection-artwork-item')).toHaveLength(3);
  });
});
