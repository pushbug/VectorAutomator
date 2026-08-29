'use client';
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Download, MoreVertical, Trash2, Edit, FolderKanban, Sparkles, Layers } from 'lucide-react';
import { formatCurrency, formatNumber, formatDisplayDate, getImageUrl } from '@/lib/formatters';
import { CollectionSummary } from './CollectionTable';

interface CollectionCardProps {
  collection: CollectionSummary;
  index?: number;
  onEdit?: (col: CollectionSummary) => void;
  onDelete?: (id: string, name: string) => void;
}

export function CollectionCard({ collection, index, onEdit, onDelete }: CollectionCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <div
      data-testid={`collection-card-${collection.id}`}
      className="group flex flex-col bg-surface border border-border hover:border-primary/50 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300"
    >
      {/* Cover / Image Preview Area */}
      <Link
        href={`/collections/${collection.id}`}
        className="relative aspect-16/10 w-full bg-background overflow-hidden flex items-center justify-center p-2.5 cursor-pointer"
        data-testid={`collection-card-cover-${collection.id}`}
      >
        {collection.coverImage ? (
          <Image
            src={getImageUrl(collection.coverImage.filePath)}
            alt={collection.name}
            fill
            priority={index !== undefined ? index < 4 : false}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 25vw, 16vw"
            className="object-contain p-1.5 transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 text-muted">
            <FolderKanban size={28} className="text-primary/60" />
            <span className="text-xs">Empty Collection</span>
          </div>
        )}

        {/* Artworks Count Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-surface/90 text-foreground text-[11px] font-semibold rounded-full border border-border shadow-xs backdrop-blur-xs flex items-center gap-1">
          <Layers size={11} className="text-primary shrink-0" />
          <span>{collection.totalImages} artworks</span>
        </div>
      </Link>

      {/* Content Section */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/collections/${collection.id}`}
              className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate"
              data-testid={`collection-card-title-${collection.id}`}
              title={collection.name}
            >
              {collection.name}
            </Link>

            {/* Actions Menu */}
            {(onEdit || onDelete) && (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  className="p-1 text-muted hover:text-foreground hover:bg-surface-hover rounded-md transition-colors cursor-pointer"
                  title="Options"
                >
                  <MoreVertical size={15} />
                </button>

                {isMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-32 bg-surface border border-border rounded-xl shadow-lg py-1 z-20 animate-in fade-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onEdit(collection);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                      >
                        <Edit size={13} />
                        <span>Edit Details</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onDelete(collection.id, collection.name);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Delete Group</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description - 1 line with ellipsis */}
          <p
            className="text-xs text-muted truncate leading-normal"
            title={collection.description || undefined}
          >
            {collection.description || 'No description provided.'}
          </p>

          {/* Date Created */}
          <p className="text-[11px] text-muted font-sans truncate mt-0.5">
            Created {formatDisplayDate(collection.createdAt.split('T')[0])}
          </p>
        </div>

        {/* Rollup KPI Metrics Bar */}
        <div className="pt-2 border-t border-border grid grid-cols-3 gap-1 text-xs font-mono tabular-nums">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted uppercase font-sans font-medium">Downloads</span>
            <span
              data-testid={`collection-card-downloads-${collection.id}`}
              className="font-bold text-foreground flex items-center gap-0.5 mt-0.5 text-xs"
            >
              <Download size={11} className="text-muted shrink-0" />
              {formatNumber(collection.totalDownloads)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-muted uppercase font-sans font-medium">Revenue</span>
            <span
              data-testid={`collection-card-earnings-${collection.id}`}
              className="font-bold text-foreground mt-0.5 text-xs"
            >
              {formatCurrency(collection.totalEarnings)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-muted uppercase font-sans font-medium">Avg RPI</span>
            <span
              data-testid={`collection-card-rpi-${collection.id}`}
              className="font-semibold text-primary mt-0.5 flex items-center gap-0.5 text-xs"
            >
              <Sparkles size={11} className="shrink-0" />
              {formatCurrency(collection.avgRpi)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
