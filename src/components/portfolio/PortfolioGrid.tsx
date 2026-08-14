'use client';
import React from 'react';
import Image from 'next/image';

interface PortfolioImage {
  id: string;
  code?: string | null;
  year?: number | null;
  month?: number | null;
  seqNumber?: number | null;
  title: string;
  keywords: string;
  status: string;
  filePath: string;
  ssId: string | null;
  asId: string | null;
  ssDownloads: number;
  asDownloads: number;
  totalDownloads: number;
  createdAt: string;
}

interface PortfolioGridProps {
  images: PortfolioImage[];
  selectedId: string | null;
  onSelect: (image: PortfolioImage) => void;
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PortfolioGrid({ 
  images, 
  selectedId, 
  onSelect, 
  isLoading,
  page,
  totalPages,
  onPageChange
}: PortfolioGridProps) {
  
  if (isLoading) {
    return <div className="flex-1 flex justify-center items-center h-full">Loading...</div>;
  }

  if (images.length === 0) {
    return <div className="flex-1 flex justify-center items-center h-full text-muted">No images found.</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {images.map((img) => (
            <div 
              key={img.id}
              data-testid="portfolio-grid-item"
              onClick={() => onSelect(img)}
              className={`cursor-pointer group relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                selectedId === img.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
              }`}
            >
              <Image 
                src={`/api/image?path=${encodeURIComponent(img.filePath)}`}
                alt={img.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                className="object-cover transition-transform group-hover:scale-105"
                unoptimized
              />
              {img.code && (
                <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded bg-background/90 backdrop-blur-sm text-[10px] font-mono font-bold text-primary border border-border/80 shadow-xs">
                  {img.code}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-background/80 backdrop-blur-sm p-2 text-xs truncate">
                <span className="font-medium text-foreground block truncate">{img.title}</span>
                <span className="text-muted flex justify-between items-center mt-1">
                  <span>DL: {img.totalDownloads}</span>
                  <span className="text-[11px] opacity-80">{img.createdAt ? new Date(img.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {totalPages > 1 && (
        <div className="border-t border-border bg-surface p-4 flex justify-center items-center gap-4">
          <button 
            onClick={() => onPageChange(page - 1)} 
            disabled={page <= 1}
            className="px-3 py-1 bg-background border border-border rounded disabled:opacity-50 hover:bg-muted/10 transition-colors"
          >
            Prev
          </button>
          <span className="text-sm text-foreground font-medium">Page {page} of {totalPages}</span>
          <button 
            onClick={() => onPageChange(page + 1)} 
            disabled={page >= totalPages}
            className="px-3 py-1 bg-background border border-border rounded disabled:opacity-50 hover:bg-muted/10 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
