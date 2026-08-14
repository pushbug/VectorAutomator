'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  imageCode?: string | null;
  imageSrc?: string | null;
  itemTitle?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  isOpen,
  title = 'ยืนยันการลบรูปภาพ',
  description = 'คุณแน่ใจหรือไม่ว่าต้องการลบรูปภาพนี้ออกจากระบบอย่างถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้',
  imageCode,
  imageSrc,
  itemTitle,
  isDeleting = false,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={isDeleting ? undefined : onCancel}
      />

      {/* Modal Box */}
      <div 
        data-testid="delete-confirm-dialog"
        className="relative bg-surface border border-border rounded-xl shadow-2xl max-w-md w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-background transition-colors cursor-pointer disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-destructive/10 text-destructive shrink-0">
            <AlertTriangle size={24} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">{description}</p>

            {/* Image Preview & ID Card */}
            {imageSrc ? (
              <div className="mt-4 p-2.5 rounded-lg bg-background border border-border flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-md overflow-hidden bg-surface border border-border shrink-0 flex items-center justify-center">
                  <Image
                    src={imageSrc}
                    alt={imageCode || 'Preview'}
                    fill
                    className="object-contain p-1"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted uppercase font-medium">Image ID</p>
                  <p className="font-mono font-bold text-sm text-foreground truncate mt-0.5">
                    {imageCode || 'Unknown ID'}
                  </p>
                </div>
              </div>
            ) : itemTitle ? (
              <div className="mt-3 p-2.5 rounded-md bg-background border border-border text-xs text-foreground font-mono wrap-break-word">
                {itemTitle}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                data-testid="delete-cancel-btn"
                onClick={onCancel}
                disabled={isDeleting}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-background text-foreground transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="delete-confirm-btn"
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-destructive text-destructive-foreground font-medium rounded-lg hover:bg-destructive/90 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Trash2 size={16} />
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
