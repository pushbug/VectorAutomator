'use client';
import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';

interface EditCollectionModalProps {
  isOpen: boolean;
  collection: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  onClose: () => void;
  onSuccess: (updatedCollection: any) => void;
}

export function EditCollectionModal({
  isOpen,
  collection,
  onClose,
  onSuccess,
}: EditCollectionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && collection) {
      setName(collection.name || '');
      setDescription(collection.description || '');
      setError('');
    }
  }, [isOpen, collection]);

  if (!isOpen || !collection) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Collection name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to update collection');
      }

      const updated = await res.json();
      onSuccess(updated);
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
      data-testid="edit-collection-modal"
    >
      <div 
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-hover/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Edit3 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Edit Collection Details</h2>
              <p className="text-xs text-muted">Update collection name and description</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="edit-collection-close-btn"
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

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Collection Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              data-testid="edit-collection-name-input"
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
              data-testid="edit-collection-description-input"
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
              data-testid="edit-collection-submit-btn"
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
