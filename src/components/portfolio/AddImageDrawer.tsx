'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Plus, Edit3, Sparkles } from 'lucide-react';
import { SingleDatePicker } from './SingleDatePicker';
import { getImageUrl, getTodayDateString } from '@/lib/formatters';


export interface PortfolioImage {
  id: string;
  code?: string | null;
  year?: number | null;
  month?: number | null;
  seqNumber?: number | null;
  title: string;
  keywords: string;
  category?: string | null;
  tags?: string | null;
  notes?: string | null;
  status: string;
  filePath: string;
  ssId?: string | null;
  asId?: string | null;
  vzId?: string | null;
  ssDownloads: number;
  asDownloads: number;
  totalDownloads: number;
  totalEarnings?: number;
  platformBreakdown?: Record<string, { downloads: number; earnings: number }>;
  createdAt: string;
}

interface AddImageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedImage?: PortfolioImage) => void;
  editImage?: PortfolioImage | null;
}

export function AddImageDrawer({ isOpen, onClose, onSuccess, editImage }: AddImageDrawerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadDate, setUploadDate] = useState(getTodayDateString);
  const [code, setCode] = useState('');
  const [hasManuallyEditedCode, setHasManuallyEditedCode] = useState(false);
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [ssId, setSsId] = useState('');
  const [asId, setAsId] = useState('');
  const [vzId, setVzId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const keywordsTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAutoGenerateCode = (targetDate = uploadDate) => {
    fetch(`/api/upload?date=${targetDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.nextCode) {
          setCode(data.nextCode);
          setHasManuallyEditedCode(false);
        }
      })
      .catch((err) => console.error('Failed to fetch next code:', err));
  };

  // Sync initial form values when opening drawer or when editImage changes
  useEffect(() => {
    if (isOpen) {
      if (editImage) {
        setFile(null);
        setPreview(
          getImageUrl(
            editImage.filePath,
            (editImage as any).updatedAt || editImage.createdAt || Date.now()
          ) || null
        );

        const parsedDate = editImage.createdAt ? editImage.createdAt.split('T')[0] : getTodayDateString();
        setUploadDate(parsedDate);
        setCode(editImage.code || '');
        setHasManuallyEditedCode(Boolean(editImage.code));
        setTitle(editImage.title || '');
        setKeywords(editImage.keywords || '');
        setCategory(editImage.category || '');
        setTags(editImage.tags || '');
        setNotes(editImage.notes || '');
        setSsId(editImage.ssId || '');
        setAsId(editImage.asId || '');
        setVzId(editImage.vzId || '');

        if (!editImage.code) {
          handleAutoGenerateCode(parsedDate);
        }
      } else {
        setFile(null);
        setPreview(null);
        setUploadDate(getTodayDateString());
        setCode('');
        setHasManuallyEditedCode(false);
        setTitle('');
        setKeywords('');
        setCategory('');
        setTags('');
        setNotes('');
        setSsId('');
        setAsId('');
        setVzId('');
        handleAutoGenerateCode(getTodayDateString());
      }
      setHasSubmitted(false);
      setError(null);
      setTimeout(() => {
        if (titleTextareaRef.current) {
          titleTextareaRef.current.style.height = 'auto';
          if (titleTextareaRef.current.value) {
            titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
          }
        }
        if (keywordsTextareaRef.current) {
          keywordsTextareaRef.current.style.height = 'auto';
          if (keywordsTextareaRef.current.value) {
            keywordsTextareaRef.current.style.height = `${keywordsTextareaRef.current.scrollHeight}px`;
          }
        }
      }, 50);
    }
  }, [isOpen, editImage]);

  const handleDateChange = (newDate: string) => {
    setUploadDate(newDate);
    if (!editImage?.code && !hasManuallyEditedCode) {
      handleAutoGenerateCode(newDate);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.type === 'image/jpeg' || dropped.type === 'image/png' || dropped.type === 'image/webp')) {
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
      setError(null);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeywordsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setKeywords(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setUploadDate(getTodayDateString());

    setCode('');
    setHasManuallyEditedCode(false);
    setTitle('');
    setKeywords('');
    setCategory('');
    setTags('');
    setNotes('');
    setSsId('');
    setAsId('');
    setVzId('');
    setError(null);
    setHasSubmitted(false);
    if (titleTextareaRef.current) titleTextareaRef.current.style.height = 'auto';
    if (keywordsTextareaRef.current) keywordsTextareaRef.current.style.height = 'auto';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    if (!title.trim() || !keywords.trim()) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('keywords', keywords.trim());
      if (category.trim()) formData.append('category', category.trim());
      if (code.trim()) formData.append('code', code.trim());
      if (uploadDate) formData.append('uploadDate', uploadDate);
      if (tags.trim()) formData.append('tags', tags.trim());
      if (notes.trim()) formData.append('notes', notes.trim());
      if (ssId.trim()) formData.append('ssId', ssId.trim());
      if (asId.trim()) formData.append('asId', asId.trim());
      if (vzId.trim()) formData.append('vzId', vzId.trim());

      if (editImage) {
        formData.append('id', editImage.id);
        const res = await fetch('/api/portfolio', {
          method: 'PATCH',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to update image');
        }

        const updated = await res.json();
        onSuccess(updated);
        onClose();
      } else {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to upload image');
        }

        resetForm();
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || (editImage ? 'An error occurred while saving.' : 'An error occurred while uploading.'));
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          data-testid="portfolio-add-drawer"
          className="w-screen max-w-md bg-surface border-l border-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                {editImage ? <Edit3 size={18} /> : <Plus size={18} />}
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                {editImage ? 'Edit Image' : 'Add New Image'}
              </h2>
            </div>
            <button
              type="button"
              data-testid="portfolio-add-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-background transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            {/* Upload Date & Image Code in 2-col layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SingleDatePicker
                label="Upload Date"
                value={uploadDate}
                onChange={handleDateChange}
                testId="portfolio-add-date-picker"
              />

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-foreground">
                    Image Code
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAutoGenerateCode(uploadDate)}
                    title="Auto-generate code for selected date"
                    className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                  >
                    <Sparkles size={12} />
                    <span>Auto</span>
                  </button>
                </div>
                <input
                  type="text"
                  data-testid="portfolio-add-code-input"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setHasManuallyEditedCode(true);
                  }}
                  placeholder="e.g. 2608-123"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary text-sm h-10.5"
                />
              </div>
            </div>

            {/* File Dropzone / Preview */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Image File (Optional)
              </label>
              {preview ? (
                <div className="relative w-full bg-background rounded-lg border border-border overflow-hidden group">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-auto block object-contain"
                  />
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded shadow">
                      Change Image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-border hover:border-primary/60 bg-background rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
                    onClick={() => document.getElementById('portfolio-file-input')?.click()}
                  >
                    <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
                      <Upload size={24} />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-xs text-muted mt-1">JPG, PNG, or WebP (Optional)</p>
                    <input
                      id="portfolio-file-input"
                      data-testid="portfolio-add-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
              <textarea
                ref={titleTextareaRef}
                rows={1}
                data-testid="portfolio-add-title-input"
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. Minimalist Circular Flowchart Infographic"
                className={`w-full px-3 py-2 border ${
                  hasSubmitted && !title.trim()
                    ? 'border-destructive focus:ring-destructive'
                    : 'border-border focus:ring-primary'
                } rounded-md bg-background text-foreground focus:outline-hidden focus:ring-2 text-sm resize-none overflow-hidden`}
              />
              {hasSubmitted && !title.trim() && (
                <p className="text-xs text-destructive mt-1 font-medium">Title is required</p>
              )}
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Keywords *</label>
              <textarea
                ref={keywordsTextareaRef}
                rows={3}
                data-testid="portfolio-add-keywords-input"
                value={keywords}
                onChange={handleKeywordsChange}
                placeholder="abstract, business, flowchart, infographic, vector..."
                className={`w-full px-3 py-2 border ${
                  hasSubmitted && !keywords.trim()
                    ? 'border-destructive focus:ring-destructive'
                    : 'border-border focus:ring-primary'
                } rounded-md bg-background text-foreground focus:outline-hidden focus:ring-2 text-sm resize-none overflow-hidden`}
              />
              {hasSubmitted && !keywords.trim() && (
                <p className="text-xs text-destructive mt-1 font-medium">Keywords are required</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Category (Optional)</label>
              <input
                type="text"
                data-testid="portfolio-add-category-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Business, Infographics, Icons, Backgrounds..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {/* Tags (Optional) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tags (Optional)</label>
              <input
                type="text"
                data-testid="portfolio-add-tags-input"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. icon, banner, vector, modern..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {/* Notes (Optional) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Notes (Optional)</label>
              <textarea
                rows={3}
                data-testid="portfolio-add-notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any internal production notes, design ideas, or reminders..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {/* Platform Identifiers (Optional) */}
            <div className="pt-3 border-t border-border space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                  Platform Asset IDs (Optional)
                </label>
                <p className="text-[11px] text-muted mt-0.5">
                  Enter asset IDs from stock platforms for reference.
                </p>
              </div>

              <div className="space-y-2">
                {/* Shutterstock */}
                <div className="flex items-center gap-2">
                  <span className="w-28 text-xs font-medium text-red-500 flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    Shutterstock
                  </span>
                  <input
                    type="text"
                    data-testid="portfolio-add-ssid-input"
                    value={ssId}
                    onChange={(e) => setSsId(e.target.value)}
                    placeholder="Asset ID (e.g. 24589201)"
                    className="flex-1 px-2.5 py-1.5 border border-border rounded-md bg-background text-foreground text-xs font-mono focus:outline-hidden focus:border-primary"
                  />
                </div>

                {/* Adobe Stock */}
                <div className="flex items-center gap-2">
                  <span className="w-28 text-xs font-medium text-blue-500 flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    Adobe Stock
                  </span>
                  <input
                    type="text"
                    data-testid="portfolio-add-asid-input"
                    value={asId}
                    onChange={(e) => setAsId(e.target.value)}
                    placeholder="Asset ID (e.g. 83920194)"
                    className="flex-1 px-2.5 py-1.5 border border-border rounded-md bg-background text-foreground text-xs font-mono focus:outline-hidden focus:border-primary"
                  />
                </div>

                {/* Vecteezy */}
                <div className="flex items-center gap-2">
                  <span className="w-28 text-xs font-medium text-amber-500 flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    Vecteezy
                  </span>
                  <input
                    type="text"
                    data-testid="portfolio-add-vzid-input"
                    value={vzId}
                    onChange={(e) => setVzId(e.target.value)}
                    placeholder="Asset ID (e.g. 19384029)"
                    className="flex-1 px-2.5 py-1.5 border border-border rounded-md bg-background text-foreground text-xs font-mono focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border bg-background/50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="portfolio-add-submit-btn"
              onClick={handleSubmit}
              disabled={isUploading}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isUploading ? (editImage ? 'Saving...' : 'Uploading...') : (editImage ? 'Save Changes' : 'Add to Portfolio')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
