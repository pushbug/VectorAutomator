import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DeleteConfirmDialog } from '@/components/portfolio/DeleteConfirmDialog';

describe('DeleteConfirmDialog (UT-UI-DEL-01)', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <DeleteConfirmDialog
        isOpen={false}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal dialog with custom image code and title', () => {
    render(
      <DeleteConfirmDialog
        isOpen={true}
        imageCode="2608-1"
        imageSrc="/api/image?path=test.jpg"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByTestId('delete-confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('2608-1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-confirm-btn')).toBeInTheDocument();
    expect(screen.getByTestId('delete-cancel-btn')).toBeInTheDocument();
  });

  it('triggers onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <DeleteConfirmDialog
        isOpen={true}
        imageCode="2608-1"
        onConfirm={handleConfirm}
        onCancel={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('delete-confirm-btn'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('triggers onCancel when cancel button is clicked', () => {
    const handleCancel = vi.fn();
    render(
      <DeleteConfirmDialog
        isOpen={true}
        imageCode="2608-1"
        onConfirm={() => {}}
        onCancel={handleCancel}
      />
    );

    fireEvent.click(screen.getByTestId('delete-cancel-btn'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('triggers onCancel when Escape key is pressed', () => {
    const handleCancel = vi.fn();
    render(
      <DeleteConfirmDialog
        isOpen={true}
        imageCode="2608-1"
        onConfirm={() => {}}
        onCancel={handleCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('disables buttons and does not trigger onCancel via Escape when isDeleting is true', () => {
    const handleCancel = vi.fn();
    render(
      <DeleteConfirmDialog
        isOpen={true}
        isDeleting={true}
        imageCode="2608-1"
        onConfirm={() => {}}
        onCancel={handleCancel}
      />
    );

    const confirmBtn = screen.getByTestId('delete-confirm-btn');
    const cancelBtn = screen.getByTestId('delete-cancel-btn');

    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    expect(screen.getByText('Deleting...')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleCancel).not.toHaveBeenCalled();
  });
});
