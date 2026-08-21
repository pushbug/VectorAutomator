'use client';

import React, { useState, useEffect } from 'react';

export interface PaginationCapsuleProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  prevTestId?: string;
  nextTestId?: string;
  inputTestId?: string;
  className?: string;
}

export function PaginationCapsule({
  page,
  totalPages,
  onPageChange,
  prevTestId,
  nextTestId,
  inputTestId,
  className = '',
}: PaginationCapsuleProps) {
  const [inputPage, setInputPage] = useState(page.toString());

  useEffect(() => {
    setInputPage(page.toString());
  }, [page]);

  if (totalPages <= 1) return null;

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

  return (
    <div className={`inline-flex items-center gap-2.5 bg-surface/90 backdrop-blur-xs border border-border px-3.5 py-1.5 rounded-xl shadow-xs ${className}`}>
      <button
        type="button"
        data-testid={prevTestId}
        onClick={() => onPageChange(Math.max(1, page - 1))}
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
          data-testid={inputTestId}
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
        data-testid={nextTestId}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="px-2.5 py-1 bg-background border border-border rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-muted/10 transition-colors cursor-pointer"
      >
        Next
      </button>
    </div>
  );
}
