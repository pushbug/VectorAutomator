'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, Plus } from 'lucide-react';
import { SingleDatePicker } from './SingleDatePicker';

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface AddImageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddImageDrawer({ isOpen, onClose, onSuccess }: AddImageDrawerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadDate, setUploadDate] = useState(getTodayStr);
  const [code, setCode] = useState('');
  const [hasManuallyEditedCode, setHasManuallyEditedCode] = useState(false);
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [ssDownloads, setSsDownloads] = useState('');
  const [asDownloads, setAsDownloads] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fetch next suggested code when drawer opens or date changes (unless user manually typed one)
  useEffect(() => {
    if (isOpen && !hasManuallyEditedCode) {
      fetch(`/api/upload?date=${uploadDate}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.nextCode && !hasManuallyEditedCode) {
            setCode(data.nextCode);
          }
        })
        .catch((err) => console.error('Failed to fetch next code:', err));
    }
  }, [isOpen, uploadDate, hasManuallyEditedCode]);

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

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setUploadDate(getTodayStr());
    setCode('');
    setHasManuallyEditedCode(false);
    setTitle('');
    setKeywords('');
    setSsDownloads('');
    setAsDownloads('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !keywords.trim()) {
      setError('Please select an image and enter both title and keywords.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('keywords', keywords.trim());
      if (code.trim()) formData.append('code', code.trim());
      if (uploadDate) formData.append('uploadDate', uploadDate);
      if (ssDownloads) formData.append('ssDownloads', ssDownloads);
      if (asDownloads) formData.append('asDownloads', asDownloads);

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
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while uploading.');
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
                <Plus size={18} />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Add New Image</h2>
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
                onChange={setUploadDate}
                testId="portfolio-add-date-picker"
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Image Code
                </label>
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
              <label className="block text-sm font-medium text-foreground mb-2">Image File</label>
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
                  <p className="text-xs text-muted mt-1">JPG, PNG, or WebP</p>
                  <input
                    id="portfolio-file-input"
                    data-testid="portfolio-add-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
              <input
                type="text"
                data-testid="portfolio-add-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Minimalist Circular Flowchart Infographic"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                required
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Keywords *</label>
              <textarea
                rows={4}
                data-testid="portfolio-add-keywords-input"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="abstract, business, flowchart, infographic, vector..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                required
              />
              <p className="text-xs text-muted mt-1">Separate keywords with commas</p>
            </div>

            {/* Initial Downloads (Optional) */}
            <div className="pt-2 border-t border-border">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Initial Downloads (Optional)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-foreground mb-1">Shutterstock</label>
                  <input
                    type="number"
                    min="0"
                    value={ssDownloads}
                    onChange={(e) => setSsDownloads(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground mb-1">Adobe Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={asDownloads}
                    onChange={(e) => setAsDownloads(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 border border-border rounded-md bg-background text-foreground text-sm"
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
              disabled={isUploading || !file}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {isUploading ? 'Uploading...' : 'Add to Portfolio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
