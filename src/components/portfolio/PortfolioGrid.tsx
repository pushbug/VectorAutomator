'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { Download, ImageOff } from 'lucide-react';
import { PaginationCapsule } from '../common/PaginationCapsule';
import { formatCurrency, formatNumber, getImageUrl } from '@/lib/formatters';


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
  selectedImageIds?: string[];
  onSelect: (image: PortfolioImage) => void;
  onToggleSelect?: (id: string) => void;
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function PortfolioGridCard({
  img,
  index,
  isChecked,
  isPanelSelected,
  onSelect,
  onToggleSelect,
}: {
  img: PortfolioImage;
  index?: number;
  isChecked: boolean;
  isPanelSelected: boolean;
  onSelect: (image: PortfolioImage) => void;
  onToggleSelect?: (id: string) => void;
}) {
  const [hasError, setHasError] = useState(false);
  const imageUrl = getImageUrl(img.filePath, (img as any).updatedAt);
  const showPlaceholder = !imageUrl || hasError;

  return (
    <div
      data-testid="portfolio-grid-item"
      onClick={() => onSelect(img)}
      className={`cursor-pointer group relative flex flex-col rounded-xl overflow-hidden border bg-surface transition-all shadow-xs hover:shadow-md ${
        isChecked
          ? 'border-primary ring-2 ring-primary/40'
          : isPanelSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50'
      }`}
    >
      {/* Multi-select Checkbox on Top Left */}
      {onToggleSelect && (
        <div 
          className="absolute top-2 left-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            data-testid={`portfolio-checkbox-${img.id}`}
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(img.id);
            }}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30 cursor-pointer accent-primary transition-opacity"
          />
        </div>
      )}

      {/* Full Image Container */}
      <div className="relative aspect-4/3 sm:aspect-square w-full bg-background overflow-hidden flex items-center justify-center p-2">
        {showPlaceholder ? (
          <div 
            data-testid="portfolio-image-placeholder"
            className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted/60 bg-muted/20 rounded-lg"
          >
            <ImageOff size={24} className="text-muted/60 shrink-0" />
            <span className="text-[11px] font-medium text-muted">No Image</span>
          </div>
        ) : (
          <Image 
            src={imageUrl}
            alt={img.code || img.title}
            fill
            priority={index !== undefined ? index < 4 : false}
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            className="object-contain p-1 transition-transform duration-300 group-hover:scale-105"
            unoptimized
            onError={() => setHasError(true)}
          />
        )}
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
            <span>{formatNumber(img.totalDownloads)}</span>
          </span>
          <span className="font-bold text-foreground">
            {formatCurrency(img.totalEarnings)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PortfolioGrid({ 
  images, 
  selectedId, 
  selectedImageIds = [],
  onSelect, 
  onToggleSelect,
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

  const selectedSet = new Set(selectedImageIds);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto pr-1 pb-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {images.map((img, idx) => (
            <PortfolioGridCard
              key={img.id}
              img={img}
              index={idx}
              isChecked={selectedSet.has(img.id)}
              isPanelSelected={selectedId === img.id}
              onSelect={onSelect}
              onToggleSelect={onToggleSelect}
            />
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

