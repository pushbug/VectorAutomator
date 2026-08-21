'use client';
import React, { useState, useEffect } from 'react';
import { X, FolderKanban, Loader2 } from 'lucide-react';

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (collectionId: string, addedCount: number) => void;
  selectedImageIds: string[];
}

export function AddToCollectionModal({
  isOpen,
  onClose,
  onSuccess,
  selectedImageIds,
}: AddToCollectionModalProps) {
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const fetchCollections = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await fetch('/api/collections?sortBy=updatedAt&sortOrder=desc');
        if (!res.ok) throw new Error('Failed to fetch collections');
        const json = await res.json();
        const list = json.data || [];
        setCollections(list);
        if (list.length > 0) {
          setSelectedCollectionId(list[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Error loading collections');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollections();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollectionId) {
      setError('Please select a collection');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/collections/${selectedCollectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: selectedImageIds }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to add items to collection');
      }

      const json = await res.json();
      onSuccess(selectedCollectionId, json.addedCount || selectedImageIds.length);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
      data-testid="add-to-collection-modal"
    >
      <div 
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-hover/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FolderKanban size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Add to Collection</h2>
              <p className="text-xs text-muted">Add {selectedImageIds.length} artworks into an existing collection</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {error && (
            <div className="px-3 py-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted text-xs">
              <Loader2 size={20} className="animate-spin text-primary" />
              <span>Loading collections...</span>
            </div>
          ) : collections.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted">
              No existing collections found. Please create a new collection first.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                Select Destination Collection
              </label>
              <select
                data-testid="add-to-collection-select"
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name} ({col.totalImages || 0} items)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="add-to-collection-submit-btn"
              disabled={isSubmitting || isLoading || collections.length === 0 || !selectedCollectionId}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Adding...' : 'Add Artworks'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
