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
  
  const [inputPage, setInputPage] = React.useState(page.toString());

  React.useEffect(() => {
    setInputPage(page.toString());
  }, [page]);

  const handlePageCommit = (valStr: string) => {
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(totalPages, parsed));
      setInputPage(clamped.toString());
      if (clamped !== page) {
        onPageChange(clamped);
      }
    } else {
      setInputPage(page.toString());
    }
  };

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
                    <span>{img.totalDownloads.toLocaleString()}</span>
                    <span className="text-[11px] text-muted">dl</span>
                  </span>
                  <span className="font-semibold text-emerald-500">
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
          <div className="inline-flex items-center gap-2.5 bg-surface/90 backdrop-blur-xs border border-border px-3.5 py-1.5 rounded-xl shadow-xs">
            <button 
              type="button"
              onClick={() => onPageChange(page - 1)} 
              disabled={page <= 1}
              className="px-2.5 py-1 bg-background border border-border rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-muted/10 transition-colors cursor-pointer"
            >
              Prev
            </button>
            <div className="flex items-center gap-1.5 text-xs text-foreground font-mono font-medium">
              <span className="text-muted">Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                data-testid="portfolio-page-input"
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                onBlur={() => handlePageCommit(inputPage)}
                className="w-12 h-6 px-1 text-center font-mono font-bold text-xs bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-muted">of {totalPages}</span>
            </div>
            <button 
              type="button"
              onClick={() => onPageChange(page + 1)} 
              disabled={page >= totalPages}
              className="px-2.5 py-1 bg-background border border-border rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-muted/10 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
