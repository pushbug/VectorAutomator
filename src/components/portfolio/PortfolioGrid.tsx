'use client';
import React from 'react';
import Image from 'next/image';
import { Download } from 'lucide-react';
import { PaginationCapsule } from '../common/PaginationCapsule';

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
  vzId?: string | null;
  ssDownloads: number;
  asDownloads: number;
  totalDownloads: number;
  totalEarnings?: number;
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
      <div className="flex-1 overflow-y-auto pr-1 pb-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {images.map((img) => (
            <div 
              key={img.id}
              data-testid="portfolio-grid-item"
              onClick={() => onSelect(img)}
              className={`cursor-pointer group flex flex-col rounded-xl overflow-hidden border bg-surface transition-all shadow-xs hover:shadow-md ${
                selectedId === img.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
              }`}
            >
              {/* Full Image Container */}
              <div className="relative aspect-4/3 sm:aspect-square w-full bg-background overflow-hidden flex items-center justify-center p-2">
                <Image 
                  src={`/api/image?path=${encodeURIComponent(img.filePath)}`}
                  alt={img.code || img.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                  className="object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                  unoptimized
                />
              </div>

              {/* Bottom Info Section */}
              <div className="p-2.5 border-t border-border bg-surface flex flex-col gap-1">
                {/* Line 1: ID / Code */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-foreground truncate">
                    {img.code ? img.code : `#${img.id.slice(0, 8)}`}
                  </span>
                </div>

                {/* Line 2: Total Downloads & Total Earnings */}
                <div className="flex items-center justify-between text-xs font-mono tabular-nums text-muted">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Download size={13} className="text-muted shrink-0" />
                    <span>{img.totalDownloads.toLocaleString()}</span>
                  </span>
                  <span className="font-bold text-foreground">
                    ${(img.totalEarnings || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {totalPages > 1 && (
        <div className="pt-3 pb-1 flex justify-center items-center gap-3">
          <PaginationCapsule
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            inputTestId="portfolio-page-input"
          />
        </div>
      )}
    </div>
  );
}
