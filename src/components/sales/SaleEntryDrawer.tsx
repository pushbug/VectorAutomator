'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Search, CheckCircle2, DollarSign, Download, Calendar } from 'lucide-react';
import { SingleDatePicker } from '../portfolio/SingleDatePicker';
import { SUPPORTED_PLATFORMS } from '@/lib/platforms';
import { getImageUrl, getTodayDateString } from '@/lib/formatters';

interface PortfolioImage {
  id: string;
  code?: string | null;
  title: string;
  filePath: string;
}

interface SaleEntryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedImage?: PortfolioImage | null;
}

const PLATFORMS = SUPPORTED_PLATFORMS;

export function SaleEntryDrawer({
  isOpen,
  onClose,
  onSuccess,
  preselectedImage = null,
}: SaleEntryDrawerProps) {
  const [selectedImage, setSelectedImage] = useState<PortfolioImage | null>(preselectedImage);
  const [imageSearch, setImageSearch] = useState('');
  const [searchResults, setSearchResults] = useState<PortfolioImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [platform, setPlatform] = useState('Shutterstock');
  const [date, setDate] = useState(getTodayDateString);
  const [downloads, setDownloads] = useState('');
  const [earnings, setEarnings] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync preselectedImage when drawer opens
  useEffect(() => {
    if (isOpen) {
      if (preselectedImage) {
        setSelectedImage(preselectedImage);
      }
      setDate(getTodayDateString());
      setError(null);
    }
  }, [isOpen, preselectedImage]);

  // Image search debounced fetch
  useEffect(() => {
    if (!isOpen || selectedImage) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/portfolio?limit=20&search=${encodeURIComponent(imageSearch)}`);
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.data || []);
        }
      } catch (err) {
        console.error('Failed to search images:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [imageSearch, isOpen, selectedImage]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const resetForm = () => {
    if (!preselectedImage) {
      setSelectedImage(null);
    }
    setImageSearch('');
    setPlatform('Shutterstock');
    setDate(getTodayDateString());
    setDownloads('');
    setEarnings('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) {
      setError('Please select an image to record sales.');
      return;
    }

    const numDownloads = parseInt(downloads || '0', 10);
    const numEarnings = parseFloat(earnings || '0');

    if (isNaN(numDownloads) || isNaN(numEarnings) || numDownloads < 0 || numEarnings < 0) {
      setError('Please enter valid positive numbers for downloads and earnings.');
      return;
    }

    if (numDownloads === 0 && numEarnings === 0) {
      setError('Please enter at least downloads or earnings greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageId: selectedImage.id,
          platform,
          date,
          downloads: numDownloads,
          earnings: numEarnings,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to record sale');
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error logging sale:', err);
      setError(err.message || 'Failed to record sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          data-testid="sales-form-drawer"
          className="w-screen max-w-md bg-surface border-l border-border flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <DollarSign size={20} className="text-primary" />
              <span>Record Platform Sale</span>
            </h2>
            <button
              type="button"
              data-testid="sales-form-close-btn"
              onClick={onClose}
              className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {error}
              </div>
            )}

            {/* Target Image Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Target Image *
              </label>

              {selectedImage ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded bg-muted overflow-hidden shrink-0">
                      <Image
                        src={getImageUrl(selectedImage.filePath)}
                        alt={selectedImage.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0">
                      {selectedImage.code && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-primary/20 text-primary mb-0.5">
                          {selectedImage.code}
                        </span>
                      )}
                      <p className="text-sm font-medium text-foreground truncate">
                        {selectedImage.title}
                      </p>
                    </div>
                  </div>
                  {!preselectedImage && (
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="text-xs text-muted hover:text-foreground p-1 cursor-pointer"
                    >
                      Change
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-3 text-muted" />
                    <input
                      type="text"
                      data-testid="sales-form-image-select"
                      placeholder="Search image code (e.g. 2608-1) or title..."
                      value={imageSearch}
                      onChange={(e) => setImageSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-hidden focus:border-primary"
                    />
                  </div>

                  {/* Dropdown search results */}
                  <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border bg-background">
                    {isSearching ? (
                      <p className="p-3 text-xs text-muted text-center">Searching images...</p>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setSelectedImage(img)}
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-surface-hover text-left transition-colors cursor-pointer"
                        >
                          <div className="relative w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                            <Image
                              src={getImageUrl(img.filePath)}
                              alt={img.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {img.code && (
                                <span className="font-mono font-bold text-xs text-primary">
                                  {img.code}
                                </span>
                              )}
                              <span className="text-xs text-foreground font-medium truncate">
                                {img.title}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="p-3 text-xs text-muted text-center">No images found</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Platform Selection */}
            <div>
              <label 
                className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2"
              >
                Platform *
              </label>
              <div 
                data-testid="sales-form-platform-select"
                className="grid grid-cols-3 gap-1.5 p-1 bg-background border border-border rounded-xl"
              >
                {PLATFORMS.map((p) => {
                  const isSelected = platform === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      data-testid={`sales-form-platform-tab-${p.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setPlatform(p)}
                      className={`py-2 px-2 text-xs sm:text-sm font-medium rounded-lg transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                          : 'text-muted hover:text-foreground hover:bg-surface-hover'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sale Date */}
            <div>
              <div data-testid="sales-form-date-input">
                <SingleDatePicker
                  value={date}
                  onChange={setDate}
                  testId="sales-form-date-picker"
                />
              </div>
            </div>

            {/* Downloads and Earnings Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label 
                  htmlFor="downloads-input" 
                  className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2"
                >
                  Downloads
                </label>
                <div className="relative">
                  <Download size={16} className="absolute left-3 top-2.5 text-muted" />
                  <input
                    id="downloads-input"
                    type="number"
                    min="0"
                    step="1"
                    data-testid="sales-form-downloads-input"
                    placeholder="0"
                    value={downloads}
                    onChange={(e) => setDownloads(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-hidden focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label 
                  htmlFor="earnings-input" 
                  className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2"
                >
                  Earnings ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-muted">$</span>
                  <input
                    id="earnings-input"
                    type="number"
                    min="0"
                    step="0.01"
                    data-testid="sales-form-earnings-input"
                    placeholder="0.00"
                    value={earnings}
                    onChange={(e) => setEarnings(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-hidden focus:border-primary font-mono"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-surface">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="sales-form-submit-btn"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedImage}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Saving...' : 'Save Sale Entry'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
