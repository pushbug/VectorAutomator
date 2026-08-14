'use client';

import React, { useState } from 'react';
import Image from 'next/image';

export default function AddImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !keywords) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('keywords', keywords);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      setMessage({ type: 'success', text: 'Image uploaded successfully! Check the Portfolio page.' });
      
      // Reset form
      setFile(null);
      setPreview(null);
      setTitle('');
      setKeywords('');
      
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to upload image.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6" data-testid="upload-page">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Add New Image (Test)</h1>
      
      {message && (
        <div className={`p-4 mb-6 rounded ${message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-surface p-6 rounded-lg border border-border shadow-sm">
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Image File</label>
          <input 
            type="file" 
            accept="image/jpeg, image/png"
            onChange={handleFileChange}
            className="w-full text-sm text-muted
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90"
            data-testid="upload-file-input"
          />
        </div>

        {preview && (
          <div className="relative w-full h-64 bg-muted/20 rounded-md overflow-hidden border border-border">
            <Image src={preview} alt="Preview" fill className="object-contain" unoptimized />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Minimalist Business Infographic"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="upload-title-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Keywords (comma separated)</label>
          <textarea 
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="business, timeline, infographic, vector..."
            rows={4}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="upload-keywords-input"
          />
        </div>

        <button 
          type="submit" 
          disabled={isUploading || !file}
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          data-testid="upload-submit-btn"
        >
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </button>

      </form>
    </div>
  );
}
