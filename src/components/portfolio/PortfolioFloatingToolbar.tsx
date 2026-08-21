'use client';
import React from 'react';
import { FolderPlus, FolderKanban, X, CheckSquare } from 'lucide-react';

interface PortfolioFloatingToolbarProps {
  selectedCount: number;
  totalOnPage: number;
  allPageSelected: boolean;
  onCreateCollection: () => void;
  onAddToCollection: () => void;
  onToggleSelectPage: () => void;
  onClearSelection: () => void;
}

export function PortfolioFloatingToolbar({
  selectedCount,
  totalOnPage,
  allPageSelected,
  onCreateCollection,
  onAddToCollection,
  onToggleSelectPage,
  onClearSelection,
}: PortfolioFloatingToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div 
      data-testid="portfolio-floating-toolbar"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-surface/95 text-foreground border border-border rounded-2xl shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-center gap-2 pl-1 pr-3 border-r border-border font-medium text-xs sm:text-sm">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold font-mono">
          {selectedCount}
        </span>
        <span className="hidden sm:inline text-muted">artworks selected</span>
        <span className="sm:hidden text-muted">selected</span>
      </div>

      <button
        type="button"
        data-testid="portfolio-create-collection-btn"
        onClick={onCreateCollection}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
      >
        <FolderPlus size={15} />
        <span>New Collection</span>
      </button>

      <button
        type="button"
        data-testid="portfolio-add-to-collection-btn"
        onClick={onAddToCollection}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover hover:bg-border text-foreground text-xs font-medium rounded-lg border border-border transition-colors cursor-pointer"
      >
        <FolderKanban size={15} className="text-primary" />
        <span>Add to...</span>
      </button>

      <div className="flex items-center gap-1 pl-2 border-l border-border">
        {totalOnPage > 0 && (
          <button
            type="button"
            onClick={onToggleSelectPage}
            title={allPageSelected ? 'Deselect current page' : 'Select all on this page'}
            className="flex items-center gap-1 px-2 py-1.5 text-muted hover:text-foreground text-xs font-medium rounded-md hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <CheckSquare size={14} className={allPageSelected ? 'text-primary' : ''} />
            <span className="hidden md:inline">{allPageSelected ? 'Deselect Page' : 'Select Page'}</span>
          </button>
        )}

        <button
          type="button"
          data-testid="portfolio-clear-selection-btn"
          onClick={onClearSelection}
          title="Clear all selections"
          className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
