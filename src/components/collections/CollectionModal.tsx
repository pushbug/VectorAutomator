'use client';
import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Edit3, Sparkles } from 'lucide-react';

export interface CollectionModalData {
  id?: string;
  name?: string;
  description?: string | null;
}

export interface CollectionModalProps {
  mode: 'create' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
  collection?: CollectionModalData | null;
  selectedImageIds?: string[];
}

export function CollectionModal({
  mode,
  isOpen,
  onClose,
  onSuccess,
  collection,
  selectedImageIds = [],
}: CollectionModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = mode === 'edit';
  const prefix = isEdit ? 'edit-collection' : 'create-collection';

  useEffect(() => {
    if (isOpen) {
      if (isEdit && collection) {
        setName(collection.name || '');
        setDescription(collection.description || '');
      } else {
        setName('');
        setDescription('');
      }
      setError('');
    }
  }, [isOpen, isEdit, collection]);

  if (!isOpen || (isEdit && !collection)) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Collection name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const url = isEdit ? `/api/collections/${collection!.id}` : '/api/collections';
      const method = isEdit ? 'PATCH' : 'POST';
      const payload = isEdit
        ? {
            name: name.trim(),
            description: description.trim() || null,
          }
        : {
            name: name.trim(),
            description: description.trim() || undefined,
            imageIds: selectedImageIds,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Failed to ${isEdit ? 'update' : 'create'} collection`);
      }

      const result = await res.json();
      if (!isEdit) {
        setName('');
        setDescription('');
      }
      onSuccess(result);
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
      data-testid={`${prefix}-modal`}
    >
      <div
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-hover/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {isEdit ? <Edit3 size={18} /> : <FolderPlus size={18} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {isEdit ? 'Edit Collection Details' : 'Create New Collection'}
              </h2>
              <p className="text-xs text-muted">
                {isEdit ? 'Update collection name and description' : 'Group artworks by theme, style, or niche'}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid={`${prefix}-close-btn`}
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

          {!isEdit && selectedImageIds.length > 0 && (
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
              data-testid={`${prefix}-name-input`}
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
              data-testid={`${prefix}-description-input`}
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
              data-testid={`${prefix}-submit-btn`}
              disabled={isSubmitting || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting
                ? (isEdit ? 'Saving...' : 'Creating...')
                : (isEdit ? 'Save Changes' : 'Create Collection')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
