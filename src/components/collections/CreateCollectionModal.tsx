'use client';
import React, { useState } from 'react';
import { X, FolderPlus, Sparkles } from 'lucide-react';

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCollection: any) => void;
  selectedImageIds?: string[];
}

export function CreateCollectionModal({
  isOpen,
  onClose,
  onSuccess,
  selectedImageIds = [],
}: CreateCollectionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Collection name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          imageIds: selectedImageIds,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to create collection');
      }

      const created = await res.json();
      setName('');
      setDescription('');
      onSuccess(created);
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
      data-testid="create-collection-modal"
    >
      <div 
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-hover/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FolderPlus size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Create New Collection</h2>
              <p className="text-xs text-muted">Group artworks by theme, style, or niche</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="create-collection-close-btn"
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

          {selectedImageIds.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary font-medium">
              <Sparkles size={14} className="shrink-0" />
              <span>Will add {selectedImageIds.length} selected artworks to this group</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Collection Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              data-testid="create-collection-name-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Thai Traditional Gold Vector, Cyberpunk Badges"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Description <span className="text-xs text-muted font-normal">(Optional)</span>
            </label>
            <textarea
              data-testid="create-collection-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this style, keywords, or experimentation goals..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

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
              data-testid="create-collection-submit-btn"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
