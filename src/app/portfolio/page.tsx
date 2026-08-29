'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { PortfolioFilter, PortfolioFilterValues } from '@/components/portfolio/PortfolioFilter';
import { PortfolioGrid } from '@/components/portfolio/PortfolioGrid';
import { PortfolioDetail } from '@/components/portfolio/PortfolioDetail';
import { AddImageDrawer } from '@/components/portfolio/AddImageDrawer';
import { SaleEntryDrawer } from '@/components/sales/SaleEntryDrawer';
import { PortfolioFloatingToolbar } from '@/components/portfolio/PortfolioFloatingToolbar';
import { CreateCollectionModal } from '@/components/collections/CreateCollectionModal';
import { AddToCollectionModal } from '@/components/collections/AddToCollectionModal';
import { SmartIdPasteModal } from '@/components/portfolio/SmartIdPasteModal';
import { Plus, Calendar, Layers, Download, Sparkles } from 'lucide-react';
import { formatCurrency, formatNumber, formatDisplayDate } from '@/lib/formatters';

export default function PortfolioPage() {
  const [images, setImages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isLogSaleDrawerOpen, setIsLogSaleDrawerOpen] = useState(false);
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  
  // Summary metrics state
  const [summary, setSummary] = useState({
    totalImages: 0,
    totalDownloads: 0,
    totalEarnings: 0,
    top100AvgMonthlyEarnings: 0,
    top100AvgMonthlyDownloads: 0,
    portfolioAvgMonthlyEarnings: 0,
    portfolioAvgMonthlyDownloads: 0,
  });

  // Pagination and filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<PortfolioFilterValues>({
    search: '',
    searchField: 'all',
    idStatus: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    startDate: '',
    endDate: '',
  });

  const fetchPortfolio = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100', // As per spec
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        search: filters.search,
        searchField: filters.searchField,
      });

      if (filters.idStatus && filters.idStatus !== 'all') {
        params.append('idStatus', filters.idStatus);
      }
      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }
      
      const res = await fetch(`/api/portfolio?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      
      const json = await res.json();
      setImages(json.data || []);
      setTotalPages(json.meta?.totalPages || 1);
      if (json.summary) {
        setSummary({
          totalImages: json.summary.totalImages ?? (json.meta?.total || 0),
          totalDownloads: json.summary.totalDownloads ?? 0,
          totalEarnings: json.summary.totalEarnings ?? 0,
          top100AvgMonthlyEarnings: json.summary.top100AvgMonthlyEarnings ?? 0,
          top100AvgMonthlyDownloads: json.summary.top100AvgMonthlyDownloads ?? 0,
          portfolioAvgMonthlyEarnings: json.summary.portfolioAvgMonthlyEarnings ?? 0,
          portfolioAvgMonthlyDownloads: json.summary.portfolioAvgMonthlyDownloads ?? 0,
        });
      }

      
      setSelectedImage((prev: any) => {
        if (!prev) return null;
        const refreshed = json.data.find((img: any) => img.id === prev.id);
        return refreshed || prev;
      });
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const handleFilterChange = useCallback((newFilters: PortfolioFilterValues) => {
    setFilters(prev => {
      if (
        prev.search === newFilters.search &&
        prev.searchField === newFilters.searchField &&
        prev.idStatus === newFilters.idStatus &&
        prev.sortBy === newFilters.sortBy &&
        prev.sortOrder === newFilters.sortOrder &&
        prev.startDate === newFilters.startDate &&
        prev.endDate === newFilters.endDate
      ) {
        return prev;
      }
      return newFilters;
    });
    setPage(1);
    setSelectedImage(null);
  }, []);

  const handleToggleSelectImage = useCallback((id: string) => {
    setSelectedImageIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const currentPageIds = React.useMemo(() => images.map((img: any) => img.id), [images]);
  const allCurrentPageSelected = React.useMemo(
    () => currentPageIds.length > 0 && currentPageIds.every((id: string) => selectedImageIds.includes(id)),
    [currentPageIds, selectedImageIds]
  );

  const handleToggleSelectPage = useCallback(() => {
    if (allCurrentPageSelected) {
      setSelectedImageIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedImageIds(prev => Array.from(new Set([...prev, ...currentPageIds])));
    }
  }, [allCurrentPageSelected, currentPageIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedImageIds([]);
  }, []);

  const handleUpdateDownloads = async (id: string, ssDownloads: number, asDownloads: number) => {
    try {
      const res = await fetch('/api/portfolio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ssDownloads, asDownloads })
      });
      
      if (!res.ok) throw new Error('Failed to update');
      const updatedImage = await res.json();
      
      setImages((prev: any) => prev.map((img: any) => img.id === id ? updatedImage : img));
      if (selectedImage?.id === id) {
        setSelectedImage(updatedImage);
      }
    } catch (error) {
      console.error('Error updating downloads:', error);
      alert('Failed to update downloads');
    }
  };

  const handleDeleteImage = async (id: string) => {
    try {
      const res = await fetch(`/api/portfolio?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete image');
      }
      setSelectedImage(null);
      setSelectedImageIds(prev => prev.filter(imgId => imgId !== id));
      await fetchPortfolio();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  const getIdStatusLabel = (status: string) => {
    switch (status) {
      case 'has_asId': return 'Has Adobe ID';
      case 'missing_asId': return 'Missing Adobe ID';
      case 'has_ssId': return 'Has Shutterstock ID';
      case 'missing_ssId': return 'Missing Shutterstock ID';
      case 'has_vzId': return 'Has Vecteezy ID';
      case 'missing_vzId': return 'Missing Vecteezy ID';
      case 'missing_any_id': return 'Missing Any Platform ID';
      case 'missing_all_ids': return 'No Platform IDs';
      case 'has_all_ids': return 'All Platform IDs Present';
      case 'missing_image_file': return 'Missing Image File';
      case 'has_image_file': return 'Has Image File';
      default: return '';
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 md:p-6" data-testid="portfolio-layout">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="portfolio-sync-ids-btn"
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-hover text-foreground border border-border text-sm font-medium rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Sparkles size={16} className="text-primary" />
              <span>Sync Adobe IDs</span>
            </button>
            <button
              type="button"
              data-testid="portfolio-add-btn"
              onClick={() => setIsAddDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Image</span>
            </button>
          </div>
        </div>

        <PortfolioFilter
          onFilterChange={handleFilterChange}
        />

        {/* Portfolio Summary Stats Bar */}
        <div
          data-testid="portfolio-summary-bar"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-surface/70 border border-border rounded-xl text-xs text-muted -mt-2 shadow-2xs backdrop-blur-xs"
        >
          <div className="flex items-center gap-2 font-medium flex-wrap">
            {filters.startDate || filters.endDate ? (
              <div className="flex items-center gap-1.5 text-foreground">
                <Calendar size={14} className="text-primary shrink-0" />
                <span>
                  Stats for{' '}
                  <strong className="text-foreground">
                    {filters.startDate ? formatDisplayDate(filters.startDate) : 'Beginning'}
                    {' — '}
                    {filters.endDate ? formatDisplayDate(filters.endDate) : 'Present'}
                  </strong>
                  :
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-foreground">
                <Layers size={14} className="text-primary shrink-0" />
                <span>
                  {filters.search ? (
                    <>
                      Search results for <strong className="text-foreground">&quot;{filters.search}&quot;</strong>
                      {filters.searchField !== 'all' && (
                        <span className="text-muted text-xs font-normal capitalize"> ({filters.searchField === 'ids' ? 'Asset IDs' : filters.searchField})</span>
                      )}
                      :
                    </>
                  ) : (
                    'All Portfolio Artworks:'
                  )}
                </span>
              </div>
            )}

            {filters.idStatus !== 'all' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                {getIdStatusLabel(filters.idStatus)}
              </span>
            )}
          </div>


          <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted">Artworks:</span>
              <strong data-testid="portfolio-summary-count" className="text-foreground font-bold font-sans">
                {formatNumber(summary.totalImages)}
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <Download size={13} className="text-muted shrink-0" />
              <span className="text-muted">Downloads:</span>
              <strong data-testid="portfolio-summary-downloads" className="text-foreground font-bold">
                {formatNumber(summary.totalDownloads)}
              </strong>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted">Revenue:</span>
              <strong data-testid="portfolio-summary-earnings" className="text-foreground font-bold">
                {formatCurrency(summary.totalEarnings)}
              </strong>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden gap-4 md:gap-6 min-h-0">
        <PortfolioGrid 
          images={images}
          selectedId={selectedImage?.id || null}
          selectedImageIds={selectedImageIds}
          onSelect={setSelectedImage}
          onToggleSelect={handleToggleSelectImage}
          isLoading={isLoading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
        
        {selectedImage && (
          <PortfolioDetail 
            image={selectedImage}
            onUpdate={handleUpdateDownloads}
            onImageUpdated={fetchPortfolio}
            onDelete={handleDeleteImage}
            onLogSale={() => setIsLogSaleDrawerOpen(true)}
            onEdit={() => setIsEditDrawerOpen(true)}
            onClose={() => setSelectedImage(null)}
            benchmarks={{
              top100AvgMonthlyEarnings: summary.top100AvgMonthlyEarnings,
              top100AvgMonthlyDownloads: summary.top100AvgMonthlyDownloads,
              portfolioAvgMonthlyEarnings: summary.portfolioAvgMonthlyEarnings,
              portfolioAvgMonthlyDownloads: summary.portfolioAvgMonthlyDownloads,
            }}
          />
        )}

      </div>

      <PortfolioFloatingToolbar
        selectedCount={selectedImageIds.length}
        totalOnPage={images.length}
        allPageSelected={allCurrentPageSelected}
        onCreateCollection={() => setIsCreateCollectionOpen(true)}
        onAddToCollection={() => setIsAddToCollectionOpen(true)}
        onToggleSelectPage={handleToggleSelectPage}
        onClearSelection={handleClearSelection}
      />

      <CreateCollectionModal
        isOpen={isCreateCollectionOpen}
        onClose={() => setIsCreateCollectionOpen(false)}
        selectedImageIds={selectedImageIds}
        onSuccess={() => {
          setSelectedImageIds([]);
        }}
      />

      <AddToCollectionModal
        isOpen={isAddToCollectionOpen}
        onClose={() => setIsAddToCollectionOpen(false)}
        selectedImageIds={selectedImageIds}
        onSuccess={() => {
          setSelectedImageIds([]);
        }}
      />

      <AddImageDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        onSuccess={fetchPortfolio}
      />

      <AddImageDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        onSuccess={async (updatedImage) => {
          await fetchPortfolio();
          if (updatedImage) {
            setSelectedImage((prev: any) => ({
              ...prev,
              ...updatedImage,
            }));
          }
        }}
        editImage={selectedImage}
      />

      <SaleEntryDrawer
        isOpen={isLogSaleDrawerOpen}
        onClose={() => setIsLogSaleDrawerOpen(false)}
        onSuccess={fetchPortfolio}
        preselectedImage={selectedImage}
      />

      <SmartIdPasteModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSuccess={fetchPortfolio}
      />
    </div>
  );
}
