'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  FolderKanban, 
  Layers, 
  Download, 
  Sparkles, 
  Edit3, 
  Trash2 
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDisplayDate } from '@/lib/formatters';

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  coverId: string | null;
  createdAt: string;
  updatedAt: string;
  totalImages: number;
  totalDownloads: number;
  totalEarnings: number;
  avgRpi: number;
  coverImage: {
    id: string;
    filePath: string;
    title: string;
    code: string | null;
  } | null;
  previewImages: Array<{
    id: string;
    filePath: string;
    title: string;
    code: string | null;
  }>;
}

export interface CollectionTableProps {
  collections: CollectionSummary[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (column: string) => void;
  onEdit?: (col: CollectionSummary) => void;
  onDelete?: (id: string, name: string) => void;
}

export function CollectionTable({
  collections,
  sortBy,
  sortOrder,
  onSortChange,
  onEdit,
  onDelete,
}: CollectionTableProps) {
  const renderSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown size={12} className="text-muted/50 group-hover:text-foreground transition-colors" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp size={13} className="text-primary font-bold" />
    ) : (
      <ChevronDown size={13} className="text-primary font-bold" />
    );
  };

  return (
    <div 
      data-testid="collection-table" 
      className="w-full bg-surface border border-border rounded-2xl overflow-hidden shadow-xs flex flex-col"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/10 text-xs font-semibold text-muted uppercase tracking-wider select-none">
              {/* Collection Name & Cover Header */}
              <th 
                className="py-3 px-4 font-semibold hover:text-foreground cursor-pointer group transition-colors"
                onClick={() => onSortChange('name')}
                data-testid="collection-sort-header-name"
              >
                <div className="flex items-center gap-1.5">
                  <span>Collection</span>
                  {renderSortIcon('name')}
                </div>
              </th>

              {/* Artworks Count Header */}
              <th 
                className="py-3 px-3 font-semibold hover:text-foreground cursor-pointer group transition-colors text-right"
                onClick={() => onSortChange('totalImages')}
                data-testid="collection-sort-header-totalImages"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Artworks</span>
                  {renderSortIcon('totalImages')}
                </div>
              </th>

              {/* Downloads Header */}
              <th 
                className="py-3 px-3 font-semibold hover:text-foreground cursor-pointer group transition-colors text-right"
                onClick={() => onSortChange('totalDownloads')}
                data-testid="collection-sort-header-totalDownloads"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Downloads</span>
                  {renderSortIcon('totalDownloads')}
                </div>
              </th>

              {/* Revenue Header */}
              <th 
                className="py-3 px-3 font-semibold hover:text-foreground cursor-pointer group transition-colors text-right"
                onClick={() => onSortChange('totalEarnings')}
                data-testid="collection-sort-header-totalEarnings"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Revenue</span>
                  {renderSortIcon('totalEarnings')}
                </div>
              </th>

              {/* Avg RPI Header */}
              <th 
                className="py-3 px-3 font-semibold hover:text-foreground cursor-pointer group transition-colors text-right"
                onClick={() => onSortChange('avgRpi')}
                data-testid="collection-sort-header-avgRpi"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Avg RPI</span>
                  {renderSortIcon('avgRpi')}
                </div>
              </th>

              {/* Updated Date Header */}
              <th 
                className="py-3 px-4 font-semibold hover:text-foreground cursor-pointer group transition-colors hidden md:table-cell"
                onClick={() => onSortChange('updatedAt')}
                data-testid="collection-sort-header-updatedAt"
              >
                <div className="flex items-center gap-1.5">
                  <span>Updated</span>
                  {renderSortIcon('updatedAt')}
                </div>
              </th>

              {/* Actions Header */}
              <th className="py-3 px-4 text-right font-semibold">
                <span>Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60">
            {collections.map((col) => (
              <tr
                key={col.id}
                data-testid={`collection-table-row-${col.id}`}
                className="group hover:bg-surface-hover/50 transition-colors cursor-pointer"
              >
                {/* Collection Name & Cover */}
                <td className="py-3 px-4">
                  <Link 
                    href={`/collections/${col.id}`}
                    className="flex items-center gap-3 min-w-0"
                    title={`Open ${col.name}`}
                  >
                    {/* Thumbnail preview */}
                    <div className="relative w-11 h-11 shrink-0 rounded-lg bg-background border border-border overflow-hidden flex items-center justify-center p-1">
                      {col.coverImage ? (
                        <Image
                          src={`/api/image?path=${encodeURIComponent(col.coverImage.filePath)}`}
                          alt={col.name}
                          fill
                          sizes="44px"
                          className="object-contain p-0.5"
                          unoptimized
                        />
                      ) : (
                        <FolderKanban size={20} className="text-primary/50" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                        {col.name}
                      </span>
                      <span className="text-[11px] text-muted truncate max-w-xs md:max-w-md">
                        {col.description || 'No description'}
                      </span>
                    </div>
                  </Link>
                </td>

                {/* Artworks Count */}
                <td className="py-3 px-3 text-right">
                  <Link href={`/collections/${col.id}`} className="inline-flex items-center gap-1 font-mono font-medium text-foreground">
                    <Layers size={12} className="text-muted shrink-0" />
                    <span>{col.totalImages}</span>
                  </Link>
                </td>

                {/* Downloads */}
                <td className="py-3 px-3 text-right">
                  <Link href={`/collections/${col.id}`} className="inline-flex items-center gap-1 font-mono font-bold text-foreground">
                    <Download size={12} className="text-muted shrink-0" />
                    <span>{formatNumber(col.totalDownloads)}</span>
                  </Link>
                </td>

                {/* Revenue */}
                <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                  <Link href={`/collections/${col.id}`}>
                    {formatCurrency(col.totalEarnings)}
                  </Link>
                </td>

                {/* Avg RPI */}
                <td className="py-3 px-3 text-right font-mono font-semibold text-primary">
                  <Link href={`/collections/${col.id}`} className="inline-flex items-center gap-1">
                    <Sparkles size={11} className="shrink-0" />
                    <span>{formatCurrency(col.avgRpi)}</span>
                  </Link>
                </td>

                {/* Updated Date */}
                <td className="py-3 px-4 text-[11px] text-muted font-sans hidden md:table-cell">
                  <Link href={`/collections/${col.id}`}>
                    {formatDisplayDate(col.updatedAt.split('T')[0])}
                  </Link>
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                      <button
                        type="button"
                        data-testid={`collection-table-edit-btn-${col.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEdit(col);
                        }}
                        className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover border border-border/80 rounded-lg transition-colors cursor-pointer"
                        title="Edit collection details"
                      >
                        <Edit3 size={13} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        data-testid={`collection-table-delete-btn-${col.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDelete(col.id, col.name);
                        }}
                        className="p-1.5 text-muted hover:text-destructive hover:bg-destructive/10 border border-border/80 rounded-lg transition-colors cursor-pointer"
                        title="Delete collection"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
